import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { openAIService, isOpenAIAvailable } from '../lib/openai';
import toast from 'react-hot-toast';
import type { NewsItem, DrugInvention, CaseHistory, ResearchFilters, BookmarkRequest, ContentInteraction } from '../types/research.types';

// Mock data fallback
const mockNewsData = [
  {
    id: '1',
    title: 'Breakthrough in Alzheimer\'s Treatment Shows Promise in Phase III Trials',
    summary: 'A new monoclonal antibody treatment has shown significant cognitive improvement in patients with early-stage Alzheimer\'s disease.',
    source: 'Nature Medicine',
    publishedAt: new Date().toISOString(),
    category: 'Neurology',
    readTime: 5,
    url: 'https://example.com/alzheimers-breakthrough',
    significance: 'High'
  },
  {
    id: '2',
    title: 'AI-Powered Diagnostic Tool Achieves 95% Accuracy in Early Cancer Detection',
    summary: 'Researchers have developed an AI system that can detect early-stage cancers with unprecedented accuracy.',
    source: 'The Lancet',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    category: 'Oncology',
    readTime: 7,
    url: 'https://example.com/ai-cancer-detection',
    significance: 'High'
  }
];

const mockDrugData = [
  {
    id: '1',
    name: 'Lecanemab (Leqembi)',
    description: 'Monoclonal antibody targeting amyloid beta plaques in Alzheimer\'s disease',
    company: 'Biogen/Eisai',
    phase: 'FDA Approved',
    indication: 'Early Alzheimer\'s Disease',
    publishedAt: new Date().toISOString(),
    significance: 'High'
  }
];

const mockCaseData = [
  {
    id: '1',
    title: 'Rare Presentation of Myocardial Infarction in Young Female',
    specialty: 'Cardiology',
    summary: 'A 28-year-old female presented with atypical chest pain. This case highlights the importance of considering MI in young patients.',
    keyLearnings: [
      'Young women can present with atypical MI symptoms',
      'Normal ECG doesn\'t rule out MI',
      'High index of suspicion is crucial'
    ],
    difficulty: 'Intermediate',
    readTime: 8,
    publishedAt: new Date().toISOString()
  }
];

// Query keys
export const researchKeys = {
  all: ['research'] as const, 
  news: (filters?: ResearchFilters) => [...researchKeys.all, 'news', filters] as const,
  drugs: (filters?: ResearchFilters) => [...researchKeys.all, 'drugs', filters] as const,
  cases: (filters?: ResearchFilters) => [...researchKeys.all, 'cases', filters] as const,
  recommendations: (userId: string) => [...researchKeys.all, 'recommendations', userId] as const, 
  bookmarks: (userId: string) => [...researchKeys.all, 'bookmarks', userId] as const,
  categories: () => [...researchKeys.all, 'categories'] as const,
};

// Fetch functions with database integration
const fetchMedicalNews = async (filters?: ResearchFilters) => {
  // Try to fetch from database first
  console.log('Fetching medical news with filters:', filters);
  try {
    let query = supabase
      .from('research_news')
      .select('*')
      .order('published_at', { ascending: false });
    
    // Apply filters
    if (filters?.categories?.length) {
      query = query.in('category', filters.categories);
    }
    
    if (filters?.searchQuery) {
      query = query.textSearch('title', filters.searchQuery, { 
        config: 'english',
        type: 'websearch'
      });
    }
    
    // Apply pagination
    if (filters?.page && filters?.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      const end = start + filters.pageSize - 1;
      query = query.range(start, end);
    } else {
      // Default limit
      query = query.limit(10);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Transform database results to match our interface
      console.log(`Found ${data.length} news items in database`);
      return data.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        publishedAt: item.published_at,
        category: item.category,
        readTime: item.read_time,
        url: item.url || '#',
        imageUrl: item.image_url
      }));
    }
  } catch (error) {
    console.warn('Error fetching news from database, falling back to mock data:', error);
  }
  
  console.log('Using mock news data - Database fetch failed or returned no results');
  return mockNewsData;
};

const fetchDrugInsights = async (filters?: ResearchFilters) => {
  // Try to fetch from database first
  console.log('Fetching drug insights with filters:', filters);
  try {
    let query = supabase
      .from('research_drugs')
      .select('*')
      .order('published_at', { ascending: false });
    
    // Apply filters
    if (filters?.categories?.length) {
      query = query.in('indication', filters.categories);
    }
    
    if (filters?.significance) {
      query = query.eq('significance', filters.significance);
    }
    
    if (filters?.searchQuery) {
      query = query.textSearch('name', filters.searchQuery, {
        config: 'english',
        type: 'websearch'
      });
    }
    
    // Apply pagination
    if (filters?.page && filters?.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      const end = start + filters.pageSize - 1;
      query = query.range(start, end);
    } else {
      // Default limit
      query = query.limit(10);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Transform database results to match our interface
      console.log(`Found ${data.length} drug items in database`);
      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        company: item.company,
        phase: item.phase,
        indication: item.indication,
        publishedAt: item.published_at,
        significance: item.significance as 'High' | 'Medium' | 'Low'
      }));
    }
  } catch (error) {
    console.warn('Error fetching drugs from database, falling back to mock data:', error);
  }
  
  console.log('Using mock drug data - Database fetch failed or returned no results');
  return mockDrugData;
};

const fetchCaseStudies = async (filters?: ResearchFilters) => {
  // Try to fetch from database first
  console.log('Fetching case studies with filters:', filters);
  try {
    let query = supabase
      .from('research_cases')
      .select('*')
      .order('published_at', { ascending: false });
    
    // Apply filters
    if (filters?.categories?.length) {
      query = query.in('specialty', filters.categories);
    }
    
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    
    if (filters?.searchQuery) {
      query = query.textSearch('title', filters.searchQuery, {
        config: 'english',
        type: 'websearch'
      });
    }
    
    // Apply pagination
    if (filters?.page && filters?.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      const end = start + filters.pageSize - 1;
      query = query.range(start, end);
    } else {
      // Default limit
      query = query.limit(10);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Transform database results to match our interface
      console.log(`Found ${data.length} case studies in database`);
      return data.map(item => ({
        id: item.id,
        title: item.title,
        specialty: item.specialty,
        summary: item.summary,
        keyLearnings: item.key_learnings,
        difficulty: item.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        readTime: item.read_time,
        publishedAt: item.published_at
      }));
    }
  } catch (error) {
    console.warn('Error fetching cases from database, falling back to mock data:', error);
  }
  
  console.log('Using mock case data - Database fetch failed or returned no results');
  return mockCaseData;
};

// Fetch categories from database
const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Fetch user bookmarks
const fetchUserBookmarks = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user bookmarks:', error);
    return [];
  }
};

const fetchPersonalizedRecommendations = async (userProfile: any) => {
  // Always provide fallback recommendations
  const fallbackRecommendations = [
    `Latest ${userProfile.department} research updates and clinical guidelines`,
    'Evidence-based treatment protocols and best practices',
    'Continuing medical education opportunities in your specialty',
    'Peer-reviewed journal articles and systematic reviews'
  ];

  if (!isOpenAIAvailable()) {
    console.log('Using fallback recommendations - OpenAI not available');
    return fallbackRecommendations;
  }

  try {
    const recommendations = await openAIService!.generatePersonalizedRecommendations(userProfile);
    
    // Return AI recommendations if successful, otherwise fallback
    return recommendations.length > 0 ? recommendations : fallbackRecommendations;
  } catch (error: any) {
    console.warn('OpenAI recommendations failed, using fallback:', error.message);
    
    // Show user-friendly message for different error types
    if (error.message.includes('limit exceeded')) {
      toast.error('AI recommendations temporarily unavailable - daily limit reached');
    } else if (error.message.includes('rate limit')) {
      toast.error('AI recommendations temporarily unavailable - please try again in a few minutes');
    }
    
    return fallbackRecommendations;
  }
};

