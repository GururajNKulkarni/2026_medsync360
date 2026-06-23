# MedSync 360 — Next Steps Plan

_Last updated: 2026-06-19. Owner: guru. Goal: take the referral/medication journey from "demo-ready" to "production-ready," then harden the rest of the app._

---

## 0. Pick up here first (loose ends from last session)

- [ ] **Commit & push the report + attachment fixes** — uncommitted work across `ReferralDetails.tsx`, `useReferrals.ts`, `fileUpload.ts`, `referral.types.ts`, `excelExport.ts`, `CLAUDE.md`, and migrations `20260619120000_get_chain_attachments.sql` + `20260622000000_fix_medication_trail_multihop.sql`. Covers: report fixes (diagnosis from completed referral, real completion time, chain-wide attachment count); real `transfer_referral` call from the "Mark as Completed" path; timeline rows (Departments Visited / Total Transfers); chain-wide attachments feature (`get_chain_attachments` RPC + `useChainAttachments` + grouped-by-hop UI); **attachment-insert bug fix** (phantom `original_file_name` column silently failed every insert since 2025-07-13); **transfer-attachment fix** (files attached during a transfer were dropped — now saved to the child referral). Push to `origin` (= `2026_medsync360`). tsc + build pass.
- [ ] **Rotate credentials** 🔑 — Supabase anon + service-role keys and the OpenAI key live in git history (`.env.example`) which is now in the new repo. Rotate them in the Supabase dashboard + OpenAI, update local `.env`. This is the single most important production item.
- [ ] Decide whether to scrub `.env.example` from git history (BFG / git filter-repo) or just rotate-and-move-on.

## 1. Referral / Medication Journey — finish the regression pass

We fixed many bugs in isolation. Do one clean end-to-end run and confirm each path:
- [ ] Create → accept → complete (single hop), check Excel: timeline, diagnosis, attachments, AM/PM time.
- [ ] Decline path (Cancelled status, reason captured).
- [ ] Same-department transfer (Prasad→Guru→Karuna within/across depts).
- [ ] Multi-hop with a **medication change at every hop** — confirm each "Updated During Transfer" step + final completion all appear for the final doctor and in Excel.
- [ ] Re-download report from Referral Details for a closed multi-hop referral — must match the completion-time Excel exactly.
- [ ] **Chain-wide attachments** — attach a *different* file at creation and at *each* transfer hop; confirm the final doctor sees all of them grouped ORIGIN / HOP 2 / HOP 3, and the Excel attachment count matches.

## 1b. Backfill missing attachment rows (one-time data fix)

The `original_file_name` insert bug silently dropped **every** attachment DB row from 2025-07-13 until the 2026-06-19 fix — the files themselves are still in Supabase storage, only the `referral_attachments` rows are missing. (One row, for patient Prakash, was already backfilled manually.)
- [ ] Write a one-time script/SQL to reconstruct `referral_attachments` rows from each referral's `attachments` column + matching `storage.objects` entries (resolve the `${userId}/${fileName}` path, set `uploaded_by` = referral `from_user_id`). Dry-run first; verify counts before inserting.
- [x] ~~Known cosmetic nit: the trail shows both "Updated During Transfer" and "Initial Medication Set" with the same value — decide whether to suppress the duplicate child "initial" step.~~ **DONE (2026-06-22, migration `20260622000000`)** — `get_complete_medication_trail` now (a) drops all `'initial'` events as redundant and (b) times "Received Transfer" off the child's `created_at` instead of `transferred_at`. This fixes both the duplicate steps AND a 3+-hop ordering bug where a middle doctor's "Received" step landed in the wrong time cluster. Verified on the 4-doctor chain `d1867b2d` (9 steps → 6, correctly ordered) and a 2-hop chain (no regression).

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

## 8. PDF discharge report alongside Excel — BUILT (demo), improvements pending

**Done (2026-06-23):** branded "CEO-format" PDF via `src/utils/pdfExport.ts` (`generateReferralPdfReport`), lazy-loaded `html2pdf.js`, "Download PDF" button beside "Download Excel" in `ReferralDetails` (closed referrals). Both share `assembleClosedReportData()` so PDF and Excel carry identical data. Renders the approved CEO design with the full multi-stage path + per-stage timeline. Quick-patched for the demo: legible stage labels, centered Medication Details, `avoid[]` page-break selectors so cards don't ghost across the seam.

### 8a. PDF improvements (deferred — image-based html2pdf has hit its ceiling)
The demo PDF is **image-based** (html2canvas rasterizes the HTML). That brings inherent limits we should fix for production:
- [ ] **Switch to a real-text engine** — `@react-pdf/renderer` (crisp + selectable + searchable text, reliable multi-page flow), **or** server-side **headless Chrome in a Supabase Edge Function** (pixel-perfect *and* real text; pairs with the planned "move OpenAI/secrets server-side" work). Recommended: react-pdf for client-only, Edge Chrome if we're already standing up Edge Functions. ~1.5–2 days (react-pdf) / ~2–3 days (Edge Chrome incl. infra).
- [ ] **Long-content robustness (the "1000-word" case)** — a single very long field (chief complaint, medication note) currently sits in an unbreakable card box and can overflow. A text engine reflows it; html2pdf cannot. This is the main reason to switch.
- [ ] **Text quality** — image-based text is soft even at scale 3 and not selectable/searchable; a text engine fixes this for free.
- [ ] **Path layout for 5+ doctors** — the horizontal node row gets cramped beyond ~4 stages; consider wrapping or a vertical path for long chains.
- [ ] Once switched, drop the `html2pdf.js` dependency and the rasterization workarounds.

### 8b. Share report via WhatsApp (requested, deferred)
- [ ] **Primary (mobile):** Web Share API (`navigator.share({ files: [pdf] })`) — shares the real PDF to WhatsApp/Email/any app; falls back to plain download on unsupported desktop browsers. No hosting, nothing leaves the user's control automatically.
- [ ] **Desktop link option (only if needed):** upload PDF to Supabase storage → short-expiry **signed URL** → `https://wa.me/?text=<url>` (wa.me cannot attach files, only a link).
- [ ] **⚠️ Governance:** the PDF contains PHI. Make sharing user-initiated only (never automatic), use short-expiry signed links, and add an audit log of who shared what. Decide policy before enabling the link path.

## 9. Feature — attach evidence without transferring

Today a doctor can attach files only at **referral creation** and **during a transfer**. A doctor who *receives* and *holds* a referral (accepted, not transferring) has **no way to add a lab result / scan / ECG** to the journey. Clinically that's a real gap — evidence often arrives after acceptance.

- [ ] Add an "Add attachment" action in Referral Details for a referral the current user holds (status Received/Acknowledged and `to_user_id` = me). Reuse `uploadMultipleFiles` + the `referral_attachments` insert, writing rows against the **current** referral id.
- [ ] RLS note: the existing INSERT policy only allows `from_user_id = auth.uid()`. The *holder* of a transferred referral is `to_user_id`, not `from_user_id` — so this needs either a policy update (allow `to_user_id`) or a `SECURITY DEFINER` RPC with an auth guard (same pattern as the chain RPCs). Decide which.
- [ ] Effort: ~0.5 day. Surfaces automatically in the existing chain-attachments UI once rows exist.

---

### Suggested order for the next session
1. Push report fixes (#0) → 2. Rotate keys (#0) → 3. Referral regression pass (#1) → 4. duty_roster RLS + OpenAI server-side (#3) → 5. CI + a few tests (#4).
