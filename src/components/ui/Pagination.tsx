import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className
}) => {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const generatePagination = () => {
    // Always show first and last page
    const firstPage = 1;
    const lastPage = totalPages;
    
    // Calculate range of pages to show around current page
    const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPage);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPage);
    
    // Determine if we need to show ellipses
    const shouldShowLeftDots = leftSiblingIndex > firstPage + 1;
    const shouldShowRightDots = rightSiblingIndex < lastPage - 1;
    
    // Generate the array of page numbers to display
    const pageNumbers: (number | 'dots')[] = [];
    
    // Always add first page
    pageNumbers.push(firstPage);
    
    // Add left dots if needed
    if (shouldShowLeftDots) {
      pageNumbers.push('dots');
    }
    
    // Add pages around current page
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== firstPage && i !== lastPage) {
        pageNumbers.push(i);
      }
    }
    
    // Add right dots if needed
    if (shouldShowRightDots) {
      pageNumbers.push('dots');
    }
    
    // Always add last page if it's not the same as first page
    if (lastPage !== firstPage) {
      pageNumbers.push(lastPage);
    }
    
    return pageNumbers;
  };

  const pageNumbers = generatePagination();

  return (
    <nav 
      className={cn("flex justify-center items-center space-x-2", className)}
      role="navigation" 
      aria-label="Pagination"
    >
      {/* Previous Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </Button>
      
      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {pageNumbers.map((page, index) => {
          if (page === 'dots') {
            return (
              <span 
                key={`dots-${index}`} 
                className="px-2 py-1 text-neutral-500"
                aria-hidden="true"
              >
                <MoreHorizontal size={16} />
              </span>
            );
          }
          
          const isCurrentPage = page === currentPage;
          
          return (
            <Button
              key={page}
              variant={isCurrentPage ? "primary" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-current={isCurrentPage ? "page" : undefined}
              aria-label={`Page ${page}`}
              className={cn(
                "min-w-[36px]",
                isCurrentPage && "pointer-events-none"
              )}
            >
              {page}
            </Button>
          );
        })}
      </div>
      
      {/* Next Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
};

export default Pagination;