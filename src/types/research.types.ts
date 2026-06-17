// Research content types
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category: string;
  readTime: number;
  url: string;
  imageUrl?: string;
  isBookmarked?: boolean;
}

export interface DrugInvention {
  id: string;
  name: string;
  description: string;
  company: string;
  phase: string;
  indication: string;
  publishedAt: string;
  significance: 'High' | 'Medium' | 'Low';
  isBookmarked?: boolean;
}

export interface CaseHistory {
  id: string;
  title: string;
  specialty: string;
  summary: string;
  keyLearnings: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  readTime: number;
  publishedAt: string;
  isBookmarked?: boolean;
}

// API response types
export interface ResearchResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface ResearchFilters {
  categories?: string[];
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  significance?: 'High' | 'Medium' | 'Low';
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

// Bookmark types
export interface BookmarkRequest {
  contentType: 'news' | 'drug' | 'case';
  contentId: string;
}

// Analytics types
export interface ContentInteraction {
  contentType: 'news' | 'drug' | 'case';
  contentId: string;
  interactionType: 'view' | 'bookmark' | 'share' | 'download';
  duration?: number; // Time spent viewing in seconds
}