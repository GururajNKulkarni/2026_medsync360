# MedSync 360 — Build Status (What's Done)

_Last updated: 2026-06-25. Owner: guru. An itemised list of completed work, organised by feature area. Items marked **[new]** were built in the multi-tenant + analytics session (2026-06-23 → 06-25); others are established features._

---

## 1. Multi-tenant foundation (hospitals & roles)

1. **Hospitals table** — `hospitals` with onboarding support. _[new]_ (`20260623153000_hospitals_table.sql`)
2. **App roles** — `app_role` on users: `platform` (Platform Owner), `superuser`, `doctor`. _[new]_ (`20260623150000_add_app_role_platform_owner.sql`)
3. **User hospital link + approval status** — `users.hospital_id`, `approval_status`, `approved_by`, `approved_at`. _[new]_ (`20260623160000_users_hospital_and_approval.sql`)
4. **Scoping helper functions** — `current_app_role()` and `current_hospital_id()` (SECURITY DEFINER) used across all RLS/RPCs. _[new]_
5. **Onboarding links new doctor to a hospital** — new doctors created `pending` until approved. _[new]_

## 2. Approvals workflow

6. **Approval RPCs** — `approve_doctor`, `review_superuser_request`, `request_superuser` (hospital-scoped, SECURITY DEFINER). _[new]_ (`20260623161000_approval_rpcs.sql`)
7. **Approvals page** — superuser approves/rejects pending doctors for their hospital; platform owner reviews superuser requests. _[new]_ (`src/components/features/admin/ApprovalsPage.tsx`, `src/hooks/useApprovals.ts`)
8. **Hospitals admin page** — platform owner onboards hospitals. _[new]_ (`src/components/features/hospitals/HospitalManagement.tsx`, `src/hooks/useHospitals.ts`)
9. **Pending-approval bell notifications** — superusers notified when a doctor registration is pending; platform owner notified of superuser requests; one-time backfill for existing pending items. _[new]_ (`20260624190000_approval_pending_bell_notifications.sql`)
10. **Notification display cap** — bell shows only the 5 most recent approval notifications (older kept in DB, not shown). _[new]_ (`src/hooks/useNotifications.ts`)

## 3. Duty Roster

11. **Duty roster** — month/week calendar, schedule duty, swap, delete (established).
12. **Hospital scoping fix** — roster SELECT/UPDATE/INSERT RLS scoped to the viewer's own hospital (was wide open). _[new]_ (`20260624130000_fix_duty_roster_hospital_scoping.sql`)
13. **Swap picker hospital filter** — swap candidates restricted to same hospital + department. _[new]_ (`src/components/features/roster/SwapDutyModal.tsx`)
14. **Bulk roster upload** — superuser-only Excel/CSV import. _[new]_ (`src/components/features/roster/BulkUploadRosterModal.tsx`):
    - Downloadable template; accepts `.xlsx/.xls/.csv`.
    - Matches doctors by **KMC number**, scoped to the uploader's hospital.
    - **Preview → Submit** flow (nothing saved until reviewed).
    - Skips clashes (existing duty same day) and reports per-row reasons.
    - "KMC doesn't exist" message for unknown/other-hospital KMCs (no cross-hospital leak).
    - Caps at **20 unique doctors** per file; lazy-loaded so `xlsx` stays out of the main bundle.

## 4. Referrals & medication journey

15. **Referral system** — create / send / accept / decline / transfer / close across departments (established).
16. **Medication audit trail** — full medication history across the transfer chain (established).
17. **Transfer chain** — child referrals linked via `transfer_parent_id`; atomic `transfer_referral()` RPC (established).
18. **Attachments** — file attachments end-to-end, including chain-wide attachment surfacing (established).
19. **Excel + branded PDF completion report** — auto-export on close; re-download from Referral Details (established).
20. **Referral hospital scoping** — INSERT/SELECT RLS scoped to same hospital; cross-hospital transfer blocked inside `transfer_referral()`. _[new]_ (`20260624140000_fix_referral_hospital_scoping.sql`)
21. **Doctor-picker hospital filters** — referral create + transfer modals only list same-hospital doctors. _[new]_ (`ReferralForm.tsx`, `ReferralTransferModal.tsx`)

