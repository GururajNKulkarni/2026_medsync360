import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Stethoscope, 
  User,
  Upload,
  X,
  FileText,
  Paperclip,
  Loader2,
  ArrowRightLeft
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import type { TransferData } from './ReferralCompletionModal';
import type { Referral } from '../../../types/referral.types';

// Complete list of medical departments
const DEPARTMENTS = [
  'MD Anaesthesiology', 'MD Anatomy', 'MD Aviation Medicine', 'MD Biochemistry',
  'MD Blood Transfusion & Immunohematology', 'DM Cardiology', 'MD Community Medicine',
  'MD Clinical Pharmacology', 'MCh Cardiothoracic and Vascular Surgery', 'MD Critical Care Medicine',
  'MD Dermatology', 'MD Diagnostic Radiology', 'MD Emergency Medicine', 'DM Endocrinology',
  'MD ENT', 'MD Forensic Medicine', 'MD General Medicine', 'MD General Surgery',
  'MD Geriatrics', 'MD Immunohematology and Blood Transfusion', 'MD Infectious Diseases',
  'MD Internal Medicine', 'MD Microbiology', 'MCh Minimal Access Surgery', 'MD Nuclear Medicine',
  'MD Medicine', 'DM Neonatology', 'DM Nephrology', 'DM Neurology', 'MCh Neurosurgery',
  'MD Obstetrics & Gynecology', 'MD Ophthalmology', 'MCh Oncosurgery', 'DM Oncology',
  'MD Orthopedics', 'MD Pathology', 'MD Pediatrics', 'MCh Pediatric Surgery',
  'MD Pharmacology', 'MD Physical Medicine & Rehabilitation', 'MD Physiology',
  'MD Psychiatry', 'MD Pulmonary Medicine', 'MD Radiation Oncology', 'MD Radiology',
  'MD Radiotherapy', 'DM Rheumatology', 'MCh Surgical Gastroenterology',
  'MCh Surgical Oncology', 'MCh Thoracic Surgery', 'DM Transfusion Medicine',
  'DM Tropical Medicine', 'MCh Urology'
];

interface ReferralTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: Referral;
  transferData: Partial<TransferData>;
  onTransfer: (data: TransferData) => void;
}

interface Doctor {
  id: string;
  full_name: string;
  role: string;
  kmc_number: string | null;
}

