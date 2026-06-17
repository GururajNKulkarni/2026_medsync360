# Complete Medication Journey – Architecture, Implementation, and Recovery Guide

This document is the single source of truth for how the Complete Medication Journey works end‑to‑end. It explains architecture, database functions, frontend integration, file ownership, and provides recovery steps if anything breaks in the future.

---

## 1) High-level Objective
Provide a unified, chronological view of all medication actions related to a referral, including across transfer chains, and expose it consistently to the UI and Excel export.

---

## 2) Data Model and Backend

### 2.1 Key Tables
- `referrals`
  - Core referral record. Relevant columns used by the journey:
    - `id`, `title`, `status`, `medication_given`, `initial_medication`
    - Transfer linkage: `transfer_parent_id`, `transferred_at`, `transferred_from_user_id`, `transfer_reason`, `transfer_notes`, `transferred_from_department`
- `medication_history`
  - Tracks updates across the life of a referral. Important columns:
    - `referral_id`, `medication_text`, `updated_by_user_id`, `updated_at`
- `users`
  - Used for doctor names and departments.

### 2.2 Core Function
- `public.get_complete_medication_trail(p_referral_id UUID) returns setof record`
  - Purpose: Build a unified list of medication actions from original referral through transfers to closure.
  - Steps typically returned:
    1. Created Referral
    2. Initial Medication Set
    3. Updated During Transfer
    4. Received Transfer
    5. Completed Referral
  - Output columns (must match the TypeScript interface):
    - `step_number int`
    - `record_timestamp timestamptz` (formatted as `formatted_time` as well)
    - `formatted_time text`
    - `doctor_name text`, `doctor_id uuid`
    - `action_type text` (one of: Created Referral, Initial Medication Set, Updated During Transfer, Received Transfer, Completed Referral)
    - `department_context text`
    - `medication_prescribed text`
    - `medication_context text`
    - `referral_id uuid`, `referral_title text`
    - `is_original_referral boolean`

### 2.3 Function References (SQL)
- `supabase/migrations/20250804120000_create_complete_medication_trail_function.sql`
- Iterative fixes kept for reference: `SIMPLE_FIX_MEDICATION_TRAIL.sql`, `FIX_MEDICATION_TRAIL_TRANSFER_RECIPIENTS.sql`, `FIX_MEDICATION_TRAIL_TRANSFER_RECIPIENTS_CORRECTED.sql`

---

## 3) Frontend Integration

### 3.1 Hooks
- `src/hooks/useReferrals.ts`
  - Hook: `useCompleteMedicationTrail(referralId)`
    - Calls `supabase.rpc('get_complete_medication_trail', { p_referral_id: referralId })`
    - Query options: `staleTime: 0`, `refetchOnWindowFocus: true`, `refetchOnMount: true`, `refetchOnReconnect: true`
    - Returns an array of `CompleteMedicationTrail` items

```startLine:500:endLine:534:src/hooks/useReferrals.ts
// Fetch COMPLETE medication trail for a referral
const fetchCompleteMedicationTrail = async (referralId: string): Promise<CompleteMedicationTrail[]> => {
  try {
    console.log('Fetching complete medication trail for referral:', referralId);
    const { data, error } = await (supabase as any).rpc('get_complete_medication_trail', {
      p_referral_id: referralId
    });
    if (error) throw error;
    return (data || []) as CompleteMedicationTrail[];
  } catch (error) {
    console.error('Error fetching complete medication trail:', error);
    throw error;
  }
};

export const useCompleteMedicationTrail = (referralId: string) => {
  return useQuery({
    queryKey: [...referralKeys.detail(referralId), 'complete-medication-trail'],
    queryFn: () => fetchCompleteMedicationTrail(referralId),
    enabled: !!referralId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
};
```

### 3.2 Types
- `src/types/referral.types.ts` – Interface must match backend output exactly.

```startLine:37:endLine:51:src/types/referral.types.ts
export interface CompleteMedicationTrail {
  step_number: number;
  record_timestamp: string; // Backend returns record_timestamp, not timestamp
  formatted_time: string;
  doctor_name: string;
  doctor_id: string;
  action_type: 'Created Referral' | 'Updated During Transfer' | 'Completed Referral' | 'Initial Medication Set' | 'Received Transfer';
  department_context: string;
  medication_prescribed: string;
  medication_context: string;
  referral_id: string;
  referral_title: string;
  is_original_referral: boolean;
}
```

