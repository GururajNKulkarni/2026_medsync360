import React from 'react';
import { motion } from 'framer-motion';
import { Pill, Building2, Calendar, AlertTriangle, CheckCircle, Clock, BookmarkPlus, Star, ExternalLink } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useBookmarkContent, useTrackContentInteraction } from '../../../hooks/useResearchInsight';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import type { DrugInvention } from '../../../types/research.types';

interface DrugInventionCardProps {
  drug: DrugInvention;
}

export const DrugInventionCard: React.FC<DrugInventionCardProps> = ({ drug }) => {
  const bookmarkMutation = useBookmarkContent();
  const trackInteraction = useTrackContentInteraction();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPhaseColor = (phase: string) => {
    if (phase.includes('FDA Approved')) return 'bg-green-100 text-green-700 border-green-200';
    if (phase.includes('Phase III')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (phase.includes('Phase II')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (phase.includes('Phase I')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getSignificanceIcon = (significance: string) => {
    switch (significance) {
      case 'High':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Medium':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({ 
      contentType: 'drug', 
      contentId: drug.id 
    });
    
    // Track interaction
    trackInteraction.mutate({
      contentType: 'drug',
      contentId: drug.id,
      interactionType: 'bookmark'
    });
  };

  return (
    <Card variant="outlined" padding="lg" hoverable>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Pill className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{drug.name}</h3>
              <p className="text-sm text-neutral-600">{drug.indication}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium border",
                getSignificanceColor(drug.significance)
              )}>
                <div className="flex items-center gap-1">
                  {getSignificanceIcon(drug.significance)}
                  {drug.significance} Impact
                </div>
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBookmark} 
              className={cn(drug.isBookmarked && "text-yellow-600")} 
              aria-label={drug.isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"} 
              aria-pressed={drug.isBookmarked}
            >
              {drug.isBookmarked ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
            </Button>
          </div>
        </div>

        {/* Description */}
        <p className="text-neutral-700 text-sm leading-relaxed">
          {drug.description}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Company</p>
              <p className="text-sm font-medium text-neutral-900">{drug.company}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Published</p>
              <p className="text-sm font-medium text-neutral-900">{formatDate(drug.publishedAt)}</p>
            </div>
          </div>
        </div>

        {/* Phase Badge */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100"> 
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-medium border",
              getPhaseColor(drug.phase)
            )}>
              {drug.phase}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              Drug Development Pipeline
            </span> 
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Track interaction
                trackInteraction.mutate({
                  contentType: 'drug',
                  contentId: drug.id,
                  interactionType: 'view'
                });
                
                // Open details or external link
                // For now, just show a toast
                toast.success(`Viewing details for ${drug.name}`);
              }}
              aria-label={`View details for ${drug.name}`}
            >
              <ExternalLink size={14} className="mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};