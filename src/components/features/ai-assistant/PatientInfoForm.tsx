import React from 'react';
import { User, Calendar, FileText, CreditCard, Building2, Clock } from 'lucide-react';
import { useResponsive } from '../../../hooks/useResponsive';
import { cn } from '../../../lib/utils';

interface PatientInfo {
  name: string;
  patientId: string;
  dateOfBirth: string;
  visitDate: string;
  medicalRecordNumber: string;
  insuranceInfo: string;
  appointmentType: string;
}

interface PatientInfoFormProps {
  patientInfo: PatientInfo;
  onChange: (info: PatientInfo) => void;
  disabled?: boolean;
}

const appointmentTypes = [
  'Initial Consultation',
  'Follow-up Visit',
  'Emergency Visit',
  'Routine Checkup',
  'Specialist Consultation',
  'Procedure',
  'Lab Results Review',
  'Medication Review',
  'Telemedicine',
  'Other'
];

export const PatientInfoForm: React.FC<PatientInfoFormProps> = ({
  patientInfo,
  onChange,
  disabled = false
}) => {
  const { isMobile } = useResponsive();
  const handleChange = (field: keyof PatientInfo, value: string) => {
    onChange({ ...patientInfo, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <User className="w-4 h-4 text-blue-600" />
        Patient Information
      </h3>

      {/* Patient Name - Required */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Patient Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={patientInfo.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
            disabled && "bg-gray-100 cursor-not-allowed"
          )}
          placeholder="Enter patient name"
          required
        />
      </div>

      {/* Patient ID */}
      {!isMobile && (<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Patient ID
        </label>
        <input
          type="text"
          value={patientInfo.patientId}
          onChange={(e) => handleChange('patientId', e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
            disabled && "bg-gray-100 cursor-not-allowed"
          )}
          placeholder="Auto-generated if empty"
        />
        <p className="text-xs text-gray-500 mt-1">
          Will be auto-generated if left empty
        </p>
      </div>)}

      {/* Date of Birth */}
      {!isMobile && (<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date of Birth
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={patientInfo.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          />
        </div>
      </div>)}

      {/* Visit Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visit Date
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={patientInfo.visitDate}
            onChange={(e) => handleChange('visitDate', e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          />
        </div>
      </div>

      {/* Medical Record Number */}
      {!isMobile && (<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Medical Record Number
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={patientInfo.medicalRecordNumber}
            onChange={(e) => handleChange('medicalRecordNumber', e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
            placeholder="MRN123456"
          />
        </div>
      </div>)}

      {/* Insurance Information */}
      {!isMobile && (<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Insurance Information
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={patientInfo.insuranceInfo}
            onChange={(e) => handleChange('insuranceInfo', e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
            placeholder="Insurance provider/policy"
          />
        </div>
      </div>)}

      {/* Appointment Type */}
      {!isMobile && (<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Appointment Type
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={patientInfo.appointmentType}
            onChange={(e) => handleChange('appointmentType', e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          >
            <option value="">Select appointment type</option>
            {appointmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>)}
    </div>
  );
};