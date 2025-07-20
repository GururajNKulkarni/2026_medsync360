import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Archive, Download, ExternalLink, Eye, File, Image, FileImage, File as FilePdf, FileText as FileTextIcon, Shield, Tag, User, Building2, AlertCircle, X } from 'lucide-react';
import { Bug } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useReferralAttachments } from '../../../hooks/useReferrals';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Referral, ReferralStatus, UrgencyLevel, ReferralAttachment } from '../../../types/referral.types';
import { mapStatusForDisplay } from '../../../types/referral.types';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { AttachmentDiagnostic } from './AttachmentDiagnostic';

interface ReferralDetailsProps {
  referral: Referral;
  onStatusChange: (id: string, status: ReferralStatus) => void;
  onClose: () => void;
}

interface DeclineReason {
  id: string;
  label: string;
  description: string;
}

const declineReasons: DeclineReason[] = [
  {
    id: 'incorrect_details',
    label: 'Incorrect Details',
    description: 'Patient information or clinical details are incorrect or incomplete'
  },
  {
    id: 'not_needed',
    label: 'Not Needed Anymore',
    description: 'Referral is no longer required due to patient condition change or other factors'
  },
  {
    id: 'not_on_duty',
    label: 'Not On Duty',
    description: 'Currently not available or on duty to handle this referral'
  }
];

const urgencyConfig = {
  Emergency: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  Urgent: {
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: Clock
  },
  Normal: {
    color: 'bg-neutral-500',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-700',
    borderColor: 'border-neutral-200',
    icon: FileText
  },
  Elective: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: Calendar
  }
};

const statusConfig = {
  Received: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: FileText
  },
  Accepted: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  Acknowledged: { // Database status that maps to Accepted in UI
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  Sent: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: FileText
  },
  Cancelled: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: XCircle
  },
  Closed: {
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: Archive
  }
};

