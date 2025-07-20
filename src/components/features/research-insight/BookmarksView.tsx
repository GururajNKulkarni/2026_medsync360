import React from 'react';
import { motion } from 'framer-motion';
import { Bookmark, FileText, Pill, Newspaper, Trash2, Filter } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NewsCard } from './NewsCard';
import { DrugInventionCard } from './DrugInventionCard';
import { CaseHistoryCard } from './CaseHistoryCard';
import { useUserBookmarks } from '../../../hooks/useResearchInsight';
import { useAuthStore } from '../../../store/authStore';
import { cn } from '../../../lib/utils';

interface BookmarksViewProps {
  onClose: () => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({ onClose }) => {
  const { profile } = useAuthStore();
  const { data: bookmarks = [], isLoading } = useUserBookmarks();
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'news' | 'drugs' | 'cases'>('all');
  
  // Group bookmarks by content type
  const newsBookmarks = bookmarks.filter(b => b.content_type === 'news');
  const drugBookmarks = bookmarks.filter(b => b.content_type === 'drug');
  const caseBookmarks = bookmarks.filter(b => b.content_type === 'case');
  
  // Filter bookmarks based on active filter
  const filteredBookmarks = activeFilter === 'all' 
    ? bookmarks 
    : activeFilter === 'news' 
      ? newsBookmarks 
      : activeFilter === 'drugs' 
        ? drugBookmarks 
        : caseBookmarks;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (bookmarks.length === 0) {
    return (
      <Card padding="xl" className="text-center">
        <Bookmark className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No Bookmarks Yet</h3>
        <p className="text-neutral-600 mb-4">
          You haven't bookmarked any research content yet. Click the bookmark icon on any item to save it for later.
        </p>
        <Button onClick={onClose}>
          Browse Research Content
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center">
          <Bookmark className="w-5 h-5 mr-2 text-primary-600" />
          Your Bookmarks
        </h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          Back to Research
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
          className="flex items-center gap-1"
        >
          <Filter size={14} />
          All ({bookmarks.length})
        </Button>
        <Button
          variant={activeFilter === 'news' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('news')}
          className="flex items-center gap-1"
        >
          <Newspaper size={14} />
          News ({newsBookmarks.length})
        </Button>
        <Button
          variant={activeFilter === 'drugs' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('drugs')}
          className="flex items-center gap-1"
        >
          <Pill size={14} />
          Drugs ({drugBookmarks.length})
        </Button>
        <Button
          variant={activeFilter === 'cases' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('cases')}
          className="flex items-center gap-1"
        >
          <FileText size={14} />
          Cases ({caseBookmarks.length})
        </Button>
      </div>
      
      {/* Bookmarked Content */}
      <div className="space-y-4">
        {filteredBookmarks.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-neutral-600">No bookmarks in this category</p>
          </Card>
        ) : (
          filteredBookmarks.map((bookmark, index) => (
            <motion.div
              key={bookmark.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Render appropriate card based on content type */}
              {bookmark.content_type === 'news' && (
                <NewsCard news={{
                  id: bookmark.content_id,
                  title: 'Bookmarked News Article',
                  summary: 'This is a placeholder for a bookmarked news article.',
                  source: 'Medical Journal',
                  publishedAt: bookmark.created_at,
                  category: 'General',
                  readTime: 5,
                  url: '#',
                  isBookmarked: true
                }} />
              )}
              
              {bookmark.content_type === 'drug' && (
                <DrugInventionCard drug={{
                  id: bookmark.content_id,
                  name: 'Bookmarked Drug',
                  description: 'This is a placeholder for a bookmarked drug.',
                  company: 'Pharmaceutical Company',
                  phase: 'Phase II',
                  indication: 'General',
                  publishedAt: bookmark.created_at,
                  significance: 'Medium',
                  isBookmarked: true
                }} />
              )}
              
              {bookmark.content_type === 'case' && (
                <CaseHistoryCard caseHistory={{
                  id: bookmark.content_id,
                  title: 'Bookmarked Case Study',
                  specialty: 'General Medicine',
                  summary: 'This is a placeholder for a bookmarked case study.',
                  keyLearnings: ['Important clinical insight'],
                  difficulty: 'Intermediate',
                  readTime: 10,
                  publishedAt: bookmark.created_at,
                  isBookmarked: true
                }} />
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarksView;