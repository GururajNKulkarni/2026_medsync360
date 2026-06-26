# Analytics — Status & Backlog

_Last updated: 2026-06-25. Owner: guru. Purpose: capture everything built for the Analytics feature this session, the decisions behind it, and what's still pending — for later review._

---

## 1. Summary

The `/analytics` route went from a "coming soon" placeholder to a **role-differentiated, hospital-scoped referral analytics dashboard** intended as the **USP for the hospital-owner pitch**. Superusers get an *operational* view (where to improve), doctors get a *personal* view (their own activity), and the Platform Owner gets the same operational view network-wide.

Status: **demo-ready.** Built on real referral data + a tagged demo seed for Navachetana. `tsc` + `npm run build` pass. Not yet committed at time of writing.

---

## 2. What's been built

### Frontend
- **[src/components/features/analytics/AnalyticsPage.tsx](../src/components/features/analytics/AnalyticsPage.tsx)** — the page, with two distinct views chosen by `app_role`:
  - **DoctorView** (lean/personal): 4 KPIs (my referrals, closed, pending my action, avg days-to-close) + over-time area, by-status donut, by-urgency pie.
  - **SuperuserView** (operational; also used by Platform Owner): KPI strip + bottleneck/throughput/friction/workload charts (see §4). Each tile carries a one-line subtitle tying it to a management action.
- **[src/hooks/useReferralAnalytics.ts](../src/hooks/useReferralAnalytics.ts)** — React Query hook calling the RPC; full `ReferralAnalytics` TypeScript type.
- **[src/App.tsx](../src/App.tsx)** — `/analytics` now lazy-loads `AnalyticsPage` (was a placeholder). Recharts lands in its own lazy chunk — no main-bundle bloat.
- **Charting:** added `recharts` (v3.9.0) as a dependency.

### Backend (Supabase) — all live
- **`get_referral_analytics(p_from date, p_to date)`** — single `SECURITY DEFINER` RPC returning one JSON payload with every aggregate. `search_path` pinned; `anon` execute revoked, `authenticated` granted.
- **Role scope** (inside the RPC):
  - Platform Owner → whole network (all hospitals)
  - Superuser → their entire hospital (referrals whose creator is in their hospital)
  - Doctor → only their own referrals (`from_user_id = me OR to_user_id = me`)
- Migration files (in `supabase/migrations/`):
  - `20260624200000_referral_analytics_rpc.sql` — initial RPC (hospital/platform scope) + anon revoke.
  - `20260624210000_referral_analytics_role_scope.sql` — added the doctor=personal scope.
  - `20260624220000_referral_analytics_operational.sql` — **current/authoritative** version; adds all operational aggregates.

