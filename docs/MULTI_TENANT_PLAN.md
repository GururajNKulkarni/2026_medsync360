# MedSync 360 — Multi-Tenant & Superuser Architecture

_Canonical design for turning MedSync 360 into a retrofit product that works for **any hospital**. Draft 2026-06-23._

## Goal
Move from the current **consumer-style self-signup** (anyone registers, self-picks a hardcoded Karnataka college, enters a KMC number) to a **B2B multi-tenant** model: the **hospital is the tenant**, a **superuser** runs each hospital, and doctors **self-register into a hospital and are approved**. No hardcoded hospital list, no Karnataka assumptions.

---

## 1. Roles
Base account = **doctor**. Two privileged roles sit above it:

| Role (`app_role`) | Who | Powers |
|---|---|---|
| **Platform Owner** (`platform`) | you (`medsync360@gmail.com`) | Add hospitals; approve superusers & new-hospital requests; cross-hospital; bootstrap each hospital's first superuser |
| **Superuser** (`superuser`) | 1+ per hospital | Approve/reject doctor registrations; bulk roster (Excel); view roster; manage referrals on behalf — **all scoped to their hospital** |
| **Doctor** (`doctor`, default) | every clinician | Normal app, scoped to self + their hospital |

`app_role` (access level) is **separate** from the clinical `role` (PG / Senior Resident / House / Consultant). A user always has a clinical `role`; only elevated users also carry `superuser`/`platform`.

---

## 2. How a new hospital gets added (e.g. "Navachetana Hospital")
A hospital is simply a **row in the `hospitals` table**. Three ways to create one:

| Mechanism | Who | When |
|---|---|---|
| **Direct insert** (SQL / seed) | setup | Bootstrap — initial hospitals before any UI |
| **Platform "Add Hospital" screen** | platform (you) | Ongoing — a form (name, city, state) creates the row |
| **"Request my hospital"** at registration | a doctor whose hospital isn't listed | Self-serve growth — requester is approved and becomes the hospital's first superuser |

**The current blocker:** the dropdown is a hardcoded frontend list (`MEDICAL_COLLEGES`). The fix is to make it **read from the `hospitals` table**, which an admin can add rows to. This is why **Step 1 = `hospitals` table + an "Add Hospital" screen** — it's the unlock for everything else.

---

## 3. Data model
**New table `hospitals`** — `id, name, city, state, is_active, created_at, created_by`

**`users` (+ add)**
- `hospital_id` → `hospitals.id` (set from the chosen hospital at registration)
- `app_role` enum (`doctor` / `superuser` / `platform`, default `doctor`)
- `approval_status` enum (`pending` / `approved` / `rejected`, default `pending`)
- `approved_by`, `approved_at` (audit)
- Relabel `kmc_number` → "Medical Registration No." in the UI, make optional (keep the column to avoid a disruptive rename)

**New table `hospital_requests`** (for "request my hospital") — `id, requested_by, proposed_name, city, status, reviewed_by, reviewed_at`

**New table `superuser_requests`** — `id, user_id, hospital_id, status, requested_at, reviewed_by, reviewed_at`

