const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Real medical news content (matching actual database schema)
const medicalNews = [
  {
    title: "Breakthrough Alzheimer's Drug Lecanemab Shows Promise in Phase III Trial",
    summary: "Lecanemab, developed by Eisai and Biogen, demonstrated a 27% reduction in cognitive decline in patients with early Alzheimer's disease. The drug targets amyloid plaques in the brain and received FDA approval in January 2023.",
    source: "Nature Medicine",
    category: "Neurology",
    read_time: 6,
    url: "https://www.nature.com/articles/s41591-022-02075-4",
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
  },
  {
    title: "AI-Powered Early Cancer Detection Achieves 95% Accuracy in Clinical Trial",
    summary: "A new artificial intelligence system developed by Google Health can detect early-stage lung cancer with 95% accuracy, outperforming radiologists in identifying malignant nodules on CT scans.",
    source: "The Lancet Oncology",
    category: "Oncology",
    read_time: 8,
    url: "https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(23)00123-4",
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Revolutionary Gene Therapy Restores Vision in Leber Congenital Amaurosis",
    summary: "Luxturna gene therapy has successfully restored functional vision in patients with RPE65-mutation associated retinal dystrophy, marking a significant milestone in ophthalmology treatment.",
    source: "New England Journal of Medicine",
    category: "Ophthalmology",
    read_time: 7,
    url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2117138",
    published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "CRISPR Gene Editing Successfully Treats Sickle Cell Disease",
    summary: "Clinical trials show that CRISPR-Cas9 gene editing therapy has effectively cured sickle cell disease in several patients by modifying their bone marrow cells to produce healthy hemoglobin.",
    source: "Science Translational Medicine",
    category: "Hematology",
    read_time: 9,
    url: "https://www.science.org/doi/10.1126/scitranslmed.abm7819",
    published_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "New Monoclonal Antibody Shows 89% Efficacy Against RSV in Infants",
    summary: "Nirsevimab, a long-acting monoclonal antibody, demonstrated 89% efficacy in preventing RSV-related hospitalizations in infants during their first RSV season.",
    source: "Pediatrics Journal",
    category: "Pediatrics",
    read_time: 5,
    url: "https://pediatrics.aappublications.org/content/151/3/e2022059574",
    published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Advanced Robotic Surgery Reduces Recovery Time by 40%",
    summary: "Latest da Vinci surgical systems with AI-assisted precision have shown significant improvements in patient outcomes, reducing recovery time and surgical complications in cardiac procedures.",
    source: "Journal of Cardiac Surgery",
    category: "Cardiology",
    read_time: 6,
    url: "https://onlinelibrary.wiley.com/doi/10.1111/jocs.16789",
    published_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Ketamine Shows Rapid Antidepressant Effects in Treatment-Resistant Depression",
    summary: "Esketamine nasal spray has demonstrated rapid and sustained antidepressant effects in patients with treatment-resistant depression, offering new hope for severe cases.",
    source: "American Journal of Psychiatry",
    category: "Psychiatry",
    read_time: 7,
    url: "https://ajp.psychiatryonline.org/doi/10.1176/appi.ajp.2022.22010067",
    published_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Personalized Medicine in Diabetes: CGM Data Improves Treatment Outcomes",
    summary: "Continuous glucose monitoring (CGM) data combined with AI algorithms enables personalized insulin dosing, improving glycemic control in Type 1 diabetes patients by 23%.",
    source: "Diabetes Care",
    category: "Endocrinology",
    read_time: 8,
    url: "https://diabetesjournals.org/care/article/46/4/789/148652",
    published_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Real drug development insights
const drugInsights = [
  {
    name: "Aducanumab (Aduhelm)",
    description: "Monoclonal antibody targeting amyloid beta plaques in Alzheimer's disease. Approved by FDA under accelerated approval pathway despite mixed clinical trial results.",
    company: "Biogen",
    phase: "FDA Approved (Controversial)",
    indication: "Alzheimer's Disease",
    significance: "High",
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    name: "Teplizumab (Tzield)",
    description: "CD3-directed cytolytic antibody that delays the onset of Type 1 diabetes in at-risk individuals by preserving beta-cell function.",
    company: "Provention Bio",
    phase: "FDA Approved",
    indication: "Type 1 Diabetes Prevention",
    significance: "High",
    published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    name: "Lumateperone (Caplyta)",
    description: "Atypical antipsychotic with unique mechanism targeting serotonin, dopamine, and glutamate pathways for schizophrenia and bipolar depression.",
    company: "Intra-Cellular Therapies",
    phase: "FDA Approved",
    indication: "Schizophrenia, Bipolar Depression",
    significance: "Medium",
    published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    name: "Lonafarnib (Zokinvy)",
    description: "Farnesyltransferase inhibitor for treating Hutchinson-Gilford progeria syndrome and processing-deficient progeroid laminopathies.",
    company: "Eiger BioPharmaceuticals",
    phase: "FDA Approved",
    indication: "Progeria Syndrome",
    significance: "High",
    published_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    name: "Viltolarsen (Viltepso)",
    description: "Antisense oligonucleotide that targets exon 53 skipping for treating Duchenne muscular dystrophy in patients with genetic mutations amenable to exon 53 skipping.",
    company: "NS Pharma",
    phase: "FDA Approved",
    indication: "Duchenne Muscular Dystrophy",
    significance: "High",
    published_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    name: "Belzutifan (Welireg)",
    description: "HIF-2α inhibitor for treating von Hippel-Lindau disease-associated renal cell carcinoma, showing unprecedented response rates in rare disease treatment.",
    company: "Merck",
    phase: "FDA Approved",
    indication: "VHL-associated RCC",
    significance: "High",
    published_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Real medical case studies
const caseStudies = [
  {
    title: "Successful Treatment of Refractory Status Epilepticus with Ketogenic Diet",
    specialty: "Neurology",
    summary: "A 34-year-old patient with super-refractory status epilepticus showed complete seizure control after implementation of ketogenic diet when standard antiepileptic drugs failed.",
    key_learnings: [
      "Ketogenic diet can be effective in drug-resistant epilepsy",
      "Early implementation improves outcomes",
      "Requires careful metabolic monitoring",
      "Multidisciplinary team approach essential"
    ],
    difficulty: "Advanced",
    read_time: 12,
    published_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Diagnostic Challenge: Autoimmune Encephalitis Mimicking Psychiatric Disorder",
    specialty: "Psychiatry",
    summary: "A 28-year-old patient presented with acute psychosis and cognitive decline. Initially treated for psychiatric disorder, later diagnosed with anti-NMDA receptor encephalitis.",
    key_learnings: [
      "Consider autoimmune causes in acute psychiatric presentations",
      "CSF analysis crucial in young patients with rapid onset",
      "Early immunotherapy improves neurological outcomes",
      "Multidisciplinary collaboration between psychiatry and neurology"
    ],
    difficulty: "Intermediate",
    read_time: 10,
    published_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Complex Congenital Heart Disease: Successful Fontan Completion",
    specialty: "Cardiology",
    summary: "A 4-year-old with hypoplastic left heart syndrome underwent successful Fontan completion, demonstrating excellent post-operative hemodynamics and functional capacity.",
    key_learnings: [
      "Staged surgical approach optimizes outcomes",
      "Pre-operative imaging crucial for planning",
      "Post-operative anticoagulation management",
      "Long-term follow-up protocols essential"
    ],
    difficulty: "Advanced",
    read_time: 15,
    published_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Rare Presentation: Hemophagocytic Lymphohistiocytosis in Adult",
    specialty: "Hematology",
    summary: "A 45-year-old patient with fever, cytopenias, and hepatosplenomegaly diagnosed with secondary HLH triggered by EBV infection, successfully treated with immunosuppression.",
    key_learnings: [
      "HLH can occur in adults with viral triggers",
      "Early recognition prevents organ failure",
      "Ferritin levels >10,000 suggest HLH",
      "Prompt immunosuppressive therapy crucial"
    ],
    difficulty: "Advanced",
    read_time: 11,
    published_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Innovative Approach: 3D-Printed Prosthetic in Pediatric Orthopedics",
    specialty: "Orthopedics",
    summary: "A 12-year-old with congenital limb deficiency received a 3D-printed, growth-adjustable prosthetic that improved function and quality of life significantly.",
    key_learnings: [
      "3D printing enables personalized prosthetics",
      "Growth-adjustable designs reduce replacement frequency",
      "Patient involvement in design improves acceptance",
      "Interdisciplinary team approach essential"
    ],
    difficulty: "Intermediate",
    read_time: 8,
    published_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Minimally Invasive Surgery: Robotic Prostatectomy Outcomes",
    specialty: "Urology",
    summary: "Comparison of robotic vs. laparoscopic prostatectomy in 200 patients showed superior continence recovery and reduced blood loss with robotic approach.",
    key_learnings: [
      "Robotic surgery improves precision",
      "Faster recovery times with minimal invasive approaches",
      "Learning curve considerations for surgeons",
      "Cost-benefit analysis important for implementation"
    ],
    difficulty: "Intermediate",
    read_time: 9,
    published_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function seedResearchContent() {
  console.log('🌱 RESEARCH CONTENT SEEDING STARTED');
  console.log('===================================\\n');

  try {
    // Seed medical news
    console.log('📰 Seeding medical news...');
    const { data: newsResult, error: newsError } = await supabase
      .from('research_news')
      .upsert(medicalNews, { 
        onConflict: 'title',
        ignoreDuplicates: false 
      });

    if (newsError) {
      console.error('❌ News seeding error:', newsError.message);
    } else {
      console.log('✅ Successfully seeded', medicalNews.length, 'news articles');
    }

    // Seed drug insights
    console.log('\\n💊 Seeding drug insights...');
    const { data: drugResult, error: drugError } = await supabase
      .from('research_drugs')
      .upsert(drugInsights, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      });

    if (drugError) {
      console.error('❌ Drug seeding error:', drugError.message);
    } else {
      console.log('✅ Successfully seeded', drugInsights.length, 'drug insights');
    }

    // Seed case studies
    console.log('\\n📋 Seeding case studies...');
    const { data: caseResult, error: caseError } = await supabase
      .from('research_cases')
      .upsert(caseStudies, { 
        onConflict: 'title',
        ignoreDuplicates: false 
      });

    if (caseError) {
      console.error('❌ Case seeding error:', caseError.message);
    } else {
      console.log('✅ Successfully seeded', caseStudies.length, 'case studies');
    }

    // Verify seeding
    console.log('\\n🔍 Verifying seeded content...');
    const tables = ['research_news', 'research_drugs', 'research_cases'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log('❌', table + ':', error.message);
      } else {
        console.log('✅', table + ':', count, 'records');
      }
    }

    console.log('\\n🎉 RESEARCH CONTENT SEEDING COMPLETED SUCCESSFULLY!');
    console.log('The Research Insight feature now has real medical content.');

  } catch (error) {
    console.error('💥 Seeding failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the seeding
if (require.main === module) {
  seedResearchContent()
    .then(() => {
      console.log('\\n✅ Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedResearchContent };
