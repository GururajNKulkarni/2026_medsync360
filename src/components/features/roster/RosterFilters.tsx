import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';

interface RosterFiltersProps {
  departments: string[]; 
  selectedDepartments: string[];
  onDepartmentChange: (departments: string[]) => void;
  onClose: () => void;
}

export const RosterFilters: React.FC<RosterFiltersProps> = ({
  departments,
  selectedDepartments, 
  onDepartmentChange,
  onClose
}) => {
  const toggleDepartment = (department: string) => {
    if (selectedDepartments.includes(department)) {
      onDepartmentChange(selectedDepartments.filter(d => d !== department));
    } else {
      onDepartmentChange([...selectedDepartments, department]);
    }
  };

  const selectAll = () => {
    // Only select departments that actually have duties
    onDepartmentChange(departments);
  };

  const clearAll = () => {
    onDepartmentChange([]);
  };

  const applyFilters = () => {
    // Close the modal - the filters are already applied via onDepartmentsChange
    onClose();
  };

  return (
    <div className="space-y-6" role="dialog" aria-labelledby="filter-title">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 id="filter-title" className="text-lg font-semibold text-neutral-900">Filter by Departments</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Department List */}
      <div className="max-h-64 overflow-y-auto space-y-2" role="group" aria-label="Departments">
        {departments.map((department, index) => {
          const isSelected = selectedDepartments.includes(department);
           
          return (
            <motion.button
              key={department}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleDepartment(department)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 hover:border-neutral-300 text-neutral-700',
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              )}
              aria-pressed={isSelected}
              role="switch"
            >
              <span className="font-medium">{department}</span>
              {isSelected && (
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Summary */}
      <Card padding="sm" className="bg-neutral-50" aria-live="polite">
        <p className="text-sm text-neutral-600">
          {selectedDepartments.length === 0 
            ? 'All departments will be shown'
            : `${selectedDepartments.length} department${selectedDepartments.length !== 1 ? 's' : ''} selected`
          }
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          onClick={applyFilters}
          className="flex-1"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};