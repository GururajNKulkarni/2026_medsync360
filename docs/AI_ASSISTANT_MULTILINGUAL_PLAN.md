# AI Assistant — Multilingual Plan (German, Dutch, Kannada)

_Last updated: 2026-06-24. Owner: guru. Goal: take the AI Medical Assistant from an English-only, demo-grade feature to a production-ready, trilingual (de / nl / kn) clinical documentation tool — and define how we measure that it actually works._

---

## 0. TL;DR

The AI Assistant has **four independent layers**, and "make it multilingual" touches all four. They can be shipped incrementally:

| Layer | What it is | Multilingual change | Risk |
|---|---|---|---|
| **L1 — UI text** | Buttons, labels, guidelines | Add `react-i18next`, extract strings, add `de`/`nl`/`kn` locale files | Low |
| **L2 — Speech→Text (STT)** | Voice → transcript | Set recognition language; longer-term move to server STT with a BAA | Medium |
| **L3 — AI extraction** | Transcript → structured record | Server-side LLM call, language-aware prompt, real extraction (remove fabricated data) | High |
| **L4 — Clinical accuracy** | Are the codes/vitals correct in-language | Validation, terminology, human-in-the-loop | High |

**Hard prerequisite for L3/L4:** the OpenAI key must move server-side first (Supabase Edge Function). We cannot ship real multilingual clinical extraction while the key is in the browser bundle and PHI is sent client-side without a BAA.

---

## 1. Current state (baseline we are changing)

- **Entry:** `src/components/features/ai-assistant/AIAssistantButton.tsx` → `AIAssistantModal.tsx`.
- **STT:** `src/hooks/useAudioRecording.ts` uses the browser **Web Speech API** (`webkitSpeechRecognition`), hardcoded `recognition.lang = 'en-US'` (line ~51). Recorded audio from `MediaRecorder` is discarded.
- **Extraction:** `src/hooks/useMedicalAI.ts` → OpenAI `gpt-3.5-turbo`, **3s timeout**, falls back to regex/`Math.random()` mock data (vitals, confidence, meds, CPT are fabricated).
- **LLM client:** `src/lib/openai.ts` — client-side, `VITE_OPENAI_API_KEY` ships in the browser bundle.
- **Persistence:** `medical_conversations` table (RLS on, owner-scoped). `ConversationHistory.tsx` is still 100% mock and never reads it.
- **i18n:** none. No i18n library installed; all copy is hardcoded English.

See `docs/` AI assistant report (this session) for the full findings.

---

## 2. Dependent APIs / services

### 2.1 Required

| Service | Used for | de | nl | kn | HIPAA BAA available | Notes |
|---|---|---|---|---|---|---|
| **OpenAI** (`gpt-4o-mini` or `gpt-4o`) | L3 extraction (transcript → structured JSON) | ✅ | ✅ | ⚠️ ok, weaker | ✅ (OpenAI signs BAAs on request, API only) | Replace `gpt-3.5-turbo`. 4o-mini is cheaper *and* far better at non-English + structured output. |
| **Supabase Edge Functions** | Server-side proxy for all LLM/STT calls | n/a | n/a | n/a | ✅ (Supabase BAA on paid plans) | Already our backend. Keeps keys server-side, enables real rate-limit + audit logging. |

### 2.2 Speech-to-Text — choose one

| Option | de | nl | kn | BAA | Cost (approx) | Verdict |
|---|---|---|---|---|---|---|
| **Browser Web Speech API** (current) | `de-DE` ✅ | `nl-NL` ✅ | `kn-IN` ✅ (Chrome) | ❌ (Chrome streams audio to Google) | Free | Fine for **demo/pilot only**. No BAA → not for real PHI. |
| **OpenAI Whisper** (`whisper-1`) via Edge Function | ✅ | ✅ | ✅ (supported, lower accuracy) | ✅ (same OpenAI BAA) | ~$0.006/min | **Recommended** — one vendor, one BAA, decent Kannada, server-side. |
| **Azure AI Speech** | ✅ strong | ✅ strong | ✅ `kn-IN` | ✅ (Microsoft BAA) | ~$1/audio-hour | Best medical/enterprise STT; more setup. Consider for v2. |
| **Google Cloud Speech-to-Text** | ✅ | ✅ | ✅ strong `kn-IN` | ✅ (Google BAA) | ~$0.016/min | Best Kannada accuracy specifically; extra vendor + BAA. |

> **Recommendation:** Phase 1 keep Web Speech API (demo, no PHI). Phase 2 move to **Whisper via Edge Function** for one-vendor simplicity. Revisit **Google STT for Kannada** only if Whisper's Kannada accuracy fails the benchmark in §5.

### 2.3 Frontend libraries (npm)