### Demo data
- **[supabase/seeds/analytics_demo_navachetana.sql](../supabase/seeds/analytics_demo_navachetana.sql)** — 36 realistic referrals seeded for **Navachetana** (Guru's hospital, which had 0), so the scoped dashboard looks full. Tagged `metadata.seed = 'analytics_demo'`.
  - Cleanup: `DELETE FROM referrals WHERE metadata->>'seed' = 'analytics_demo';`
  - Varied across 8 to-departments, 5 from-departments, urgency mix, ~9 months, with `start_time` (accept time), `initial_medication`, and `decline_reason` (in metadata) populated.

---

## 3. Key decisions made

- **Whose data for the demo:** seed Navachetana (Guru is a superuser there) rather than demo as another hospital. (All 130 pre-existing referrals belong to other hospitals.)
- **Charting:** Recharts (polished/animated) over hand-rolled SVG.
- **Role content differentiation:** doctor = personal & lean; superuser = operational. Driven by the "analytics is my USP for hospital owners — show them what improves operations" framing.
- **Three data-gap reinterpretations (so charts use real/defensible data, not fabrication):**
  - *Time-to-accept* → computed from the real `start_time` (when a referral was actioned) vs `created_at`. No fabrication.
  - *Inbound vs outbound between facilities* → **dropped as-is** (multi-tenant model has no cross-facility referrals) and **reinterpreted** as per-department "sent vs received" workload within the hospital.
  - *Decline reasons* → lightly **seeded** into `metadata.decline_reason` on the 6 cancelled demo rows (3 distinct catalog reasons), because the real capture path is broken (see §5).

---

## 4. Charts shipped (Superuser/Owner view)

| Section | Chart | Owner question it answers |
|---|---|---|
| KPI strip | total · avg time-to-accept · avg days-to-close · decline rate · transfer rate | snapshot of responsiveness / throughput / quality / triage |
| Bottlenecks | Slowest-to-accept by dept (bar) | which dept leaves referrals unanswered → staffing/roster |
| Bottlenecks | Slowest end-to-end by dept (bar) | which dept is slow start→finish → process review |
| Throughput | Created vs closed over time (area) | is the backlog growing → capacity planning |
| Friction | Decline reasons (bar) | why referrals fail → fix triage/training |
| Friction | Transfer hotspots (bar) | who transfers after receiving → mis-routing/guidelines |
| Workload | By department, received vs sent (stacked bar) | who's overloaded → rebalance |
| Flow | Patient flow between departments (**Sankey**) | common intra-hospital journeys (pitch "wow") |
| Clinical | Top referral reasons / diagnoses (bar) | service planning |

Doctor view ships: 4 personal KPIs + over-time, by-status, by-urgency only.

---

## 5. Known issues / caveats

- **Decline-reason capture is broken in the live app.** [src/hooks/useReferrals.ts](../src/hooks/useReferrals.ts) `useAddDeclineReason` (~line 888) inserts columns (`referral_id`, `reason_text`, `declined_by`) into `referral_decline_reasons` that **don't exist** on the live table (it's now a 3-row catalog), and updates a `referrals.decline_reason_id` column that also doesn't exist. So real declines record no reason — the decline-reasons chart only has data because we seeded it. **Needs a fix to work on real data.**
- **`referral_status_history` table is empty (0 rows)** — status transitions aren't logged. Not currently used by analytics (we derived time-to-accept from `start_time` instead), but it would be the proper source for accurate time-to-accept / time-in-each-state if wired up.
- **Demo seed = fabricated data.** The 36 Navachetana referrals (and their decline reasons) are demo-only. Remove before any real use (cleanup query in §2).
- **2-doctor hospital limitation.** Navachetana has only 2 real users (auth FK blocks seeding fake doctor logins), so a doctor's "personal" view and the superuser's "hospital" view show the same rows in *this* demo. The role logic is correct; the coincidence is data-specific.
- **Decline vs Cancelled semantics.** "Decline rate" is computed as `Cancelled / total`. Confirm that declining a referral truly maps to status `Cancelled` (no dedicated `Declined` status exists in the enum).

---

## 6. Pending / backlog

- [ ] **Commit & push** the analytics work (page, hook, 3 migrations, seed, recharts dep, `App.tsx`).
- [ ] **Fix the decline-reason capture path** so decline analytics runs on real data (align `useAddDeclineReason` with the live schema, or add the missing columns/table).
- [ ] **Decide on demo seed** — keep for demos vs remove for production; document the toggle.
- [ ] **Platform Owner enhancement** — add a per-hospital comparison/breakdown (currently Platform sees the same charts as a superuser, just network-wide aggregate).
- [ ] **Date-range / filter controls** — the RPC already accepts `p_from`/`p_to`; the UI currently hardcodes last 12 months. Add a range picker + department filter.
- [ ] **Export** — "Export report" (PDF/Excel) for the owner pitch.
- [ ] **(Optional) duty-roster analytics** — coverage, swap frequency, shift load — a separate dataset from referrals.
- [ ] **(Optional) drop or keep vanity charts** — patient demographics + medication trends were deliberately left out; revisit if a stakeholder wants them.
- [ ] **Wire `referral_status_history`** if precise stage timings (time-in-each-status) become a requirement.
