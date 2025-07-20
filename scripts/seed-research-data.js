// Seed script for research data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample data for research tables
const newsData = [
  {
    title: 'Breakthrough in Alzheimer\'s Treatment Shows Promise in Phase III Trials',
    summary: 'A new monoclonal antibody treatment has shown significant cognitive improvement in patients with early-stage Alzheimer\'s disease, potentially offering the first disease-modifying therapy for this condition.',
    source: 'Nature Medicine',
    published_at: new Date().toISOString(),
    category: 'Neurology',
    read_time: 5,
    url: 'https://example.com/alzheimers-breakthrough',
    image_url: 'https://images.pexels.com/photos/3938022/pexels-photo-3938022.jpeg'
  },
  {
    title: 'AI-Powered Diagnostic Tool Achieves 95% Accuracy in Early Cancer Detection',
    summary: 'Researchers have developed an AI system that can detect early-stage cancers with unprecedented accuracy by analyzing routine blood tests, potentially revolutionizing cancer screening.',
    source: 'The Lancet',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    category: 'Oncology',
    read_time: 7,
    url: 'https://example.com/ai-cancer-detection',
    image_url: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg'
  },
  {
    title: 'Novel mRNA Vaccine Shows Broad Protection Against Multiple Coronaviruses',
    summary: 'Scientists have developed a pan-coronavirus mRNA vaccine that provides protection against multiple coronavirus strains, including SARS-CoV-2 variants and other coronaviruses with pandemic potential.',
    source: 'Science',
    published_at: new Date(Date.now() - 172800000).toISOString(),
    category: 'Infectious Disease',
    read_time: 6,
    url: 'https://example.com/pan-coronavirus-vaccine',
    image_url: 'https://images.pexels.com/photos/3786157/pexels-photo-3786157.jpeg'
  },
  {
    title: 'Groundbreaking Study Links Gut Microbiome to Parkinson\'s Disease Progression',
    summary: 'A comprehensive longitudinal study has established a clear connection between specific gut bacteria compositions and the rate of Parkinson\'s disease progression, opening new avenues for therapeutic interventions.',
    source: 'Cell',
    published_at: new Date(Date.now() - 259200000).toISOString(),
    category: 'Neurology',
    read_time: 8,
    url: 'https://example.com/parkinsons-microbiome',
    image_url: 'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg'
  },
  {
    title: 'New Biomarker Panel Improves Early Detection of Pancreatic Cancer',
    summary: 'Researchers have identified a panel of blood biomarkers that can detect pancreatic cancer with high sensitivity and specificity up to two years before clinical diagnosis.',
    source: 'JAMA Oncology',
    published_at: new Date(Date.now() - 345600000).toISOString(),
    category: 'Oncology',
    read_time: 6,
    url: 'https://example.com/pancreatic-cancer-biomarkers',
    image_url: 'https://images.pexels.com/photos/3938023/pexels-photo-3938023.jpeg'
  }
];

const drugData = [
  {
    name: 'Lecanemab (Leqembi)',
    description: 'Monoclonal antibody targeting amyloid beta plaques in Alzheimer\'s disease, showing modest but significant slowing of cognitive decline in clinical trials.',
    company: 'Biogen/Eisai',
    phase: 'FDA Approved',
    indication: 'Early Alzheimer\'s Disease',
    published_at: new Date().toISOString(),
    significance: 'High'
  },
  {
    name: 'Tirzepatide',
    description: 'Dual GIP and GLP-1 receptor agonist showing unprecedented efficacy for weight loss and type 2 diabetes management in clinical trials.',
    company: 'Eli Lilly',
    phase: 'Phase III',
    indication: 'Type 2 Diabetes, Obesity',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    significance: 'High'
  },
  {
    name: 'Enhertu (trastuzumab deruxtecan)',
    description: 'Antibody-drug conjugate showing significant survival benefits in HER2-low breast cancer, expanding treatment options beyond traditional HER2-positive disease.',
    company: 'AstraZeneca/Daiichi Sankyo',
    phase: 'FDA Approved',
    indication: 'HER2-low Breast Cancer',
    published_at: new Date(Date.now() - 172800000).toISOString(),
    significance: 'High'
  },
  {
    name: 'Donanemab',
    description: 'Monoclonal antibody that targets a modified form of deposited amyloid-β, showing promising results in slowing cognitive decline in early Alzheimer\'s disease.',
    company: 'Eli Lilly',
    phase: 'Phase III',
    indication: 'Early Alzheimer\'s Disease',
    published_at: new Date(Date.now() - 259200000).toISOString(),
    significance: 'Medium'
  },
  {
    name: 'CTX001 (exa-cel)',
    description: 'CRISPR-Cas9 gene-edited therapy for sickle cell disease and beta-thalassemia, showing durable transfusion independence in clinical trials.',
    company: 'CRISPR Therapeutics/Vertex',
    phase: 'Phase III',
    indication: 'Sickle Cell Disease, Beta-thalassemia',
    published_at: new Date(Date.now() - 345600000).toISOString(),
    significance: 'High'
  }
];