| Package | Purpose |
|---|---|
| `i18next`, `react-i18next` | L1 UI translation framework |
| `i18next-browser-languagedetector` | Detect/persist user's language choice |
| (font) **Noto Sans Kannada** | Render Kannada script (`ಕನ್ನಡ`) — via Google Fonts or self-hosted woff2 |

No new backend npm deps — Edge Functions call OpenAI over `fetch`.

---

## 3. Implementation — step by step

### Phase 0 — Prerequisite: move OpenAI server-side (unblocks L3/L4)

**Why first:** security (key in bundle), HIPAA (PHI to third party from client), and it's the seam where we add language handling + real extraction.

1. **Create the Edge Function** `supabase/functions/medical-ai/index.ts`:
   - Accepts `{ transcript, patientInfo, language }` (`language ∈ {'en','de','nl','kn'}`).
   - Reads `OPENAI_API_KEY` from Edge Function **secrets** (`supabase secrets set OPENAI_API_KEY=…`), never from a `VITE_` var.
   - Calls `gpt-4o-mini` with a language-aware system prompt (see Phase 3).
   - Enforces real rate-limiting (per `auth.uid()`), logs usage to an `ai_usage` table (server-authoritative, replaces the localStorage counters in `openai.ts`).
   - Returns structured JSON only.
