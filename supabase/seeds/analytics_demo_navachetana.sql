-- DEMO SEED (not a migration — run manually only when you want demo data).
-- Seeds 36 realistic referrals for the "Navachetana" hospital so the Analytics
-- dashboard (incl. the operational superuser charts) looks full when demoing as
-- a Navachetana superuser. Every row is tagged metadata.seed='analytics_demo':
--
--   DELETE FROM referrals WHERE metadata->>'seed' = 'analytics_demo';
--
-- from/to users are the two real Navachetana accounts (Guru, Karuna); the
-- department / diagnosis / urgency / medication / decline-reason text is varied
-- to populate every chart. start_time = accept time (created + a few hours),
-- end_time = close time (Closed only). Re-running appends another 36 rows —
-- clean up first if you don't want dupes.

DELETE FROM referrals WHERE metadata->>'seed' = 'analytics_demo';

WITH params AS (
  SELECT
    (SELECT id FROM users WHERE kmc_number = 'KMC123091') AS guru,    -- Guru Test Hublikar (superuser)
    (SELECT id FROM users WHERE full_name='Karuna Belagavi'
       AND hospital_id=(SELECT id FROM hospitals WHERE name='Navachetana')) AS karuna
),
seed AS (
  SELECT
    i,
    (ARRAY['DM Cardiology','DM Nephrology','MD General Medicine','MD Pediatrics','DM Neurology','MD General Surgery','MD Critical Care Medicine','DM Endocrinology'])[1 + (i % 8)] AS to_dept,
    (ARRAY['DM Endocrinology','MD Critical Care Medicine','MD General Medicine','DM Cardiology','MD General Surgery'])[1 + (i % 5)] AS from_dept,
    (ARRAY['Normal','Normal','Urgent','Emergency','Elective'])[1 + (i % 5)] AS urgency,
    CASE WHEN i % 6 IN (0,1,2) THEN 'Closed' WHEN i % 6 = 3 THEN 'Transferred' WHEN i % 6 = 4 THEN 'Cancelled' ELSE 'Received' END AS status,
    (ARRAY['Cardiovascular','Renal','Infectious Disease','Respiratory','Neurological','Endocrine','Gastrointestinal','Trauma'])[1 + (i % 8)] AS dx,
    (ARRAY['Paracetamol 500mg','Amoxicillin 500mg','Atorvastatin 20mg','Metformin 500mg','Amlodipine 5mg','Pantoprazole 40mg','Aspirin 75mg','Insulin Glargine'])[1 + (i % 8)] AS med,
    (ARRAY['Incorrect Details','Not Needed Anymore','Not On Duty'])[1 + ((i/6) % 3)] AS decline_reason,
    (ARRAY['Rajesh','Sunita','Mohan','Lakshmi','Arjun','Priya','Venkatesh','Geeta','Suresh','Anita','Kiran','Deepa'])[1 + (i % 12)] || ' ' ||
      (ARRAY['Kumar','Rao','Patil','Shetty','Gowda','Naik','Hegde','Joshi'])[1 + (i % 8)] AS patient_name,
    8 + (i * 7 % 78) AS patient_age,
    (ARRAY['Male','Female'])[1 + (i % 2)] AS patient_sex,
    (now() - ((i * 7) || ' days')::interval) AS created_at,
    (i % 2) AS who
  FROM generate_series(0, 35) AS i
)
INSERT INTO referrals (
  id, title, description, urgency, status, from_user_id, to_user_id, to_department, from_department,
  created_at, updated_at, start_time, end_time, patient_name, patient_age, patient_sex, admission_date, initial_medication,
  final_diagnosis_category, final_diagnosis_details, final_diagnosis_timestamp, final_diagnosis_by, metadata
)
SELECT
  gen_random_uuid(), 'Referral for ' || s.patient_name, s.dx || ' consultation requested',
  s.urgency::referral_urgency, s.status::referral_status,
  CASE WHEN s.who=0 THEN p.guru ELSE p.karuna END, CASE WHEN s.who=0 THEN p.karuna ELSE p.guru END,
  s.to_dept, s.from_dept, s.created_at, s.created_at,
  CASE WHEN s.status IN ('Closed','Transferred','Received') THEN s.created_at + ((2 + (s.i % 22)) || ' hours')::interval END,
  CASE WHEN s.status='Closed' THEN s.created_at + ((1 + (s.i % 5)) || ' days')::interval END,
  s.patient_name, s.patient_age, s.patient_sex, s.created_at::date, s.med,
  CASE WHEN s.status='Closed' THEN s.dx END,
  CASE WHEN s.status='Closed' THEN s.dx || ' confirmed and managed' END,
  CASE WHEN s.status='Closed' THEN s.created_at + ((1 + (s.i % 5)) || ' days')::interval END,
  CASE WHEN s.status='Closed' THEN (CASE WHEN s.who=0 THEN p.karuna ELSE p.guru END) END,
  CASE WHEN s.status='Cancelled' THEN jsonb_build_object('seed','analytics_demo','decline_reason',s.decline_reason)
       ELSE jsonb_build_object('seed','analytics_demo') END
FROM seed s CROSS JOIN params p;