export const ReferralTransferModal: React.FC<ReferralTransferModalProps> = ({
  isOpen,
  onClose,
  referral,
  transferData,
  onTransfer
}) => {
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    department: '',
    doctor: '',
    transferReason: '',
    specialNotes: '',
    attachments: [] as File[]
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch doctors when department changes with proper cleanup
  useEffect(() => {
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const fetchDoctors = async () => {
      if (!formData.department) {
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      // Debounce the API call to prevent rapid requests
      timeoutId = setTimeout(async () => {
        setLoadingDoctors(true);
        try {
          console.log(`Fetching doctors for department: ${formData.department}`);
          
          const hospitalId = (profile as any)?.hospital_id;
          let doctorsQuery = supabase
            .from('users')
            .select('id, full_name, role, kmc_number, department')
            .eq('department', formData.department)
            .eq('is_active', true)
            .not('role', 'is', null);

          if (hospitalId) {
            doctorsQuery = doctorsQuery.eq('hospital_id', hospitalId);
          }

          const { data, error } = await doctorsQuery
            .order('full_name', { ascending: true })
            .abortSignal(abortController.signal);

          // Check if component is still mounted and request wasn't aborted
          if (!abortController.signal.aborted) {
            if (error) {
              console.error('Supabase error fetching doctors:', error);
              toast.error(`Failed to load doctors: ${error.message}`);
              setDoctors([]);
            } else {
              // Exclude the doctor who currently holds the referral — you can't transfer to the current holder
              const available = (data || []).filter(d => d.id !== referral.toUserId);
              setDoctors(available);
              console.log(`Successfully loaded ${available.length} doctors for ${formData.department}`);
            }
          }
        } catch (error: any) {
          if (!abortController.signal.aborted) {
            console.error('Network error fetching doctors:', error);
            toast.error('Network error loading doctors. Please check your connection.');
            setDoctors([]);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setLoadingDoctors(false);
          }
        }
      }, 300); // 300ms debounce
    };

    fetchDoctors();

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
      setLoadingDoctors(false);
    };
  }, [formData.department]);

  // Reset doctor selection when department changes
  useEffect(() => {
    if (formData.doctor && !doctors.find(d => d.id === formData.doctor)) {
      setFormData(prev => ({ ...prev, doctor: '' }));
    }
  }, [doctors, formData.doctor]);

  // Cleanup effect when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes to prevent memory leaks
      setFormData({
        department: '',
        doctor: '',
        transferReason: '',
        specialNotes: '',
        attachments: []
      });
      setDoctors([]);
      setLoadingDoctors(false);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.doctor) {
      newErrors.doctor = 'Doctor is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔄 Starting referral transfer process...');
      
      // FIXED: Don't call the database function directly - let the parent handle it via mutation
      // This prevents duplicate transfers from being created
      
      // Prepare transfer data for parent component notification
      const finalTransferData: TransferData = {
        ...transferData,
        department: formData.department,
        doctorId: formData.doctor,
        transferReason: formData.transferReason,
        specialNotes: formData.specialNotes,
        attachments: formData.attachments
      } as TransferData;

      console.log('✅ Transfer data prepared:', finalTransferData);
      
      // Notify parent component to handle the actual transfer
      onTransfer(finalTransferData);
      
      // Close modal
      handleClose();
      
    } catch (error) {
      console.error('💥 Transfer process failed:', error);
      toast.error('Transfer failed: Network or system error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      const isValidType = ['image/', 'application/pdf', 'text/'].some(type => 
        file.type.startsWith(type)
      );
      return isValidSize && isValidType;
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleClose = () => {
    setFormData({
      department: '',
      doctor: '',
      transferReason: '',
      specialNotes: '',
      attachments: []
    });
    setErrors({});
    onClose();
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Referral"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transfer Info Header */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ArrowRightLeft className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-purple-900">Transfer Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-purple-700 font-medium">Patient: {referral.patientName}</p>
              <p className="text-purple-600">From: {referral.fromDepartment}</p>
            </div>
            <div>
              <p className="text-purple-700 font-medium">
                Status: {transferData.isPatientAttended ? 'Attended' : 'Not Attended'}
              </p>
              {transferData.isPatientAttended && transferData.updatedMedication && (
                <p className="text-purple-600 text-xs">Medication updated</p>
              )}
              {!transferData.isPatientAttended && transferData.reasons && (
                <p className="text-purple-600 text-xs">Reasons provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Department and Doctor Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-purple-600" />
            Transfer Destination
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    department: e.target.value,
                    doctor: '' // Reset doctor when department changes
                  }))}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors appearance-none",
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  )}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              {errors.department && (
                <p className="text-xs text-red-600 mt-1">{errors.department}</p>
              )}
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Doctor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                {loadingDoctors && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
                <select
                  value={formData.doctor}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctor: e.target.value }))}
                  disabled={!formData.department || loadingDoctors}
                  className={cn(
                    "w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors appearance-none",
                    errors.doctor ? 'border-red-300' : 'border-gray-300',
                    (!formData.department || loadingDoctors) && 'bg-gray-50 cursor-not-allowed'
                  )}
                >
                  <option value="">
                    {loadingDoctors 
                      ? 'Loading doctors...'
                      : !formData.department 
                      ? 'Select department first'
                      : doctors.length === 0
                      ? 'No doctors found in this department'
                      : `Select Doctor (${doctors.length} available)`
                    }
                  </option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name} ({doctor.role})
                      {doctor.kmc_number && ` - ${doctor.kmc_number}`}
                    </option>
                  ))}
                </select>
              </div>
              {errors.doctor && (
                <p className="text-xs text-red-600 mt-1">{errors.doctor}</p>
              )}
              {formData.department && doctors.length === 0 && !loadingDoctors && (
                <p className="text-xs text-amber-600 mt-1">
                  No doctors found in {formData.department}. Please contact admin to add doctors to this department.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Transfer Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Transfer Information
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Reason For Transfer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason For Transfer
              </label>
              <textarea
                value={formData.transferReason}
                onChange={(e) => setFormData(prev => ({ ...prev, transferReason: e.target.value }))}
                placeholder="Please explain why this patient case is being transferred..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide a clear explanation for the transfer to help the receiving doctor understand the case context.
              </p>
            </div>

            {/* Special Notes or Findings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Any special Notes or Findings?
              </label>
              <textarea
                value={formData.specialNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, specialNotes: e.target.value }))}
                placeholder="Include any important clinical findings, observations, or special instructions..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Document any critical findings, test results, patient observations, or special care instructions.
              </p>
            </div>
          </div>
        </div>

        {/* File Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Additional Attachments <span className="text-gray-500">(Optional)</span>
          </label>
          
          <div className="space-y-3">
            {/* Upload Button */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Max file size: 5MB. Supported formats: Images, PDF, DOC
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <Paperclip size={16} className="mr-2" />
                Add Files
              </Button>
            </div>

            {/* File List */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <FileText size={16} className="text-purple-600 mr-2" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      disabled={isSubmitting}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1 sm:flex-none"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500"
            disabled={loadingDoctors || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft size={16} className="mr-2" />
                Transfer Referral
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