const caseData = [
  {
    title: 'Rare Presentation of Myocardial Infarction in Young Female',
    specialty: 'Cardiology',
    summary: 'A 28-year-old female presented with atypical chest pain and normal ECG but elevated troponin levels. This case highlights the importance of considering MI in young patients with atypical presentations.',
    key_learnings: [
      'Young women can present with atypical MI symptoms',
      'Normal ECG doesn\'t rule out MI',
      'High index of suspicion is crucial in young patients with risk factors'
    ],
    difficulty: 'Intermediate',
    read_time: 8,
    published_at: new Date().toISOString(),
    content: 'Full case study content would be here in a real implementation.'
  },
  {
    title: 'Neurological Manifestations of COVID-19: A Case Series',
    specialty: 'Neurology',
    summary: 'This case series presents five patients with diverse neurological manifestations following COVID-19 infection, ranging from Guillain-Barré syndrome to acute disseminated encephalomyelitis.',
    key_learnings: [
      'COVID-19 can present with primary neurological symptoms',
      'Neurological complications can occur even in mild COVID-19 cases',
      'Early recognition improves outcomes',
      'Multi-disciplinary approach is essential'
    ],
    difficulty: 'Advanced',
    read_time: 12,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    content: 'Full case study content would be here in a real implementation.'
  },
  {
    title: 'Unusual Presentation of Celiac Disease in an Elderly Patient',
    specialty: 'Gastroenterology',
    summary: 'A 72-year-old male presented with unexplained weight loss and neurological symptoms, eventually diagnosed with celiac disease. This case illustrates the varied and atypical presentation of celiac disease in elderly patients.',
    key_learnings: [
      'Celiac disease can first present in elderly patients',
      'Neurological symptoms may be the predominant presentation',
      'Consider celiac in unexplained weight loss and neurological symptoms',
      'Serological testing should be part of unexplained weight loss workup'
    ],
    difficulty: 'Intermediate',
    read_time: 10,
    published_at: new Date(Date.now() - 172800000).toISOString(),
    content: 'Full case study content would be here in a real implementation.'
  },
  {
    title: 'Management of Severe Hyperkalemia in a Patient with Multiple Comorbidities',
    specialty: 'Nephrology',
    summary: 'This case discusses the management challenges of severe hyperkalemia (K+ 7.8 mEq/L) in a 65-year-old patient with CKD, heart failure, and diabetes on multiple medications.',
    key_learnings: [
      'Rapid recognition and ECG assessment are critical in hyperkalemia',
      'Multiple treatment modalities may be required simultaneously',
      'Medication reconciliation is essential to identify contributing factors',
      'Close monitoring post-treatment is necessary to prevent rebound'
    ],
    difficulty: 'Advanced',
    read_time: 15,
    published_at: new Date(Date.now() - 259200000).toISOString(),
    content: 'Full case study content would be here in a real implementation.'
  },
  {
    title: 'Diagnostic Approach to Fever of Unknown Origin in a Returning Traveler',
    specialty: 'Infectious Disease',
    summary: 'A 34-year-old previously healthy male presented with persistent fever, fatigue, and mild hepatosplenomegaly three weeks after returning from a trip to Southeast Asia.',
    key_learnings: [
      'Systematic approach to fever in returning travelers',
      'Importance of detailed travel history and activities',
      'Role of specialized testing in tropical diseases',
      'When to start empiric therapy versus wait for definitive diagnosis'
    ],
    difficulty: 'Intermediate',
    read_time: 10,
    published_at: new Date(Date.now() - 345600000).toISOString(),
    content: 'Full case study content would be here in a real implementation.'
  }
];