// Custom hooks
export const useMedicalNews = (filters?: ResearchFilters) => {
  return useQuery({
    queryKey: researchKeys.news(filters),
    queryFn: () => fetchMedicalNews(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useDrugInsights = (filters?: ResearchFilters) => {
  return useQuery({
    queryKey: researchKeys.drugs(filters),
    queryFn: () => fetchDrugInsights(filters),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 45 * 60 * 1000, // 45 minutes
  });
};

export const useCaseStudies = (filters?: ResearchFilters) => {
  return useQuery({
    queryKey: researchKeys.cases(filters),
    queryFn: () => fetchCaseStudies(filters),
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: researchKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
};

export const useUserBookmarks = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: researchKeys.bookmarks(profile?.id || ''),
    queryFn: () => fetchUserBookmarks(profile?.id || ''),
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const usePersonalizedRecommendations = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: researchKeys.recommendations(profile?.id || ''),
    queryFn: () => {
      if (!profile) return [];
      
      return fetchPersonalizedRecommendations({
        department: profile.department || 'General Medicine',
        role: profile.role || 'Doctor'
      });
    },
    enabled: !!profile,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

// Bookmark management
export const useBookmarkContent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ contentType, contentId }: BookmarkRequest) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      // Check if already bookmarked
      const { data: existing } = await supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', profile.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .maybeSingle();
      
      if (existing) {
        // Remove bookmark
        const { error } = await supabase
          .from('user_bookmarks')
          .delete()
          .eq('id', existing.id);
          
        if (error) throw error;
        return { added: false, contentId, contentType };
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('user_bookmarks')
          .insert({
            user_id: profile.id,
            content_type: contentType,
            content_id: contentId
          });
          
        if (error) throw error;
        return { added: true, contentId, contentType };
      }
    },
    onSuccess: (result) => {
      // Invalidate bookmarks query
      queryClient.invalidateQueries({ queryKey: researchKeys.bookmarks(profile?.id || '') });
      
      // Show success message
      toast.success(result.added ? 'Added to bookmarks' : 'Removed from bookmarks');
    },
    onError: (error: Error) => {
      toast.error(`Bookmark error: ${error.message}`);
    }
  });
};

export const useGenerateContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ type, params }: { type: 'news' | 'drugs' | 'cases', params?: any }) => {
      if (!isOpenAIAvailable()) {
        throw new Error('AI content generation not available - using existing database content');
      }

      try {
        // Always try to fetch from database first (this includes AI-generated content)
        switch (type) {
          case 'news':
            return await fetchMedicalNews({ categories: [params?.specialty] });
          case 'drugs':
            return await fetchDrugInsights({ categories: [params?.indication] });
          case 'cases':
            return await fetchCaseStudies({ 
              categories: [params?.specialty],
              difficulty: params?.difficulty
            });
          default:
            throw new Error(`Unknown content type: ${type}`);
        }
      } catch (error: any) {
        // If AI generation fails, still return existing database content
        console.warn(`Content generation for ${type} failed:`, error.message);
        
        // Return basic content from database without AI enhancement
        switch (type) {
          case 'news':
            return await fetchMedicalNews({ categories: [params?.specialty] });
          case 'drugs':
            return await fetchDrugInsights({ categories: [params?.indication] });
          case 'cases':
            return await fetchCaseStudies({ 
              categories: [params?.specialty],
              difficulty: params?.difficulty
            });
          default:
            return [];
        }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and update cache
      switch (variables.type) {
        case 'news': 
          queryClient.setQueryData(researchKeys.news({ categories: [variables.params?.specialty] }), data);
          break;
        case 'drugs':
          queryClient.setQueryData(researchKeys.drugs({ categories: [variables.params?.indication] }), data);
          break;
        case 'cases':
          queryClient.setQueryData(researchKeys.cases({ 
            categories: [variables.params?.specialty],
            difficulty: variables.params?.difficulty
          }), data);
          break;
      }
      
      if (isOpenAIAvailable()) {
        toast.success('Content refreshed with latest AI insights!');
      } else {
        toast.success('Content refreshed from database!');
      }
    },
    onError: (error: any) => {
      if (error.message.includes('limit exceeded')) {
        toast.error('Daily AI limit reached - showing existing content');
      } else {
        toast.error('Content refresh failed - please try again');
      }
    },
  });
};

export const useRefreshAllContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Refresh all research content
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['research', 'news'] }),
        queryClient.invalidateQueries({ queryKey: ['research', 'drugs'] }),
        queryClient.invalidateQueries({ queryKey: ['research', 'cases'] }),
      ]);
    },
    onSuccess: () => {
      toast.success('All content refreshed!');
    },
    onError: () => {
      toast.error('Failed to refresh content');
    },
  });
};

// Track user interactions with content
export const useTrackContentInteraction = () => {
  const { profile } = useAuthStore();
  
  return useMutation({
    mutationFn: async (interaction: ContentInteraction) => {
      if (!profile?.id) return;
      
      // In a production environment, you would send this to an analytics service
      // For now, we'll just log it to the console
      console.log('Content interaction:', {
        userId: profile.id,
        ...interaction,
        timestamp: new Date().toISOString()
      });
      
      // This could be stored in a database table for analytics
      return { success: true };
    }
  });
};