const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found or invalid. Research Insight features will use mock data.');
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private maxRetries = 7;
  private baseDelay = 3000; // 3 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequestWithRetry(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429 && retryCount < this.maxRetries) {
        const delayMs = this.baseDelay * Math.pow(2, retryCount);
        console.warn(`Rate limit hit, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(delayMs);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      
      return response;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delayMs = this.baseDelay * Math.pow(2, retryCount);
        console.warn(`Request failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(delayMs);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  async generateCompletion(prompt: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}): Promise<string> {
    const {
      model = 'gpt-3.5-turbo',
      maxTokens = 1000,
      temperature = 0.7
    } = options;

    try {
      const response = await this.makeRequestWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant that provides accurate, evidence-based medical information. Always include disclaimers about consulting healthcare professionals.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateMedicalNews(specialty?: string): Promise<any[]> {
    const prompt = `Generate 3 realistic medical news headlines and summaries for ${specialty || 'general medicine'}. 
    Format as JSON array with fields: title, summary, category, significance.
    Focus on recent breakthroughs, clinical trials, or treatment advances.
    Make them educational and relevant for medical professionals.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.8,
        maxTokens: 800
      });

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error generating medical news:', error);
      return [];
    }
  }

  async generateDrugInsights(indication?: string): Promise<any[]> {
    const prompt = `Generate 3 realistic drug development insights for ${indication || 'various medical conditions'}.
    Format as JSON array with fields: name, description, company, phase, indication, significance.
    Include recent FDA approvals, promising clinical trials, or novel mechanisms.
    Make them medically accurate and educational.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 800
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error generating drug insights:', error);
      return [];
    }
  }

  async generateCaseStudy(specialty: string, difficulty: string): Promise<any> {
    const prompt = `Generate a realistic medical case study for ${specialty} at ${difficulty} level.
    Format as JSON with fields: title, specialty, summary, keyLearnings (array), difficulty, readTime.
    Make it educational, clinically relevant, and appropriate for medical professionals.
    Include 3-4 key learning points.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.8,
        maxTokens: 600
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error generating case study:', error);
      return null;
    }
  }

  async summarizeContent(content: string, maxLength: number = 200): Promise<string> {
    const prompt = `Summarize the following medical content in ${maxLength} characters or less, maintaining key medical information:

${content}`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.5,
        maxTokens: Math.floor(maxLength / 3)
      });

      return response.trim();
    } catch (error) {
      console.error('Error summarizing content:', error);
      return content.substring(0, maxLength) + '...';
    }
  }

  async generatePersonalizedRecommendations(userProfile: {
    department: string;
    role: string;
    interests?: string[];
  }): Promise<string[]> {
    const prompt = `Generate 5 personalized medical research recommendations for a ${userProfile.role} in ${userProfile.department}.
    Focus on recent advances, clinical guidelines, and relevant research.
    Format as JSON array of strings.
    Make recommendations specific and actionable.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 400
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }
}

// Create singleton instance
export const openAIService = OPENAI_API_KEY ? new OpenAIService(OPENAI_API_KEY) : null;

// Utility functions
export const isOpenAIAvailable = (): boolean => {
  try {
    // Check if API key exists and has valid format (starts with "sk-")
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      return false;
    }
    
    // Check if service is initialized
    return !!openAIService;
  } catch (error) {
    console.error('Error checking OpenAI availability:', error);
    return false;
  }
};

export const generateMedicalContent = async (type: 'news' | 'drugs' | 'cases', params?: any) => {
  if (!openAIService) {
    throw new Error('OpenAI service not available');
  }

  switch (type) {
    case 'news':
      return await openAIService.generateMedicalNews(params?.specialty);
    case 'drugs':
      return await openAIService.generateDrugInsights(params?.indication);
    case 'cases':
      return await openAIService.generateCaseStudy(params?.specialty, params?.difficulty);
    default:
      throw new Error(`Unknown content type: ${type}`);
  }
};