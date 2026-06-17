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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface CacheEntry {
  data: string;
  timestamp: number;
  tokens: number;
}

interface UsageStats {
  totalTokens: number;
  totalRequests: number;
  totalCost: number; // Estimated cost in USD
  lastReset: number;
}

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private maxRetries = 3; // Reduced for production
  private baseDelay = 1000; // 1 second
  
  // Production controls
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DAILY_TOKEN_LIMIT = 100000; // 100k tokens per day
  private readonly DAILY_REQUEST_LIMIT = 1000; // 1k requests per day
  private readonly MAX_TOKENS_PER_REQUEST = 1500; // Max tokens per request
  
  // Caching and rate limiting
  private cache = new Map<string, CacheEntry>();
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.loadUsageStats();
    this.startCleanupTimer();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getUsageStats(): UsageStats {
    const stored = localStorage.getItem('openai_usage_stats');
    if (stored) {
      try {
        const stats = JSON.parse(stored) as UsageStats;
        // Reset daily stats if it's a new day
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        if (stats.lastReset < oneDayAgo) {
          return {
            totalTokens: 0,
            totalRequests: 0,
            totalCost: 0,
            lastReset: now
          };
        }
        return stats;
      } catch {
        // Fall through to default
      }
    }
    
    return {
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
      lastReset: Date.now()
    };
  }

  private saveUsageStats(stats: UsageStats): void {
    try {
      localStorage.setItem('openai_usage_stats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to save usage stats:', error);
    }
  }

  private loadUsageStats(): void {
    // Initialize usage stats
    this.getUsageStats();
  }

  private updateUsageStats(tokens: number): void {
    const stats = this.getUsageStats();
    stats.totalTokens += tokens;
    stats.totalRequests += 1;
    
    // Estimate cost (GPT-3.5-turbo pricing: ~$0.002 per 1K tokens)
    const costPerToken = 0.000002;
    stats.totalCost += tokens * costPerToken;
    
    this.saveUsageStats(stats);
  }

  private startCleanupTimer(): void {
    // Clean cache every hour
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  private getCacheKey(prompt: string, options: any): string {
    return btoa(JSON.stringify({ prompt, options })).substring(0, 50);
  }

  private getFromCache(cacheKey: string): string | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    console.log(`Cache hit for key: ${cacheKey.substring(0, 10)}...`);
    return entry.data;
  }

  private setCache(cacheKey: string, data: string, tokens: number): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      tokens
    });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delayTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delayTime}ms`);
      await this.delay(delayTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private checkUsageLimits(): void {
    const stats = this.getUsageStats();
    
    if (stats.totalTokens >= this.DAILY_TOKEN_LIMIT) {
      throw new Error(`Daily token limit exceeded (${this.DAILY_TOKEN_LIMIT}). Usage resets in 24 hours.`);
    }
    
    if (stats.totalRequests >= this.DAILY_REQUEST_LIMIT) {
      throw new Error(`Daily request limit exceeded (${this.DAILY_REQUEST_LIMIT}). Usage resets in 24 hours.`);
    }
  }

  public getUsageSummary(): UsageStats & { 
    remainingTokens: number; 
    remainingRequests: number;
    cacheSize: number;
  } {
    const stats = this.getUsageStats();
    return {
      ...stats,
      remainingTokens: Math.max(0, this.DAILY_TOKEN_LIMIT - stats.totalTokens),
      remainingRequests: Math.max(0, this.DAILY_REQUEST_LIMIT - stats.totalRequests),
      cacheSize: this.cache.size
    };
  }

  private async makeRequestWithRetry(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    // Enforce rate limiting
    await this.enforceRateLimit();
    
    try {
      const response = await fetch(url, options);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : this.baseDelay * Math.pow(2, retryCount);
        
        console.warn(`OpenAI rate limit hit, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(delayMs);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      
      // Handle other retryable errors
      if (!response.ok && response.status >= 500 && retryCount < this.maxRetries) {
        const delayMs = this.baseDelay * Math.pow(2, retryCount);
        console.warn(`Server error ${response.status}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(delayMs);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      
      return response;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delayMs = this.baseDelay * Math.pow(2, retryCount);
        console.warn(`Network error, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries}):`, error);
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
    useCache?: boolean;
  } = {}): Promise<string> {
    const {
      model = 'gpt-3.5-turbo',
      maxTokens = Math.min(1000, this.MAX_TOKENS_PER_REQUEST), // Enforce limit
      temperature = 0.7,
      useCache = true
    } = options;

    // Check usage limits before making any request
    this.checkUsageLimits();

    // Generate cache key for this request
    const cacheKey = this.getCacheKey(prompt, { model, maxTokens, temperature });
    
    // Try to get from cache first (if enabled and temperature is low enough for consistent results)
    if (useCache && temperature <= 0.3) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('Returning cached OpenAI response');
        return cached;
      }
    }

    try {
      console.log(`Making OpenAI request: ${prompt.substring(0, 50)}... (${maxTokens} max tokens)`);
      
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
              content: 'You are a medical AI assistant providing accurate, evidence-based information. Keep responses concise and include appropriate medical disclaimers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature,
          // Add additional production parameters
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
          stop: null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Track usage
      const tokensUsed = data.usage?.total_tokens || maxTokens;
      this.updateUsageStats(tokensUsed);
      
      console.log(`OpenAI request completed: ${tokensUsed} tokens used`);
      
      // Cache the result (if caching enabled and temperature is low)
      if (useCache && temperature <= 0.3 && content) {
        this.setCache(cacheKey, content, tokensUsed);
      }
      
      return content;
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Provide more user-friendly error messages
      if (error.message.includes('429')) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a few minutes.');
      } else if (error.message.includes('401')) {
        throw new Error('OpenAI API key is invalid. Please check your configuration.');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI quota exceeded. Please check your account billing.');
      }
      
      throw new Error(`OpenAI service temporarily unavailable: ${error.message}`);
    }
  }

  async generateMedicalNews(specialty?: string): Promise<any[]> {
    const prompt = `Generate 2 concise medical news items for ${specialty || 'general medicine'}. 
    Format as JSON array with: title, summary (max 100 words), category, significance.
    Focus on recent FDA approvals, clinical trials, or treatment advances.
    Keep summaries factual and concise for medical professionals.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.2, // Lower for more consistent results
        maxTokens: 500, // Reduced tokens
        useCache: true
      });

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed.slice(0, 2) : []; // Limit to 2 items
      }
      
      return [];
    } catch (error) {
      console.error('Error generating medical news:', error);
      return [];
    }
  }

  async generateDrugInsights(indication?: string): Promise<any[]> {
    const prompt = `Generate 2 drug development insights for ${indication || 'various conditions'}.
    Format as JSON array with: name, description (max 80 words), company, phase, indication, significance.
    Focus on FDA-approved drugs or Phase III trials only.
    Keep descriptions concise and factual.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.2, // Lower for consistency
        maxTokens: 400, // Reduced tokens
        useCache: true
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed.slice(0, 2) : []; // Limit to 2 items
      }
      
      return [];
    } catch (error) {
      console.error('Error generating drug insights:', error);
      return [];
    }
  }

  async generateCaseStudy(specialty: string, difficulty: string): Promise<any> {
    const prompt = `Generate 1 medical case study for ${specialty} at ${difficulty} level.
    Format as JSON with: title, specialty, summary (max 120 words), keyLearnings (3 points max), difficulty, readTime.
    Make it educational and clinically relevant.
    Keep summary concise and focused.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.3, // Slightly higher for creativity but still consistent
        maxTokens: 350, // Reduced tokens
        useCache: true
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
    // Truncate input content to reduce token usage
    const truncatedContent = content.substring(0, Math.min(content.length, 1000));
    
    const prompt = `Summarize this medical content in ${maxLength} characters or less:

${truncatedContent}`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.1, // Very low for consistent summaries
        maxTokens: Math.min(Math.floor(maxLength / 2), 100), // Conservative token limit
        useCache: true
      });

      const summary = response.trim();
      return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
    } catch (error) {
      console.error('Error summarizing content:', error);
      // Fallback to simple truncation
      return content.substring(0, maxLength).trim() + '...';
    }
  }

  async generatePersonalizedRecommendations(userProfile: {
    department: string;
    role: string;
    interests?: string[];
  }): Promise<string[]> {
    const prompt = `Generate 3 personalized medical research recommendations for a ${userProfile.role} in ${userProfile.department}.
    Focus on recent advances and clinical guidelines.
    Format as JSON array of strings (max 40 words each).
    Make recommendations specific and actionable.`;

    try {
      const response = await this.generateCompletion(prompt, {
        temperature: 0.3, // Lower for more consistent recommendations
        maxTokens: 250, // Reduced tokens
        useCache: true
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : []; // Limit to 3 items
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

// Get usage statistics for monitoring
export const getOpenAIUsage = () => {
  if (!openAIService) {
    return {
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
      remainingTokens: 0,
      remainingRequests: 0,
      cacheSize: 0,
      available: false
    };
  }
  
  return {
    ...openAIService.getUsageSummary(),
    available: true
  };
};

// Clear cache manually (for admin purposes)
export const clearOpenAICache = (): boolean => {
  if (!openAIService) return false;
  
  try {
    // Access private cache through any typing
    (openAIService as any).cache.clear();
    console.log('OpenAI cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear OpenAI cache:', error);
    return false;
  }
};

// Test OpenAI connection
export const testOpenAIConnection = async (): Promise<{
  success: boolean;
  message: string;
  tokensUsed?: number;
}> => {
  if (!openAIService) {
    return {
      success: false,
      message: 'OpenAI service not available - API key missing or invalid'
    };
  }
  
  try {
    const testPrompt = 'Reply with exactly "OK" if you can read this message.';
    const response = await openAIService.generateCompletion(testPrompt, {
      maxTokens: 10,
      temperature: 0,
      useCache: false // Don't cache test requests
    });
    
    const success = response.trim().toLowerCase().includes('ok');
    return {
      success,
      message: success 
        ? 'OpenAI connection successful' 
        : `Unexpected response: ${response}`,
      tokensUsed: 10 // Estimate
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`
    };
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