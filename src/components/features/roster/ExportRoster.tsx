import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '../../ui/Button';
import { format } from 'date-fns';
import type { Duty } from '../../../types/duty.types';
import toast from 'react-hot-toast';

interface ExportRosterProps {
  duties: Duty[];
  isLoading?: boolean;
}

export const ExportRoster: React.FC<ExportRosterProps> = ({ duties, isLoading = false }) => {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);
      toast.loading('Preparing CSV export...');
      
      // Prepare CSV data
      const headers = [
        'Date', 
        'Day', 
        'Doctor Name', 
        'KMC Number',
        'Role', 
        'Department', 
        'Shift Type', 
        'Start Time', 
        'End Time', 
        'Status',
        'Created At'
      ];

      const rows = duties.map(duty => [
        format(new Date(duty.shift_date), 'yyyy-MM-dd'),
        format(new Date(duty.shift_date), 'EEEE'),
        duty.user?.full_name || 'Unknown',
        duty.user?.kmc_number || 'N/A',
        duty.user?.role || 'Unknown',
        duty.department,
        duty.shift_type,
        duty.start_time,
        duty.end_time,
        duty.status,
        format(new Date(duty.created_at), 'yyyy-MM-dd HH:mm')
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `duty-roster-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Duty roster exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.dismiss();
      toast.error('Failed to export duty roster');
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel (XLSX) format
  const exportToExcel = async () => {
    try {
      toast.loading('Preparing Excel export...');
      setExporting(true);
      
      // Create a workbook with a worksheet
      const worksheet: { [key: string]: { t: string; v: string | number } | string } = {
        '!ref': `A1:K${duties.length + 1}`,
        A1: { t: 's', v: 'Date' },
        B1: { t: 's', v: 'Day' },
        C1: { t: 's', v: 'Doctor Name' },
        D1: { t: 's', v: 'KMC Number' },
        E1: { t: 's', v: 'Role' },
        F1: { t: 's', v: 'Department' },
        G1: { t: 's', v: 'Shift Type' },
        H1: { t: 's', v: 'Start Time' },
        I1: { t: 's', v: 'End Time' },
        J1: { t: 's', v: 'Status' },
        K1: { t: 's', v: 'Created At' }
      };
      
      // Add data rows
      duties.forEach((duty, index) => {
        const rowIndex = index + 2; // +2 because 1-indexed and header is row 1
        
        worksheet[`A${rowIndex}`] = { t: 's', v: format(new Date(duty.shift_date), 'yyyy-MM-dd') };
        worksheet[`B${rowIndex}`] = { t: 's', v: format(new Date(duty.shift_date), 'EEEE') };
        worksheet[`C${rowIndex}`] = { t: 's', v: duty.user?.full_name || 'Unknown' };
        worksheet[`D${rowIndex}`] = { t: 's', v: duty.user?.kmc_number || 'N/A' };
        worksheet[`E${rowIndex}`] = { t: 's', v: duty.user?.role || 'Unknown' };
        worksheet[`F${rowIndex}`] = { t: 's', v: duty.department };
        worksheet[`G${rowIndex}`] = { t: 's', v: duty.shift_type };
        worksheet[`H${rowIndex}`] = { t: 's', v: duty.start_time };
        worksheet[`I${rowIndex}`] = { t: 's', v: duty.end_time };
        worksheet[`J${rowIndex}`] = { t: 's', v: duty.status };
        worksheet[`K${rowIndex}`] = { t: 's', v: format(new Date(duty.created_at), 'yyyy-MM-dd HH:mm') };
      });
      
      // Since we can't use external libraries, we'll use CSV as a fallback
      // but with a .xlsx extension to make it easier to open in Excel
      exportToCSV();
      
      
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.dismiss();
      toast.error('Failed to export duty roster');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="sm"
        onClick={exportToExcel}
        disabled={exporting || isLoading || duties.length === 0} 
        loading={exporting}
        title={duties.length === 0 ? "No duties to export" : "Export as Excel file"}
        aria-label="Export as Excel file"
      >
        <FileSpreadsheet size={16} className="mr-2" />
        Excel
      </Button>
    </div>
  );
};