### 3.3 UI Component
- `src/components/features/referrals/ReferralDetails.tsx`
  - Renders the “Complete Medication Journey” timeline if the trail length > 0
  - Shows loading state while fetching
  - Summary cards: first medication vs final/current medication

```startLine:569:endLine:667:src/components/features/referrals/ReferralDetails.tsx
{/* Enhanced Medication Information with Complete Trail */}
{(referral.medicationGiven || referral.initialMedication || completeMedicationTrail.length > 0 || isLoadingTrail) && (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
      <Stethoscope className="w-5 h-5 text-green-600 mr-2" />
      Medication Information
    </h3>

    {completeMedicationTrail.length > 0 ? (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Complete Medication Journey ({completeMedicationTrail.length} steps)
          </h4>
          {isLoadingTrail ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-blue-600">Loading complete medication trail...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {completeMedicationTrail.map((step, index) => (
                <div key={step.step_number} className={cn("relative pl-6 pb-4", index === completeMedicationTrail.length - 1 ? "" : "border-l-2 border-blue-200")}> 
                  {/* Step card content (doctor, department, medication, context) */}
                </div>
              ))}
            </div>
          )}
        </div>

        {completeMedicationTrail.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original vs Final medication summary cards */}
          </div>
        )}
      </div>
    ) : (
      /* Fallback rendering when no trail yet */
      <div className="space-y-3">{/* ... */}</div>
    )}
  </div>
)}
```

---

## 4) User Flow
1. User opens a referral’s details page.
2. The component calls `useCompleteMedicationTrail(referralId)`.
3. The hook triggers an RPC to `get_complete_medication_trail` with `p_referral_id`.
4. Backend returns a normalized list of steps across original + transferred referrals.
5. UI renders the timeline and the summary cards.
6. Excel export (`src/utils/excelExport.ts`) consumes the same trail for report sections: “COMPLETE MEDICATION JOURNEY” and “MEDICATION TRAIL SUMMARY”.

---

## 5) Guardrails (to prevent accidental breakage)
- Protect these files via CODEOWNERS and CI path guards:
  - `src/components/features/referrals/ReferralDetails.tsx`
  - `src/hooks/useReferrals.ts`
  - `src/types/referral.types.ts`
  - `src/utils/excelExport.ts`
- Branch protection: require PR + reviews; disallow force-push to `main`.
- Optional local locks: Windows `attrib +R` + `git update-index --skip-worktree`.

---

## 6) Troubleshooting Checklist
- Backend sanity test (SQL):
  - `SELECT * FROM get_complete_medication_trail('<referral_uuid>');`
  - Expect 1–5+ rows depending on activity.
- If UI shows nothing:
  - Open DevTools Console:
    - Look for logs: `Complete Medication Trail Debug` and `Medication Trail Data Available`.
    - Inspect `trailLength` > 0.
  - Network tab: ensure RPC call succeeds and returns an array.
  - Verify the TypeScript interface still matches SQL output:
    - Ensure `record_timestamp` (not `timestamp`).
    - Ensure `action_type` includes: Initial Medication Set, Received Transfer.
  - Clear caches: delete `node_modules/.vite` and hard refresh browser.

---

## 7) Recovery Procedure (if broken)
1. Verify DB function exists and returns data for a known referral.
2. Ensure `CompleteMedicationTrail` interface matches the function output exactly.
3. Ensure `useCompleteMedicationTrail` calls RPC with parameter name `p_referral_id`.
4. Ensure conditional rendering includes `|| isLoadingTrail` to show the section during load.
5. Compare UI snippet above with the component to restore the timeline block.
6. For Excel exports, ensure `generateReferralExcelReport` receives `completeMedicationTrail` in `CompletedReferralData`.

---

## 8) Validation Examples
- Known working referral: `0512934b-63e3-445d-b8a6-d74534dc42e0` → 5 steps including transfer.
- The first step shows “Created Referral” by the originating doctor; the last step “Completed Referral” by the closing doctor.

---

## 9) Ownership
- Product owner: You
- Code owner suggestion (for CODEOWNERS):
  - `@your-github-user` for the four protected files listed above

---

This document should be updated whenever the SQL function output changes or when the UI timeline structure is altered. Keep the interface and SQL output perfectly in sync to avoid runtime issues.