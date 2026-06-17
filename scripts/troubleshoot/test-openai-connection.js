// Test script for OpenAI API connection
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Test OpenAI API connection
async function testOpenAIConnection() {
  console.log('Starting OpenAI API connection test...');
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OpenAI API key not found in environment variables');
    return false;
  }
  
  if (!OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ OpenAI API key has invalid format (should start with "sk-")');
    return false;
  }
  
  try {
    console.log('Testing OpenAI API connection...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "OpenAI connection successful"'
          }
        ],
        max_tokens: 20
      })
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
      console.log('✅ OpenAI API connection successful');
      return true;
    } else {
      console.error('❌ OpenAI API connection failed:');
      console.error(data.error?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ OpenAI API connection failed:', error.message);
    return false;
  }
}

// Test Supabase connection and research tables
async function testSupabaseConnection() {
  console.log('\nTesting Supabase connection and research tables...');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment variables');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('research_news')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError.message);
      return false;
    }
    
    console.log('✅ Supabase research tables are accessible');
    
    // Get data counts
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
    
    console.log(`📊 Data counts: News (${newsCount?.[0]?.count || 0}), Drugs (${drugsCount?.[0]?.count || 0}), Cases (${casesCount?.[0]?.count || 0})`);
    
    if ((newsCount?.[0]?.count || 0) === 0 && 
        (drugsCount?.[0]?.count || 0) === 0 && 
        (casesCount?.[0]?.count || 0) === 0) {
      console.log('⚠️ No data found in research tables. Consider running the seed script:');
      console.log('npm run seed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== TEST RESULTS ===');
  const openAIResult = await testOpenAIConnection();
  const supabaseResult = await testSupabaseConnection();
  
  console.log('\n=== SUMMARY ===');
  console.log(`OpenAI API: ${openAIResult ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Supabase Research Tables: ${supabaseResult ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (!openAIResult) {
    console.log('\n⚠️ Some components are not working properly.');
    console.log('Research Insight will fall back to mock data for any failed components.');
    
    console.log('\nTo fix OpenAI API issues:');
    console.log('1. Verify your API key in the .env file');
    console.log('2. Check your OpenAI account status and billing');
    console.log('3. Ensure you have sufficient credits');
  }
}

runTests();