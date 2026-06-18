# MedSync 360 — Next Steps Plan

_Last updated: 2026-06-18. Owner: guru. Goal: take the referral/medication journey from "demo-ready" to "production-ready," then harden the rest of the app._

---

## 0. Pick up here first (loose ends from last session)

- [ ] **Commit & push the report fixes** — `src/components/features/referrals/ReferralDetails.tsx` has uncommitted fixes (diagnosis read from the completed referral, real completion time, attachment count). Push to `origin` (= `2026_medsync360`). tsc + build already pass.
- [ ] **Rotate credentials** 🔑 — Supabase anon + service-role keys and the OpenAI key live in git history (`.env.example`) which is now in the new repo. Rotate them in the Supabase dashboard + OpenAI, update local `.env`. This is the single most important production item.
- [ ] Decide whether to scrub `.env.example` from git history (BFG / git filter-repo) or just rotate-and-move-on.

## 1. Referral / Medication Journey — finish the regression pass

We fixed many bugs in isolation. Do one clean end-to-end run and confirm each path:
- [ ] Create → accept → complete (single hop), check Excel: timeline, diagnosis, attachments, AM/PM time.
- [ ] Decline path (Cancelled status, reason captured).
- [ ] Same-department transfer (Prasad→Guru→Karuna within/across depts).
- [ ] Multi-hop with a **medication change at every hop** — confirm each "Updated During Transfer" step + final completion all appear for the final doctor and in Excel.
- [ ] Re-download report from Referral Details for a closed multi-hop referral — must match the completion-time Excel exactly.
- [ ] Known cosmetic nit to consider: the trail shows both "Updated During Transfer (Guru)" and "Initial Medication Set (Guru, child)" with the same value — decide whether to suppress the duplicate child "initial" step.

## 2. Data cleanup (live DB)

- [ ] 4 orphaned `Transferred` referrals with no child (user said ignore for demo — revisit).
- [ ] `medication_update_count` drift on a few referrals (cosmetic; not read anywhere — either sync or drop the column).
- [ ] Remove stray junk dirs from the working tree: `c/`, `home/` (accidental path artifacts, not committed).

## 3. Security hardening (production blockers)

- [ ] **Move the OpenAI key server-side** — currently `VITE_OPENAI_API_KEY` ships in the browser bundle (`src/lib/openai.ts`). Put it behind a Supabase Edge Function.
- [ ] Tighten `duty_roster` RLS — the `"Users can update shifts" USING (true)` policy lets any authenticated user update any duty. Scope it (e.g. same-department or involved parties) without breaking cross-doctor swaps.
- [ ] Resolve the `security_definer_view` advisor ERROR (one view flagged) and the `rls_enabled_no_policy` on `app_logs`.
- [ ] Audit the two RPCs we made `SECURITY DEFINER` once more against the auth guard (already guarded; confirm no enumeration risk).

## 4. Testing & CI (currently none)

- [ ] Add **Vitest** + a small high-value suite:
  - status mapping (`mapStatusForDisplay` / `mapStatusForDatabase`)
  - RPC param-name contracts (the silent-null failure mode)
  - Excel `buildReportData` shape for a multi-hop chain
- [ ] Add **GitHub Actions** on the new repo: run `tsc --noEmit` + `npm run build` (+ lint once triaged) on every PR/push.

## 5. Code quality / performance

- [ ] Triage lint — hundreds of pre-existing `@typescript-eslint/no-explicit-any`. Decide: bulk-disable rule, or fix incrementally. Keep new code clean.
- [ ] Code-split the bundle — `index` chunk is ~1.6 MB (gzip ~415 KB). Lazy-load heavy routes; the xlsx static+dynamic import warning can be resolved by choosing one.
- [ ] Remove confirmed dead components (e.g. `DutyRosterManagement`, `DutyRosterPerformanceMonitor` if unreferenced).

## 6. Other modules (we haven't validated these)

- [ ] Dashboard stats — verify numbers are live/accurate.
- [ ] Research Insight (OpenAI) — smoke test after key moves server-side.
- [ ] Chat / Messages (private conversations) — functional pass.
- [ ] Video module — status unknown.
- [ ] Notifications — currently 20s polling; consider Supabase Realtime.

## 7. Parked design work

- [ ] Duty Roster at ~30 doctors — calendar overflow/grouping/filter design. Revisit *with* user (see memory: roster-scaling-concern).

---

### Suggested order for the next session
1. Push report fixes (#0) → 2. Rotate keys (#0) → 3. Referral regression pass (#1) → 4. duty_roster RLS + OpenAI server-side (#3) → 5. CI + a few tests (#4).
