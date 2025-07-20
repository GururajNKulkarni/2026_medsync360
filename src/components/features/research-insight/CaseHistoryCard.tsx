import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, GraduationCap, Lightbulb, ChevronRight, BookmarkPlus, Star } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useBookmarkContent, useTrackContentInteraction } from '../../../hooks/useResearchInsight';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import type { CaseHistory } from '../../../types/research.types';

interface CaseHistoryCardProps {
  caseHistory: CaseHistory;
}

export const CaseHistoryCard: React.FC<CaseHistoryCardProps> = ({ caseHistory }) => {
  const bookmarkMutation = useBookmarkContent();
  const trackInteraction = useTrackContentInteraction();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Advanced':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSpecialtyColor = (specialty: string) => {
    const colors = {
      'Cardiology': 'bg-blue-100 text-blue-700',
      'Infectious Disease': 'bg-purple-100 text-purple-700',
      'Neurology': 'bg-indigo-100 text-indigo-700',
      'Oncology': 'bg-red-100 text-red-700',
      'General': 'bg-gray-100 text-gray-700'
    };
    return colors[specialty as keyof typeof colors] || colors.General;
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({ 
      contentType: 'case', 
      contentId: caseHistory.id 
    });
    
    // Track interaction
    trackInteraction.mutate({
      contentType: 'case',
      contentId: caseHistory.id,
      interactionType: 'bookmark'
    });
  };

  const handleReadCase = () => {
    // Track interaction
    trackInteraction.mutate({
      contentType: 'case',
      contentId: caseHistory.id,
      interactionType: 'view'
    });
    
    // For now, just show a toast
    toast.success(`Reading case: ${caseHistory.title}`);
  };

  return (
    <Card variant="outlined" padding="lg" hoverable>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2">
                  {caseHistory.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getSpecialtyColor(caseHistory.specialty)
                  )}>
                    {caseHistory.specialty}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    getDifficultyColor(caseHistory.difficulty)
                  )}>
                    {caseHistory.difficulty}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBookmark} 
                className={cn(caseHistory.isBookmarked && "text-yellow-600")} 
                aria-label={caseHistory.isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"} 
                aria-pressed={caseHistory.isBookmarked}
              >
                {caseHistory.isBookmarked ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-neutral-700 text-sm leading-relaxed line-clamp-3">
          {caseHistory.summary}
        </p>

        {/* Key Learnings */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-neutral-900">Key Learnings</span>
          </div>
          <ul className="space-y-1 ml-6">
            {caseHistory.keyLearnings.slice(0, 2).map((learning, index) => (
              <li key={index} className="text-sm text-neutral-600 flex items-start">
                <span className="w-1 h-1 bg-neutral-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {learning}
              </li>
            ))}
            {caseHistory.keyLearnings.length > 2 && (
              <li className="text-xs text-neutral-500 ml-3">
                +{caseHistory.keyLearnings.length - 2} more insights
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center">
              <Clock size={12} className="mr-1" />
              <span>{caseHistory.readTime} min read</span>
            </div>
            <span>{formatDate(caseHistory.publishedAt)}</span>
          </div>
          
          <Button variant="outline" size="sm">
            <span className="mr-1">Read Case</span>
            <ChevronRight size={14} onClick={handleReadCase} />
          </Button>
        </div>
      </div>
    </Card>
  );
};