export const ReferralDetails: React.FC<ReferralDetailsProps> = ({ 
  referral, 
  onStatusChange,
  onClose
}) => {
  const { data: attachments = [], isLoading: loading } = useReferralAttachments(referral.id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get urgency and status config
  const urgency = urgencyConfig[referral.urgency as keyof typeof urgencyConfig] || urgencyConfig.Normal;
  const displayStatus = mapStatusForDisplay(referral.status);
  const status = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.Sent;
  
  const UrgencyIcon = urgency.icon;
  const StatusIcon = status.icon;

  // Helper function to get file type from name
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'txt':
        return 'text';
      default:
        return 'file';
    }
  };

  // Handle file preview
  const handlePreview = (attachment: ReferralAttachment) => {
    if (!attachment.fileUrl || attachment.fileUrl.trim() === '') {
      toast.error('File URL not available. Please contact support if this issue persists.');
      console.error('File URL not available for:', attachment.fileName);
      return;
    }
    
    console.log('Opening preview for file:', attachment.fileName, 'URL:', attachment.fileUrl);
    setPreviewUrl(attachment.fileUrl);
    setPreviewType(attachment.fileType);
    setImageError(false);
    setShowPreview(true);
  };

  // Handle file download
  const handleDownload = (attachment: ReferralAttachment) => {
    if (!attachment.fileUrl || attachment.fileUrl.trim() === '') {
      toast.error('File URL not available. Please contact support if this issue persists.');
      console.error('File URL not available for:', attachment.fileName);
      return;
    }
    
    console.log('Downloading file:', attachment.fileName, 'URL:', attachment.fileUrl);
    
    try {
      // Create a temporary anchor element to trigger download
      const a = document.createElement('a');
      a.href = attachment.fileUrl;
      a.download = attachment.fileName;
      a.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success(`Downloading ${attachment.fileName}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Trying to open in new tab...');
      // Fallback: open in new tab
      window.open(attachment.fileUrl, '_blank');
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-600" />;
      case 'pdf':
        return <FilePdf className="w-5 h-5 text-red-600" />;
      case 'document':
        return <FileTextIcon className="w-5 h-5 text-blue-600" />;
      case 'text':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  // Handle decline with reason
  const handleDecline = () => {
    if (!selectedReason) {
      toast.error('Please select a reason for declining');
      return;
    }
    
    // Get the selected reason text
    const reason = selectedReason === 'other' 
      ? otherReason 
      : declineReasons.find(r => r.id === selectedReason)?.label || 'Unknown reason';
    
    // Log the reason (in a real app, this would be saved to the database)
    console.log(`Declining referral ${referral.id} with reason: ${reason}`);
    
    // Update the referral status
    onStatusChange(referral.id, 'Cancelled');
    
    // Show confirmation toast
    toast.success(`Referral declined: ${reason}`);
    
    // Close modals
    setShowDeclineModal(false);
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Header with Status and Urgency */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Patient Referral</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <div className={cn(
              "flex items-center px-3 py-1.5 rounded-full text-sm font-medium",
              status.bgColor,
              status.textColor
            )}>
              <StatusIcon size={16} className="mr-1.5" />
              {displayStatus}
            </div>
            
            {/* Urgency Badge */}
            <div className={cn(
              "flex items-center px-3 py-1.5 rounded-full text-sm font-medium",
              urgency.bgColor,
              urgency.textColor
            )}>
              <UrgencyIcon size={16} className="mr-1.5" />
              {referral.urgency}
            </div>
            
            {/* Date Badge */}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-1.5" />
              {format(new Date(referral.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <User className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">Patient Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">Name</p>
            <p className="text-base font-semibold text-gray-900">{referral.patientName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">Age</p>
            <p className="text-base font-semibold text-gray-900">{referral.age} years</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">Sex</p>
            <p className="text-base font-semibold text-gray-900">{referral.sex}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-sm font-medium text-blue-700 mb-1">Admission Date</p>
            <p className="text-base font-semibold text-gray-900">
              {format(new Date(referral.admissionDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Chief Complaint */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <Tag className="w-5 h-5 text-gray-600 mr-2" />
          Chief Complaint
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap">{referral.chiefComplaint}</p>
        </div>
      </div>

      {/* Referral Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* From */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <User className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-purple-900">From</h3>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">{referral.fromDoctor}</p>
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-1.5" />
            <span>{referral.fromDepartment}</span>
          </div>
        </div>
        
        {/* To */}
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <User className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-900">To</h3>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">{referral.doctor}</p>
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-1.5" />
            <span>{referral.department}</span>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {(attachments.length > 0 || loading) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center" id="attachments-section">
            <FileText className="w-5 h-5 text-gray-600 mr-2" />
            Attachments
          </h3>
          
          {loading ? (
            <div className="flex justify-center items-center h-24 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    {getFileIcon(attachment.fileType)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <span className="mr-3">{attachment.fileSize}</span>
                        <span>{format(new Date(attachment.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePreview(attachment);
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownload(attachment);
                      }}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
        <div className="flex items-center">
          <Shield className="w-3 h-3 mr-1 text-green-600" />
          <span>All referral data is encrypted and HIPAA compliant</span>
        </div>
        
        {/* Diagnostic Button */}
        {attachments.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDiagnostic(true)}
            className="text-xs text-blue-600 mt-2 sm:mt-0"
          >
            <Bug className="w-3 h-3 mr-1" />
            Attachment Diagnostic
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        {referral.status === 'Received' && (
          <>
            <Button
              onClick={() => {
                onStatusChange(referral.id, 'Accepted');
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500"
            >
              <CheckCircle size={16} className="mr-2" />
              Accept Referral
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineModal(true);
              }}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle size={16} className="mr-2" />
              Decline
            </Button>
          </>
        )}
        
        {(referral.status === 'Acknowledged' || referral.status === 'Accepted') && (
          <Button
            onClick={() => {
              onStatusChange(referral.id, 'Closed');
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Archive size={16} className="mr-2" />
            Mark as Completed
          </Button>
        )}
        
        {/* Cancel button always visible */}
        <Button
          variant="outline"
          onClick={onClose}
          className={referral.status !== 'Received' && referral.status !== 'Acknowledged' && referral.status !== 'Accepted' ? "flex-1" : ""}
        >
          Close
        </Button>
      </div>

      {/* Decline Reason Modal */}
      <ResponsiveModal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        title="Reason for Declining"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-1">Please provide a reason</h3>
              <p className="text-sm text-yellow-700">
                Selecting a reason helps the referring doctor understand why the referral was declined.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Select a reason:</h3>
            
            {declineReasons.map((reason) => (
              <div 
                key={reason.id}
                className={cn(
                  "p-3 border-2 rounded-lg cursor-pointer transition-all",
                  selectedReason === reason.id 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => setSelectedReason(reason.id)}
              >
                <div className="flex items-center">
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center mr-3",
                    selectedReason === reason.id ? "border-blue-500" : "border-gray-400"
                  )}>
                    {selectedReason === reason.id && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{reason.label}</h4>
                    <p className="text-sm text-gray-600">{reason.description}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Other reason option */}
            <div 
              className={cn(
                "p-3 border-2 rounded-lg cursor-pointer transition-all",
                selectedReason === 'other' 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => setSelectedReason('other')}
            >
              <div className="flex items-center mb-2">
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center mr-3",
                  selectedReason === 'other' ? "border-blue-500" : "border-gray-400"
                )}>
                  {selectedReason === 'other' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                </div>
                <h4 className="font-medium text-gray-900">Other reason</h4>
              </div>
              
              {selectedReason === 'other' && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                  rows={3}
                />
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowDeclineModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecline}
              disabled={!selectedReason || (selectedReason === 'other' && !otherReason.trim())}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle size={16} className="mr-2" />
              Decline Referral
            </Button>
          </div>
        </div>
      </ResponsiveModal>
      
      {/* Attachment Diagnostic Modal */}
      <ResponsiveModal
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
        title="Attachment Diagnostic"
        size="lg"
      >
        <AttachmentDiagnostic
          referralId={referral.id}
          attachments={attachments}
          onClose={() => setShowDiagnostic(false)}
        />
      </ResponsiveModal>

      {/* File Preview Modal */}
      {showPreview && previewUrl && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full flex flex-col"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">File Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {previewType === 'image' ? (
                <img 
                  src={previewUrl} 
                  alt={imageError ? "Image preview failed to load" : "Preview"} 
                  className="max-w-full h-auto mx-auto object-contain"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    console.error('Image failed to load:', previewUrl, e);
                    setImageError(true);
                    e.currentTarget.src = 'https://placehold.co/600x400?text=Image+Not+Available';
                    toast.error('Failed to load image. URL may be incorrect or inaccessible.');
                  }}
                />
              ) : previewType === 'pdf' ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full min-h-[500px]" 
                  title="PDF Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600">Preview not available</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewUrl, '_blank')}
                    className="mt-4"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Open in new tab
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ReferralDetails;
