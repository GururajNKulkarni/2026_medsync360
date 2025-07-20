// Define types for the Referral feature

// Match the database enum with UI extension
export type ReferralStatus = 'Sent' | 'Received' | 'Acknowledged' | 'Accepted' | 'Cancelled' | 'Closed';
export type UrgencyLevel = 'Emergency' | 'Urgent' | 'Normal' | 'Elective';

// Attachment types
export interface ReferralAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  patientName: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  admissionDate: string;
  chiefComplaint: string;
  urgency: UrgencyLevel;
  status: ReferralStatus;
  department: string;
  doctor: string;
  fromDoctor: string;
  fromDepartment: string;
  createdAt: string;
  end_time?: string | null;
  attachments: string[];
}

// Form data for creating a referral
export interface ReferralFormData {
  patientName: string;
  age: string;
  sex: 'Male' | 'Female' | 'Other';
  admissionDate: string;
  chiefComplaint: string;
  urgency: UrgencyLevel;
  department: string;
  doctor: string;
  attachments: File[];
}

// Request data for creating a referral
export interface ReferralRequest {
  patientName: string;
  age: number;
  sex: string;
  admissionDate: string;
  chiefComplaint: string;
  urgency: string;
  department: string;
  fromUserId?: string;
  toUserId?: string | null;
  attachments?: string[];
}

// Request data for updating a referral status
export interface ReferralStatusUpdate {
  id: string;
  status: ReferralStatus;
}

// Helper function to map database status to UI status
export const mapStatusForDisplay = (status: ReferralStatus): ReferralStatus => {
  if (status === 'Acknowledged') {
    console.log('Mapping DB status Acknowledged to UI status Accepted');
    return 'Accepted';
  }
  return status;
};

// Helper function to map UI status to database status
export const mapStatusForDatabase = (status: ReferralStatus): ReferralStatus => {
  if (status === 'Accepted') {
    console.log('Mapping UI status Accepted to DB status Acknowledged');
    return 'Acknowledged';
  }
  return status;
};

// Decline reason types
export interface DeclineReason {
  id: string;
  code: string;
  label: string;
  description: string;
}