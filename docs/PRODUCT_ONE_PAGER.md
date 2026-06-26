# MedSync 360 — Referral Coordination & Clinical Audit

_One-pager · draft for hospital administration / investor conversations · 2026-06-23_

## The problem
Inside hospitals, patient referrals between departments are still run on **verbal handoffs, paper slips, and WhatsApp**. When a patient moves from (say) Anaesthesiology → Critical Care → Cardiology, there is **no reliable record** of who accepted the patient, what medication was prescribed or changed at each step, or who is accountable at any moment. This creates clinical risk, lost time, and — when something goes wrong — **no defensible audit trail**.

## What MedSync 360 does
A focused tool for **inter-departmental referral coordination** with a complete, tamper-evident **clinical audit trail**:

- **Referral workflow** — create, send, accept/decline, transfer, and close referrals across departments.
- **Medication journey** — every prescription and change is captured at each hand-off, across the full transfer chain (not just the last doctor).
- **Completion report** — a one-click, branded **discharge/completion report** (Excel + PDF) showing the full doctor path, per-stage timeline (received → accepted → transferred/completed), medications, and final diagnosis.
- **Supporting modules** — duty roster, secure in-app messaging, dashboard.

## Why this is different
Most hospital systems can produce a referral form. Almost none produce a **correct, chain-wide medication & accountability trail** — the part that matters for patient safety and medico-legal defense. That trail is our core, and it is the hard part to get right.

## Who it's for
- **Multi-specialty hospitals and hospital networks** where patients move between departments.
- **Buyer:** medical administration / quality & compliance (accountability and audit), with doctors as daily users (speed).

## Why now
- **ABDM (Ayushman Bharat Digital Mission)** is pushing Indian hospitals toward digital, interoperable clinical records.
- **DPDP Act** raises the bar on health-data handling — auditable trails are becoming an expectation, not a nice-to-have.

## Where it fits
Positioned as a **focused referral-coordination + audit layer** that works *alongside* a hospital's existing HIS/EMR — not a rip-and-replace. Standalone for the referral slice today; interoperable (HL7/FHIR/ABDM) on the roadmap.

## Status
Working product through a full multi-hop referral + medication-journey workflow with Excel/PDF reporting, on a modern stack (React + Supabase/Postgres). Currently single-hospital; **multi-tenant, security hardening (DPDP-grade), and HIS integration are the path to production** (tracked roadmap).

## Honest near-term gaps (being addressed)
- Multi-hospital tenancy and per-hospital admin/coordinator roles.
- Production-grade PHI security (server-side keys, hardened access controls).
- Integration / interoperability with existing hospital systems.

## What we're looking for
- **1–2 pilot hospitals** (busy multi-specialty) to validate the audit trail under real conditions.
- Feedback on the highest-value wedge: standalone referral-audit tool vs. a module within a larger HMS.

---
_Built around a single conviction: when a patient passes through many hands, the record of that journey should be complete, correct, and instantly producible._