## 5. Account / Settings

22. **Settings page cleanup** — removed the duplicate "Settings" item from the sidebar (kept in header dropdown). _[new]_ (`src/components/layout/Sidebar.tsx`)
23. **Self-service Account Security** — user can change **password, mobile number, email** only; all other fields read-only. _[new]_ (`src/components/features/admin/SettingsPage.tsx`)
24. **Column-level self-update guard** — DB trigger locks down which fields a user can self-edit; **closed a privilege-escalation hole** (a doctor could previously self-grant `platform`/`superuser` via the REST API). _[new]_ (`20260624170000_settings_self_service_guard.sql`)
25. **Email sync trigger** — keeps `public.users.email` in sync after a Supabase Auth email change. _[new]_ (same migration)
26. **"Last password changed" timestamp** — shown on Settings; new `users.password_changed_at` column. _[new]_ (`20260624180000_add_password_changed_at.sql`)
27. **Removed "Watch Video" button** from the login page. _[new]_ (`src/components/features/auth/LoginForm.tsx`)

## 6. Analytics (referral analytics dashboard)

28. **`/analytics` route** — real dashboard replacing the "coming soon" placeholder. _[new]_ (`src/App.tsx`, `src/components/features/analytics/AnalyticsPage.tsx`)
29. **Charting** — added `recharts` (lazy-loaded chunk). _[new]_
30. **Hospital-scoped analytics RPC** — `get_referral_analytics(p_from, p_to)`, single SECURITY DEFINER call returning all aggregates. _[new]_ (`20260624220000_referral_analytics_operational.sql`, supersedes `...200000` + `...210000`)
31. **Role-differentiated views:** _[new]_
    - **Doctor** → personal ("My Analytics"): my volume, closed, pending, avg days-to-close + over-time/status/urgency.
    - **Superuser** → operational (their hospital): see below.
    - **Platform Owner** → same operational view, network-wide.
32. **Operational charts (superuser/owner):** _[new]_ KPI strip (total · avg time-to-accept · avg days-to-close · decline rate · transfer rate); slowest-to-accept by dept; slowest end-to-end by dept; created-vs-closed throughput; decline reasons; transfer hotspots; workload by dept (sent vs received); inter-department patient-flow **Sankey**; top referral reasons.
33. **Demo seed** — 36 tagged Navachetana referrals so the scoped dashboard looks full. _[new]_ (`supabase/seeds/analytics_demo_navachetana.sql`; remove via `DELETE … WHERE metadata->>'seed'='analytics_demo'`).

## 7. Documentation produced

34. **AI Assistant feature report** — what works / what's broken / production-readiness (delivered in-session). _[new]_
35. **AI Assistant multilingual plan** — German/Dutch/Kannada: layers, dependent APIs, benchmarks. _[new]_ (`docs/AI_ASSISTANT_MULTILINGUAL_PLAN.md`)
36. **Analytics status & backlog** — `docs/ANALYTICS_STATUS.md`. _[new]_
37. **This build-status list** — `docs/BUILD_STATUS.md`. _[new]_

## 8. Git

38. Two commits pushed to `guru-2026-06-22` mid-session: multi-tenant scoping + approvals + settings (`8a3e10f`), and CEO/demo docs (`60a076e`). _[new]_
39. **Still uncommitted:** analytics (page, hook, migrations `...190000`–`...220000`, seed), recharts dep, settings/notification/bulk-upload edits, and docs (35–37). _[pending]_

---

## Known caveats (see ANALYTICS_STATUS.md §5 and NEXT_STEPS_PLAN.md)

- Demo seed = fabricated data in the live DB (Navachetana). Removable; remove before real use.
- Decline-reason capture path is broken in the live app (`useReferrals.ts useAddDeclineReason`) — decline analytics currently runs on seeded data only.
- `.env.example` holds **real leaked credentials** (Supabase + OpenAI) in git history — **rotate keys** (top production priority).
- OpenAI key is consumed client-side — move behind an Edge Function before production.
