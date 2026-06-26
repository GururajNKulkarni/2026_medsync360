import React, { useRef, useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '../../ui/Button';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { ShiftType } from '../../../types/duty.types';

interface BulkUploadRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftConfigs: Record<ShiftType, { start: string; end: string }>;
}

interface RowResult {
  row: number;
  kmcNumber: string;
  doctorName: string;
  date: string;
  status: 'created' | 'skipped';
  reason?: string;
}

interface PreparedRow {
  rowNum: number;
  kmcNumber: string;
  doctorName: string;
  userId: string;
  department: string;
  shiftDate: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
}

type Stage = 'idle' | 'parsing' | 'preview' | 'submitting' | 'done';

const SHIFT_TYPE_ALIASES: Record<string, ShiftType> = {
  day: 'Day',
  afternoon: 'Afternoon',
  night: 'Night',
};

// 20 unique doctors x up to 31 days each is a legitimate full-month upload
// (~620 rows); this is just a backstop against a malformed/runaway file.
const MAX_ROWS = 750;
const MAX_DOCTORS = 20;

const parseFileDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const asDate = new Date(parsed.y, parsed.m - 1, parsed.d);
    return isNaN(asDate.getTime()) ? null : asDate;
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    const isoAttempt = new Date(trimmed);
    if (!isNaN(isoAttempt.getTime())) return isoAttempt;

    const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (match) {
      const [, d, m, y] = match;
      const year = y.length === 2 ? 2000 + Number(y) : Number(y);
      const asDate = new Date(year, Number(m) - 1, Number(d));
      if (!isNaN(asDate.getTime())) return asDate;
    }
  }
  return null;
};

