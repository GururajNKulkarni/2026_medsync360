import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';

interface ResearchFiltersProps {
  categories: string[];
  selectedCategories: string[]; 
  onCategoriesChange: (categories: string[]) => void;
  selectedDifficulty: string;
  onDifficultyChange: (difficulty: string) => void;
  selectedSignificance: string;
  onSignificanceChange: (significance: string) => void;
  selectedTimeRange: string;
  onTimeRangeChange: (timeRange: string) => void;
  onClose: () => void;
}

const significanceLevels = ['High', 'Medium', 'Low'];
const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];
const timeRanges = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 3 months' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All time' }
];

export const ResearchFilters: React.FC<ResearchFiltersProps> = ({
  categories,
  selectedCategories,
  onCategoriesChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedSignificance,
  onSignificanceChange,
  selectedTimeRange,
  onTimeRangeChange,
  onClose
}) => {
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const selectAll = () => {
    onCategoriesChange(categories);
  };

  const clearAll = () => {
    onCategoriesChange([]);
  };

  const handleApplyFilters = () => {
    // Close the modal - filters are already applied via state changes
    onClose();
  };

  return (
    <div className="space-y-6" role="dialog" aria-labelledby="filter-dialog-title">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 id="filter-dialog-title" className="text-lg font-semibold text-neutral-900">Filter Research Content</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Medical Specialties */}
      <div>
        <h4 className="font-medium text-neutral-900 mb-3">Medical Specialties</h4>
        <div className="max-h-48 overflow-y-auto space-y-2" role="group" aria-label="Medical specialties">
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category);
            
            return (
              <motion.button
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                )}
                aria-pressed={isSelected}
                role="switch"
              >
                <span className="font-medium">{category}</span>
                {isSelected && (
                  <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content Type */}
      <div>
        <h4 className="font-medium text-neutral-900 mb-3">Difficulty Level</h4>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty level">
          {difficultyLevels.map((level) => {
            const isSelected = selectedDifficulty === level;
            return (
              <button
                key={level}
                onClick={() => onDifficultyChange(isSelected ? '' : level)}
                className={cn(
                  "p-2 text-sm border rounded-lg transition-colors",
                  isSelected 
                    ? "bg-primary-50 border-primary-500 text-primary-700" 
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                )}
                aria-pressed={isSelected}
                role="radio"
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Significance Level */}
      <div>
        <h4 className="font-medium text-neutral-900 mb-3">Significance Level</h4>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Significance level">
          {significanceLevels.map((level) => {
            const isSelected = selectedSignificance === level;
            return (
              <button
                key={level}
                onClick={() => onSignificanceChange(isSelected ? '' : level)}
                className={cn(
                  "p-2 text-sm border rounded-lg transition-colors",
                  isSelected 
                    ? "bg-primary-50 border-primary-500 text-primary-700" 
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                )}
                aria-pressed={isSelected}
                role="radio"
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Time Range */}
      <div>
        <h4 className="font-medium text-neutral-900 mb-3">Time Range</h4>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Time range">
          {timeRanges.map((range) => {
            const isSelected = selectedTimeRange === range.value;
            return (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange(isSelected ? '' : range.value)}
                className={cn(
                  "p-2 text-sm border rounded-lg transition-colors",
                  isSelected 
                    ? "bg-primary-50 border-primary-500 text-primary-700" 
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                )}
                aria-pressed={isSelected}
                role="radio"
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <Card padding="sm" className="bg-neutral-50" aria-live="polite">
        <p className="text-sm text-neutral-600" id="filter-summary">
          {selectedCategories.length === 0 
            ? 'All specialties will be shown'
            : `${selectedCategories.length} specialt${selectedCategories.length !== 1 ? 'ies' : 'y'} selected`
          }
          {selectedDifficulty && `, Difficulty: ${selectedDifficulty}`}
          {selectedSignificance && `, Significance: ${selectedSignificance}`}
          {selectedTimeRange && `, Time: ${timeRanges.find(r => r.value === selectedTimeRange)?.label}`}
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 sm:flex-none"
          aria-label="Cancel and close dialog"
        >
          Cancel
        </Button>
        <Button
          onClick={handleApplyFilters}
          className="flex-1"
          aria-label="Apply filters"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};