**`referrals` & `duty_roster` (+ add — later step)** — `hospital_id` (= creator's hospital) for scoping + analytics; `entered_by` for on-behalf audit.

---

## 4. Onboarding form — keep it, tweak 3 things
The existing form stays (we still capture name, DOB, gender, department, phone, photo, year/college of graduation). Changes:
1. **"Currently Working At"** → dropdown sourced from the **`hospitals` table** (not the hardcoded list); sets `hospital_id`. Includes a **"My hospital isn't listed → request it"** link.
2. **"KMC Number"** → relabel **"Medical Registration No."**, optional.
3. **On submit** → `approval_status = 'pending'`; route to a **"Pending approval"** screen, not the dashboard.

---

## 5. Two approval gates (load-bearing)
- **Superuser approves doctors** (within their hospital).
- **Platform approves superusers** (any hospital) and **approves new-hospital requests**.

**Bootstrap rule:** a brand-new hospital has no superuser yet, so its **first** doctor is approved/elevated by the **platform**; every **subsequent** doctor is approved by **that hospital's superuser**.

---

## 6. Auth gate (App.tsx) — new state
`unauthenticated → /login` · `no profile → /onboarding` · **`profile but approval_status ≠ approved → /pending` screen** · `approved → app`.

---

## 7. Security / RLS
- SQL helpers: `current_hospital_id()`, `current_app_role()`, `is_superuser()`.
- Doctors: own + hospital scope. Superuser: everything where `hospital_id = theirs`. Platform: all (or via SECURITY DEFINER admin tools).
- All privileged writes — approve doctor, bulk roster import, refer on behalf, add hospital — go through **role-checked `SECURITY DEFINER` RPCs** with audit.
- Replaces the current loose `USING (true)` policies (duty_roster etc.).
- Dashboards are **aggregate-only** (no row-level PHI) for DPDP hygiene.

---

## 7a. Checks & validations (what must be enforced at each step)
**Golden rule: every privileged action is enforced server-side** in a role-checked `SECURITY DEFINER` RPC — the client is never trusted for role, status, or scope.

**Registration (doctor self-signup)**
- Hospital must be a real `hospital_id` chosen from the list — never free text.
- `app_role` forced to `doctor` and `approval_status` forced to `pending` server-side; any client-supplied role/status is ignored (**no self-elevation**).
- Required profile fields present; email unique (handled by Auth).

**Gate 1 — Superuser approves a doctor**
- Caller is `superuser` **and** `target.hospital_id == caller.hospital_id` → a superuser can never approve another hospital's doctor.
- Target is currently `pending` (can't re-approve / can't approve a rejected user without an explicit re-apply).
- Approve → `approval_status = approved`, set `approved_by`, `approved_at` (audit). Reject → `rejected` (+ optional reason); rejected users get no access.

**Gate 2 — Platform Owner approves superuser / hospital**
- Caller is `platform`.
- Superuser request: target has a `hospital_id`; request `pending`; approve → `app_role = superuser`.
- New-hospital request: name validated + de-duplicated; create `hospitals` row; set requester as that hospital's **first superuser** (bootstrap) and `approved`.

**Add Hospital (Platform Owner)**
- Caller is `platform`. Name required and checked against existing names to avoid near-duplicate tenants (e.g. "KMC Manipal" vs "Kasturba Medical College"). Record `created_by`.

**Auth gate**
- `pending` → "pending approval" screen (no app access); `rejected` → rejected screen; `approved` → app.
- Migration sets **all existing users `approved`** so no one is locked out.

**Bulk roster import (Superuser)**
- Caller is `superuser` of the hospital.
- Each row resolves via KMC/registration → a user **in the same hospital**; unknown or foreign-hospital rows are flagged, **not** inserted (a preview shows OK vs error rows — no silent drops).
- `shift_type` / `status` validated against the DB enums; bad rows flagged.
- Dedupe / upsert rule applied; notifications best-effort (never block the import).

**Referrals on behalf (Superuser)**
- Caller is `superuser`; the target doctor is in the caller's hospital; the referral is written with the doctor as owner + `entered_by = superuser` (audit).

**RLS / data access**
- Doctors see only their hospital; Superuser scoped to `hospital_id`; Platform Owner sees all (or via admin RPCs). Loose `USING (true)` policies replaced.

**Compliance / audit**
- All approvals and on-behalf actions are audit-logged. Dashboards are aggregate-only (no row-level PHI) for DPDP hygiene.

## 8. Superuser capabilities (scoped to their hospital)
1. Approve / reject new doctor registrations.
2. Bulk-create the roster from an **Excel** upload (validate → preview → import → notify).
3. View the full hospital roster.
4. Manage referrals **on behalf of** doctors (with `entered_by` audit).

---

## 9. Build steps (each independently shippable)
| # | Step | Breaking? |
|---|---|---|
| **1** | **`hospitals` table + platform "Add Hospital" screen + seed** initial hospitals. Add `hospital_id` / `app_role` / `approval_status` to `users`; backfill; set `medsync360@gmail.com` = platform; **mark all existing users `approved`** (so the new gate never locks them out). | No |
| **2** | **Onboarding tweaks** — hospital dropdown from table + "request my hospital"; relabel reg-no; submit → Pending. | Low |
| **3** | **Auth gate** — Pending / Rejected screens. | Low |
| **4** | **Superuser doctor-approval queue** + role-aware nav shell. | No |
| **5** | **Superuser request → platform approval**; hospital-request → platform approval (+ bootstrap first superuser). | No |
| **6** | **RLS scoping** by `hospital_id` (add to referrals/duties, rewrite policies, tighten loose ones). | ⚠️ Yes — done carefully, after data is clean |
| **7** | **Bulk roster Excel import** + hospital roster view. | No |
| **8** | **Manage referrals on behalf** (RPC + UI + audit). | No |
| **9** | **Analytics dashboard** (hospital-scoped RPCs). | No |
| **10** | **Later** — email invites/notifications via Edge Function; platform hospital-onboarding polish. | No |

**Critical in Step 1:** set existing users to `approved` in the same migration, or Step 3's gate locks everyone out.

---

## 10. Effort & dependencies
~2–3 weeks total. Steps **1–5** = the provisioning / RBAC spine. Step **6** = security tightening. Steps **7–9** = the superuser features. Nothing is big-bang — each step ships and is testable.

## 11. Open decisions before Step 1
1. Enums vs text for `app_role` / `approval_status` (recommend enums).
2. Demo data: leave scattered (approval model tolerates it) or consolidate for a cleaner demo.
3. First superuser identity; confirm `medsync360@gmail.com` = platform.
4. Seed `hospitals` from the existing 40-name list, or start fresh with only real hospitals (e.g. add "Navachetana Hospital" directly).