const downloadTemplate = () => {
  const wsData = [
    ['Date', 'Day', 'Doctor Name', 'KMC Number', 'Role', 'Department', 'Shift Type'],
    ['2026-07-01', 'Optional Data', 'Guru Hublikar', 'KMC112290', 'Optional Data', 'Optional Data', 'Day'],
    ['2026-07-04', 'Optional Data', 'Karuna Belagavi', 'KMC090877', 'Optional Data', 'Optional Data', 'Night'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'duty-roster-template');
  XLSX.writeFile(wb, 'duty-roster-template.xlsx');
};

export const BulkUploadRosterModal: React.FC<BulkUploadRosterModalProps> = ({ isOpen, onClose, shiftConfigs }) => {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [readyRows, setReadyRows] = useState<PreparedRow[]>([]);
  const [skippedRows, setSkippedRows] = useState<RowResult[]>([]);
  const [finalResults, setFinalResults] = useState<RowResult[] | null>(null);

  const resetAll = () => {
    setStage('idle');
    setFileName('');
    setReadyRows([]);
    setSkippedRows([]);
    setFinalResults(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const parseFile = async (file: File) => {
    const appRole = (profile as any)?.app_role;
    const hospitalId = (profile as any)?.hospital_id;

    if (appRole !== 'superuser') {
      toast.error('Only a superuser can bulk-upload the duty roster.');
      return;
    }
    if (!hospitalId) {
      toast.error('Your hospital is not set on your profile.');
      return;
    }

    setFileName(file.name);
    setFinalResults(null);
    setStage('parsing');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (rows.length === 0) {
        toast.error('The file has no data rows.');
        setStage('idle');
        return;
      }
      if (rows.length > MAX_ROWS) {
        toast.error(`Please upload ${MAX_ROWS} rows or fewer at a time.`);
        setStage('idle');
        return;
      }

      const kmcNumbers = Array.from(
        new Set(rows.map((r) => String(r['KMC Number'] || '').trim()).filter(Boolean))
      );

      // Cap blast radius: a bad file can disrupt at most MAX_DOCTORS
      // doctors' schedules, regardless of department. Reject the whole
      // upload upfront rather than silently processing a partial set.
      if (kmcNumbers.length > MAX_DOCTORS) {
        toast.error(`This file lists ${kmcNumbers.length} unique doctors — bulk upload is limited to ${MAX_DOCTORS} per file. Split it into smaller batches.`);
        setStage('idle');
        return;
      }

      // Scoped to the uploader's own hospital — a KMC number that belongs to
      // someone at a different hospital is treated as not found, same as a
      // KMC that doesn't exist anywhere. Don't leak other hospitals' doctor
      // names to this superuser.
      const { data: matchedUsers, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, department, kmc_number, hospital_id, is_active')
        .eq('hospital_id', hospitalId)
        .in('kmc_number', kmcNumbers);

      if (usersError) throw usersError;

      const usersByKmc = new Map(
        (matchedUsers || []).map((u) => [String(u.kmc_number || '').trim().toUpperCase(), u])
      );

      const prepared: PreparedRow[] = [];
      const skipped: RowResult[] = [];

      rows.forEach((raw, idx) => {
        const rowNum = idx + 2; // header occupies row 1
        const kmcNumber = String(raw['KMC Number'] || '').trim();
        const doctorNameInFile = String(raw['Doctor Name'] || '').trim();

        const fail = (reason: string) => {
          skipped.push({ row: rowNum, kmcNumber, doctorName: doctorNameInFile, date: '', status: 'skipped', reason });
        };

        if (!kmcNumber) return fail('Missing KMC number');

        const matchedUser = usersByKmc.get(kmcNumber.toUpperCase());
        if (!matchedUser) return fail("KMC number doesn't exist, roster update failed");
        if (!matchedUser.is_active) return fail(`${matchedUser.full_name} is not active`);

        const parsedDate = parseFileDate(raw['Date']);
        if (!parsedDate) return fail('Missing or unreadable date');
        const shiftDate = format(parsedDate, 'yyyy-MM-dd');

        const shiftTypeRaw = String(raw['Shift Type'] || '').trim().toLowerCase();
        const shiftType = SHIFT_TYPE_ALIASES[shiftTypeRaw];
        if (!shiftType) return fail(`Shift type must be Day, Afternoon, or Night (got "${raw['Shift Type'] || ''}")`);

        const config = shiftConfigs[shiftType];
        prepared.push({
          rowNum,
          kmcNumber,
          doctorName: matchedUser.full_name,
          userId: matchedUser.id,
          department: matchedUser.department,
          shiftDate,
          shiftType,
          startTime: config.start,
          endTime: config.end,
        });
      });

      // Clash check against what's already scheduled, so the preview's skip
      // reasons are accurate before anything is written.
      let existingKeys = new Set<string>();
      if (prepared.length > 0) {
        const userIds = Array.from(new Set(prepared.map((p) => p.userId)));
        const dates = prepared.map((p) => p.shiftDate);
        const minDate = dates.reduce((a, b) => (a < b ? a : b));
        const maxDate = dates.reduce((a, b) => (a > b ? a : b));

        const { data: existingDuties, error: existingError } = await supabase
          .from('duty_roster')
          .select('user_id, shift_date')
          .in('user_id', userIds)
          .gte('shift_date', minDate)
          .lte('shift_date', maxDate);

        if (existingError) throw existingError;
        existingKeys = new Set((existingDuties || []).map((d) => `${d.user_id}|${d.shift_date}`));
      }

      const ready: PreparedRow[] = [];
      prepared.forEach((p) => {
        const key = `${p.userId}|${p.shiftDate}`;
        if (existingKeys.has(key)) {
          skipped.push({
            row: p.rowNum, kmcNumber: p.kmcNumber, doctorName: p.doctorName, date: p.shiftDate,
            status: 'skipped', reason: 'Already has a duty on this date',
          });
          return;
        }
        if (ready.some((t) => t.userId === p.userId && t.shiftDate === p.shiftDate)) {
          skipped.push({
            row: p.rowNum, kmcNumber: p.kmcNumber, doctorName: p.doctorName, date: p.shiftDate,
            status: 'skipped', reason: 'Duplicate row in this file for the same doctor and date',
          });
          return;
        }
        ready.push(p);
      });

      skipped.sort((a, b) => a.row - b.row);
      ready.sort((a, b) => a.rowNum - b.rowNum);
      setReadyRows(ready);
      setSkippedRows(skipped);
      setStage('preview');
    } catch (error: any) {
      console.error('Bulk roster upload — failed to read/validate file:', error);
      toast.error(error?.message || 'Failed to process the file');
      setStage('idle');
    }
  };

  const handleSubmit = async () => {
    if (readyRows.length === 0) return;
    setStage('submitting');

    const created: RowResult[] = [];
    const chunkSize = 10;
    for (let i = 0; i < readyRows.length; i += chunkSize) {
      const chunk = readyRows.slice(i, i + chunkSize);
      const outcomes = await Promise.allSettled(
        chunk.map((row) =>
          supabase.from('duty_roster').insert({
            user_id: row.userId,
            department: row.department,
            shift_date: row.shiftDate,
            shift_type: row.shiftType,
            start_time: row.startTime,
            end_time: row.endTime,
            status: 'Scheduled',
          })
        )
      );

      outcomes.forEach((outcome, j) => {
        const row = chunk[j];
        if (outcome.status === 'fulfilled' && !outcome.value.error) {
          created.push({ row: row.rowNum, kmcNumber: row.kmcNumber, doctorName: row.doctorName, date: row.shiftDate, status: 'created' });
        } else {
          const message = outcome.status === 'fulfilled' ? outcome.value.error?.message : (outcome as PromiseRejectedResult).reason?.message;
          skippedRows.push({ row: row.rowNum, kmcNumber: row.kmcNumber, doctorName: row.doctorName, date: row.shiftDate, status: 'skipped', reason: message || 'Failed to create duty' });
        }
      });
    }

    const combined = [...created, ...skippedRows].sort((a, b) => a.row - b.row);
    setFinalResults(combined);
    setStage('done');

    if (created.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['duties'] });
      toast.success(`Upload successful — ${created.length} ${created.length === 1 ? 'duty' : 'duties'} created`);
    } else {
      toast.error('No duties were created — see details below');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const displayResults = stage === 'done' ? finalResults || [] : null;
  const createdCount = displayResults?.filter((r) => r.status === 'created').length || 0;
  const skippedCount = displayResults?.filter((r) => r.status === 'skipped').length || 0;

  return (
    <ResponsiveModal isOpen={isOpen} onClose={handleClose} title="Bulk Upload Duty Roster" size="lg">
      <div className="space-y-4">
        {stage !== 'done' && (
          <p className="text-sm text-gray-600">
            Upload an Excel (.xlsx) or CSV file to schedule duties for multiple doctors at once. Each row needs a{' '}
            <strong>Date</strong>, an existing doctor's <strong>KMC Number</strong>, and a <strong>Shift Type</strong> (Day,
            Afternoon, or Night). Doctor Name, Role, and Department are optional in the file — they're taken from the
            doctor's account, not the file. Duties can only be created for doctors who already have an account in your
            hospital, and a single file can cover at most {MAX_DOCTORS} unique doctors, across any department. Nothing is
            saved until you review and click Submit.
          </p>
        )}

        {(stage === 'idle' || stage === 'parsing') && (
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download template
            </Button>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={stage === 'parsing'}
              loading={stage === 'parsing'}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileInputChange}
            />
          </div>
        )}

        {stage === 'parsing' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Reading {fileName}…
          </div>
        )}

        {stage === 'preview' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Reviewed <strong>{fileName}</strong>: <strong className="text-green-700">{readyRows.length} ready to create</strong>,{' '}
              <strong className="text-amber-700">{skippedRows.length} will be skipped</strong>. Nothing has been saved yet.
            </p>

            {readyRows.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Row</th>
                      <th className="text-left px-3 py-2">Doctor</th>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyRows.map((r) => (
                      <tr key={r.rowNum} className="border-t border-gray-100">
                        <td className="px-3 py-1.5">{r.rowNum}</td>
                        <td className="px-3 py-1.5">{r.doctorName}</td>
                        <td className="px-3 py-1.5">{r.shiftDate}</td>
                        <td className="px-3 py-1.5">{r.shiftType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {skippedRows.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Row</th>
                      <th className="text-left px-3 py-2">KMC</th>
                      <th className="text-left px-3 py-2">Doctor</th>
                      <th className="text-left px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skippedRows.map((r) => (
                      <tr key={r.row} className="border-t border-gray-100">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.kmcNumber || '—'}</td>
                        <td className="px-3 py-1.5">{r.doctorName || '—'}</td>
                        <td className="px-3 py-1.5 text-amber-700">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                Choose a different file
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={readyRows.length === 0}>
                Submit{readyRows.length > 0 ? ` (${readyRows.length})` : ''}
              </Button>
            </div>
          </div>
        )}

        {stage === 'submitting' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating duties from {fileName}…
          </div>
        )}

        {stage === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Upload successful — {createdCount} {createdCount === 1 ? 'duty' : 'duties'} created
            </div>

            <div className="flex gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-4 h-4" /> {createdCount} created
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4" /> {skippedCount} skipped
              </div>
            </div>

            {skippedCount > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Row</th>
                      <th className="text-left px-3 py-2">KMC</th>
                      <th className="text-left px-3 py-2">Doctor</th>
                      <th className="text-left px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults!.filter((r) => r.status === 'skipped').map((r) => (
                      <tr key={r.row} className="border-t border-gray-100">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.kmcNumber || '—'}</td>
                        <td className="px-3 py-1.5">{r.doctorName || '—'}</td>
                        <td className="px-3 py-1.5 text-amber-700">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={resetAll}>
                Upload another file
              </Button>
            </div>
          </div>
        )}

        {stage !== 'preview' && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};

export default BulkUploadRosterModal;