2. **Auth:** require the caller's Supabase JWT; reject anonymous. Derive `user_id` server-side from the JWT — never trust a client-supplied id.
3. **Client swap:** replace the direct `fetch` in `src/lib/openai.ts` / `useMedicalAI.ts` with a call to `supabase.functions.invoke('medical-ai', …)`. Delete `VITE_OPENAI_API_KEY` usage from the client.
4. **Rotate** the currently-leaked OpenAI key (it's in git history) after the cutover.
5. **(Optional, same function or a sibling)** `medical-stt` for Whisper in Phase 2.

**Acceptance:** no `VITE_OPENAI_API_KEY` reference remains in `src/`; network tab shows calls to `…/functions/v1/medical-ai`, not `api.openai.com`.

### Phase 1 — L1: UI internationalization

1. `npm i i18next react-i18next i18next-browser-languagedetector`.
2. Create `src/i18n/index.ts` (init i18next, `fallbackLng: 'en'`, language detector + localStorage persistence) and import it once in `src/main.tsx`.
3. Create locale files: `src/i18n/locales/{en,de,nl,kn}/aiAssistant.json` (start scoped to the AI assistant namespace, expand later).
4. Replace hardcoded strings with `const { t } = useTranslation('aiAssistant')` + `t('key')` across:
   - `AIAssistantModal.tsx` (header, "Live Transcript", "Process with AI", footer states, guidelines)
   - `PatientInfoForm.tsx`, `ProcessingStages.tsx`, `ResultsTabs.tsx`, `ConversationHistory.tsx`, `RecordingControls.tsx`.
5. **Language selector UI** — a dropdown (🇬🇧 / 🇩🇪 / 🇳🇱 / ಕ) in the modal header that calls `i18n.changeLanguage(lng)`. Persist to the user's profile (`users.preferred_language`) so it follows them across devices — add a nullable `preferred_language text` column + include it in the Settings self-service section.
6. **Kannada font:** add Noto Sans Kannada (`@import` or self-host woff2), apply via a `lang="kn"` CSS rule so only Kannada text uses it.
7. **Locale-aware dates/numbers:** replace `toLocaleDateString('en-US', …)` calls (e.g. `ConversationHistory.tsx`, the new Settings password timestamp) with the active locale.

**Acceptance:** switching language re-renders all AI-assistant copy; refresh preserves choice; Kannada renders with correct glyphs.

### Phase 2 — L2: multilingual speech recognition

1. In `useAudioRecording.ts`, accept a `language` param and map it to a BCP-47 code: `en→en-US`, `de→de-DE`, `nl→nl-NL`, `kn→kn-IN`. Set `recognition.lang` from it **before** `start()`.
2. Surface the same language selector from Phase 1 to the recording flow (default to the user's `preferred_language`).
3. **Capability/permission guards:** if `webkitSpeechRecognition` is absent (Firefox/Safari), or the chosen `lang` isn't supported, show a clear in-modal message (and offer manual transcript entry) instead of silently failing.
4. **Phase 2b (production STT):** stop discarding `MediaRecorder` audio; send the blob to a `medical-stt` Edge Function (Whisper, `language` hint). This removes the Google-audio-leak and works in all browsers. Gate behind a flag so demo can stay on Web Speech API.

**Acceptance:** speaking German/Dutch/Kannada produces an in-language transcript; unsupported browsers degrade gracefully.

### Phase 3 — L3: language-aware, real extraction

1. **Prompt the model to work in-language and return strict JSON.** System prompt template (per `language`):
   - "You are a clinical scribe. The transcript is in {languageName}. Extract a structured record. Respond in {languageName} for free-text fields (chief complaint, assessment, plan, HPI), but keep ICD-10/CPT codes and units standard. Return ONLY valid JSON matching this schema: {…}."
2. **Return the full record from the model** — chief complaint, assessment, plan, HPI, PMH, medications (name/dose/frequency), allergies, vitals, ICD-10, CPT — and **delete the fabricated fallbacks** in `useMedicalAI.ts` (`Math.random()` confidence, hardcoded `120/80`, fixed `99213`). If the model can't extract a field, return `null`/empty and render "not captured", never an invented value.
3. **Confidence must be real or absent** — either ask the model to self-rate per field, or remove the confidence badge. No random numbers.
4. **Model:** `gpt-4o-mini` default; allow `gpt-4o` for Kannada if benchmark (§5) shows 4o-mini underperforms.
5. **Increase the timeout** from 3s to a realistic value (15–20s) with a proper loading state; the current 3s guarantees fallback-to-mock.
6. **Wire `ConversationHistory` to the real `medical_conversations` table** (read + Edit/Export/Delete) so saved multilingual records are actually retrievable.

**Acceptance:** a German transcript yields a German-language structured record with real (or null) fields; no random/hardcoded clinical values anywhere in the path.

### Phase 4 — L4: clinical accuracy & safety

1. **Human-in-the-loop:** keep every AI record in a "needs review" state until a clinician confirms; never auto-file.
2. **Disclaimers in-language** on the results panel.
3. **Terminology checks:** validate ICD-10 codes against a real code list (reject hallucinated codes); flag low-confidence extractions.
4. **Kannada caveat:** medical Kannada STT + coding is the weakest link — pilot with clinician validation before any reliance.

---

## 4. Data / schema changes

- `users.preferred_language text` (nullable, default `'en'`) — self-service editable from Settings.
- `ai_usage` table (server-authoritative usage/audit): `id, user_id, language, model, input_tokens, output_tokens, latency_ms, fell_back boolean, created_at`. RLS: owner-read, service-role-write.
- (If Phase 2b) storage bucket for audio blobs + retention policy (PHI — encrypt, short TTL).

---

## 5. Success benchmarks

Define "working" measurably. Build a fixed **evaluation set: 20 scripted patient encounters per language** (de/nl/kn = 60 total), each with a known "gold" transcript + expected structured record, recorded by native/fluent speakers in a quiet and a noisy setting.

### L1 — UI translation
- **100%** of AI-assistant strings render translated (no English leakage) in all 3 languages — checked with i18next's `saveMissing`/missing-key report = 0 missing.
- Kannada glyphs render correctly (visual QA, no tofu boxes).

### L2 — Speech-to-text (Word Error Rate)
| Language | Target WER (quiet) | Target WER (noisy) |
|---|---|---|
| German | ≤ 10% | ≤ 20% |
| Dutch | ≤ 12% | ≤ 22% |
| Kannada | ≤ 25% (pilot bar) | ≤ 40% |

- Measure WER = (substitutions + insertions + deletions) / reference words, against the gold transcript.
- **Medical-term recall** (drugs, symptoms, anatomy): ≥ 85% (de/nl), ≥ 70% (kn) of key terms transcribed correctly — this matters more than raw WER.

### L3 — Extraction quality
- **Field-level accuracy** vs gold record: chief complaint, assessment, plan correct in ≥ **90%** (de/nl), ≥ **80%** (kn) of cases (clinician-rated 0/1).
- **Zero fabricated values** — automated test asserts no vitals/codes appear that weren't in the transcript (the §3 "no random data" rule).
- **JSON validity:** ≥ 99% of responses parse on first try.
- **ICD-10 validity:** 100% of returned codes exist in the official code set (hallucination rate 0%).

### Operational
- **p95 end-to-end latency** (stop recording → record shown): ≤ 20s.
- **Fallback rate** (had to use mock/empty): ≤ 5% once timeout is fixed.
- **Cost/encounter:** track $ per encounter (STT minutes + LLM tokens); target < $0.10 for a 5-min visit.
- **Security gate (pass/fail):** no API key in client bundle; PHI only transits BAA-covered services.

### Acceptance for "multilingual = done"
A clinician fluent in each language runs the 20-case set and the feature meets the L2/L3 bars above for **German and Dutch**; **Kannada** ships as a labelled *pilot* (lower bar, mandatory human review) until its numbers reach the de/nl bar.

---

## 6. Suggested sequencing

1. **Phase 0** (Edge Function + key rotation) — security/HIPAA unblock. _Highest priority._
2. **Phase 1** (i18next UI, de/nl/kn) — high visibility, low risk, independent of the AI logic.
3. **Phase 2** (recognition `lang` switch) — small change, immediate multilingual transcription for the demo.
4. **Phase 3** (real, language-aware extraction; kill fabricated data; wire History).
5. **Phase 2b + Phase 4** (server STT with BAA, clinical safety, Kannada validation) — production hardening.

Each phase is independently shippable and testable against the §5 benchmarks.