// Main function to seed data
async function seedData() {
  console.log('Starting to seed research data...');

  try {
    // Check if tables exist and are accessible
    const { data: newsCheck, error: newsError } = await supabase
      .from('research_news')
      .select('count')
      .limit(1);
    
    if (newsError) {
      console.error('Supabase research tables are not accessible', newsError);
      return;
    }
    
    console.log('✅ Supabase research tables are accessible');

    // Get current data counts
    const { data: newsCount } = await supabase
      .from('research_news')
      .select('count')
      .limit(1);
    
    const { data: drugsCount } = await supabase
      .from('research_drugs')
      .select('count')
      .limit(1);
    
    const { data: casesCount } = await supabase
      .from('research_cases')
      .select('count')
      .limit(1);
    
    console.log(`Data counts: News (${newsCount?.[0]?.count || 0}), Drugs (${drugsCount?.[0]?.count || 0}), Cases (${casesCount?.[0]?.count || 0})`);

    // Only seed if tables are empty
    if (newsCount?.[0]?.count === 0) {
      // Insert news data
      const { data: newsResult, error: newsInsertError } = await supabase
        .from('research_news')
        .insert(newsData);
      
      if (newsInsertError) {
        console.error('Error inserting news data:', newsInsertError);
      } else {
        console.log('✅ News data inserted successfully');
      }
    } else {
      console.log('News data already exists, skipping insertion');
    }

    if (drugsCount?.[0]?.count === 0) {
      // Insert drug data
      const { data: drugsResult, error: drugsInsertError } = await supabase
        .from('research_drugs')
        .insert(drugData);
      
      if (drugsInsertError) {
        console.error('Error inserting drug data:', drugsInsertError);
      } else {
        console.log('✅ Drug data inserted successfully');
      }
    } else {
      console.log('Drug data already exists, skipping insertion');
    }

    if (casesCount?.[0]?.count === 0) {
      // Insert case data
      const { data: casesResult, error: casesInsertError } = await supabase
        .from('research_cases')
        .insert(caseData);
      
      if (casesInsertError) {
        console.error('Error inserting case data:', casesInsertError);
      } else {
        console.log('✅ Case data inserted successfully');
      }
    } else {
      console.log('Case data already exists, skipping insertion');
    }

    console.log('=== TEST RESULTS ===');
    console.log('OpenAI API:', process.env.VITE_OPENAI_API_KEY ? '✅ AVAILABLE' : '❌ FAILED');
    console.log('Supabase Research Tables:', '✅ WORKING');
    
    // Get final data counts
    const { data: finalNewsCount } = await supabase
      .from('research_news')
      .select('count')
      .limit(1);
    
    const { data: finalDrugsCount } = await supabase
      .from('research_drugs')
      .select('count')
      .limit(1);
    
    const { data: finalCasesCount } = await supabase
      .from('research_cases')
      .select('count')
      .limit(1);
    
    console.log(`Data counts: News (${finalNewsCount?.[0]?.count || 0}), Drugs (${finalDrugsCount?.[0]?.count || 0}), Cases (${finalCasesCount?.[0]?.count || 0})`);
    
    if (finalNewsCount?.[0]?.count === 0 && finalDrugsCount?.[0]?.count === 0 && finalCasesCount?.[0]?.count === 0) {
      console.log('⚠️ No data found in research tables. Consider running the seed script again or check for errors.');
    } else {
      console.log('✅ Some components are not working properly.');
      console.log('Research Insight will fall back to mock data for any failed components.');
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run the seed function
seedData();