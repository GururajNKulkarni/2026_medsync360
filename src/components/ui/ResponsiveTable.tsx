import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import { Card } from './Card';
import { cn } from '../../lib/utils';

interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  mobileHidden?: boolean; // Hide column on mobile
}

interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  mobileCardView?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

interface MobileCardProps<T> {
  data: T;
  columns: TableColumn<T>[];
  onClick?: () => void;
}

const MobileCard = <T,>({ data, columns, onClick }: MobileCardProps<T>) => {
  const visibleColumns = columns.filter(col => !col.mobileHidden);
  
  return (
    <Card 
      variant="outlined" 
      padding="md" 
      hoverable={!!onClick}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="space-y-2">
        {visibleColumns.map((column, index) => {
          const value = data[column.key];
          const displayValue = column.render ? column.render(value, data) : value;
          
          return (
            <div key={String(column.key)} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                {column.label}:
              </span>
              <span className={cn(
                "text-sm text-gray-900",
                column.align === 'center' && "text-center",
                column.align === 'right' && "text-right"
              )}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export const ResponsiveTable = <T,>({ 
  data, 
  columns, 
  loading = false,
  mobileCardView = true,
  onRowClick,
  emptyMessage = "No data available",
  className 
}: ResponsiveTableProps<T>) => {
  const { isMobile } = useResponsive();
  
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            {isMobile && mobileCardView ? (
              <Card padding="md">
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <div className="h-12 bg-gray-200 rounded"></div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="xl" className="text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile && mobileCardView) {
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <MobileCard 
              data={item} 
              columns={columns}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // Desktop/Tablet table view
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right",
                  column.sortable && "cursor-pointer hover:text-gray-700"
                )}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "hover:bg-gray-50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((column) => {
                const value = item[column.key];
                const displayValue = column.render ? column.render(value, item) : value;
                
                return (
                  <td
                    key={String(column.key)}
                    className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right"
                    )}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};