import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, Star, TrendingUp, Sparkles, BookmarkPlus } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useBookmarkContent, useTrackContentInteraction } from '../../../hooks/useResearchInsight';
import { openAIService, isOpenAIAvailable } from '../../../lib/openai';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import type { NewsItem } from '../../../types/research.types';

interface NewsCardProps {
  news: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news }) => {
  const bookmarkMutation = useBookmarkContent();
  const trackInteraction = useTrackContentInteraction();
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Neurology': 'bg-purple-100 text-purple-700',
      'Oncology': 'bg-red-100 text-red-700',
      'Cardiology': 'bg-blue-100 text-blue-700',
      'Ophthalmology': 'bg-green-100 text-green-700',
      'General': 'bg-gray-100 text-gray-700'
    };
    return colors[category as keyof typeof colors] || colors.General;
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({ 
      contentType: 'news', 
      contentId: news.id 
    });
    
    // Track interaction
    trackInteraction.mutate({
      contentType: 'news',
      contentId: news.id,
      interactionType: 'bookmark'
    });
  };

  const handleSummarize = async () => {
    if (!isOpenAIAvailable() || !openAIService) {
      toast.error('AI summarization not available');
      return;
    }

    setSummarizing(true);
    try {
      const aiSummary = await openAIService.summarizeContent(news.summary, 150);
      setSummary(aiSummary);
      
      // Track interaction
      trackInteraction.mutate({
        contentType: 'news',
        contentId: news.id,
        interactionType: 'view',
        duration: 30 // Assumed duration
      });
      
      toast.success('Summary generated!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };
  return (
    <Card variant="outlined" padding="none" hoverable>
      <div className="flex flex-col md:flex-row">
        {/* Image with accessibility */}
        {news.imageUrl && (
          <div className="md:w-48 h-48 md:h-auto">
            <img
              src={news.imageUrl}
              alt={news.title}
              className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none" 
              loading="lazy"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getCategoryColor(news.category)
              )}>
                {news.category}
              </span>
              <div className="flex items-center text-xs text-neutral-500">
                <TrendingUp size={12} className="mr-1" />
                <span>Trending</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isOpenAIAvailable() && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBookmark} 
                  className={cn(news.isBookmarked && "text-yellow-600")} 
                  aria-label={news.isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"} 
                  aria-pressed={news.isBookmarked}
                  title="AI Summary"
                >
                  {news.isBookmarked ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBookmark}
                className={cn(news.isBookmarked && "text-yellow-600")}
              >
                {news.isBookmarked ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
              </Button>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2">
            {news.title}
          </h3>
          
          <div className="mb-4">
            <p className="text-neutral-600 text-sm line-clamp-3">
              {summary || news.summary}
            </p>
            {summary && (
              <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                <Sparkles size={12} />
                <span>AI Summary</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="font-medium">{news.source}</span>
              <div className="flex items-center">
                <Clock size={12} className="mr-1" />
                <span>{news.readTime} min read</span>
              </div>
              <span>{formatDate(news.publishedAt)}</span>
            </div>
            
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(news.url, '_blank');
                  
                  // Track interaction
                  trackInteraction.mutate({
                    contentType: 'news',
                    contentId: news.id,
                    interactionType: 'view'
                  });
                }}
                aria-label={`Read more about ${news.title}`}
              >
                <ExternalLink size={14} className="mr-1" />
                Read More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};