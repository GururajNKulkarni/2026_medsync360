import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import type { 
  Referral, 
  ReferralStatus, 
  ReferralRequest, 
  ReferralStatusUpdate,
  mapStatusForDisplay,
  mapStatusForDatabase
} from '../types/referral.types';

// Query keys
export const referralKeys = {
  all: ['referrals'] as const,
  lists: () => [...referralKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...referralKeys.lists(), filters] as const,
  details: () => [...referralKeys.all, 'detail'] as const,
  detail: (id: string) => [...referralKeys.details(), id] as const,
};

// Fetch referrals from Supabase
const fetchReferrals = async (userId: string): Promise<Referral[]> => {
  console.log('Fetching referrals for user:', userId);
  
  try {
    // First check if the fix_referral_categorization function exists and run it
    try {
      await supabase.rpc('fix_referral_categorization');
      console.log('Referral categorization fixed');
    } catch (error) {
      console.log('Fix function not available or already run');
    }
    
    // Fetch all referrals related to this user with proper joins
    const { data: referrals, error: fetchError } = await supabase
      .from('referrals')
      .select(`
        *,
        from_user:users!referrals_from_user_id_fkey(id, full_name, role, department),
        to_user:users!referrals_to_user_id_fkey(id, full_name, role, department)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching referrals:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${referrals?.length || 0} total referrals for user ${userId}`);

    // Transform data to match component interface
    return (referrals || []).map(item => {
      // Determine status - handle special cases
      let status: ReferralStatus = item.status as ReferralStatus;
      let direction: 'sent' | 'received' = item.from_user_id === userId ? 'sent' : 'received';
      
      // Ensure status is correct based on direction
      if (direction === 'sent' && status === 'Received') {
        // This is a sent referral incorrectly marked as received
        console.log(`Correcting status for referral ${item.id}: Received -> Sent`);
        status = 'Sent';
      } else if (direction === 'received' && status === 'Sent') {
        // This is a received referral incorrectly marked as sent
        console.log(`Correcting status for referral ${item.id}: Sent -> Received`);
        status = 'Received';
      } else if (status === 'Acknowledged') {
        // Map 'Acknowledged' to 'Accepted' for UI display
        status = 'Accepted';
      } else if (item.end_time) {
        // If end_time is set, it's a closed referral
        status = 'Closed';
      }
      
      // Format admission date properly
      let formattedAdmissionDate = item.admission_date
        ? format(parseISO(item.admission_date), 'yyyy-MM-dd')
        : (item.metadata ? JSON.parse(item.metadata)?.admissionDate : null) || item.created_at.split('T')[0];
      
      return {
        id: item.id,
        // Use dedicated patient fields if available, fall back to title/metadata
        patientName: item.patient_name || item.title,
        age: item.patient_age || (item.metadata ? JSON.parse(item.metadata)?.age : 45) || 45,
        sex: (item.patient_sex || (item.metadata ? JSON.parse(item.metadata)?.sex : 'Male') || 'Male') as 'Male' | 'Female' | 'Other',
        admissionDate: formattedAdmissionDate,
        chiefComplaint: item.description,
        urgency: item.urgency as any,
        status: status,
        department: item.to_department,
        doctor: item.to_user?.full_name || 'Unassigned',
        fromDoctor: item.from_user?.full_name || 'Unknown',
        fromDepartment: item.from_user?.department || 'Unknown',
        createdAt: item.created_at,
        attachments: item.attachments || [],
        end_time: item.end_time
      };
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    throw error;
  }
};

// Create referral
const createReferral = async (referralData: {
  patientName: string;
  age: number;
  sex: string;
  admissionDate: string;
  chiefComplaint: string;
  medicationGiven?: string;
  urgency: string;
  department: string;
  fromUserId?: string;
  toUserId?: string | null;
  attachments?: string[];
}) => {
  try {
    console.log('Creating referral with data:', referralData);
    
    // Prepare insert data
    const insertData = {
      title: referralData.patientName,
      description: referralData.chiefComplaint,
      urgency: referralData.urgency,
      from_user_id: referralData.fromUserId,
      to_department: referralData.department,
      to_user_id: referralData.toUserId || null,
      attachments: referralData.attachments || [],
      // Use dedicated patient columns (they exist in the schema)
      patient_name: referralData.patientName,
      patient_age: referralData.age,
      patient_sex: referralData.sex,
      admission_date: referralData.admissionDate,
      // Add medication field if provided (column now exists in database)
      ...(referralData.medicationGiven && { medication_given: referralData.medicationGiven })
    };

    console.log('Inserting referral data:', insertData);

    const { data, error } = await supabase
      .from('referrals')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting referral:', error);
      throw error;
    }

    console.log('Referral created successfully:', data);

    // Create attachment records if files were uploaded
    if (referralData.attachments && referralData.attachments.length > 0) {
      console.log(`Creating ${referralData.attachments.length} attachment records`);
      
      for (const fileName of referralData.attachments) {
        try {
          // Generate the public URL for the attachment
          const { data: urlData } = supabase.storage
            .from('referral_attachments')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            // Create attachment record in database
            const { error: attachmentError } = await supabase
              .from('referral_attachments')
              .insert({
                referral_id: data.id,
                file_name: fileName,
                original_file_name: fileName, // We could pass this separately if needed
                file_type: getFileTypeFromName(fileName),
                file_url: urlData.publicUrl,
                uploaded_by: referralData.fromUserId || 'unknown'
              });

            if (attachmentError) {
              console.error(`Error creating attachment record for ${fileName}:`, attachmentError);
              // Don't throw here - we still want the referral to be created even if attachment records fail
            } else {
              console.log(`Attachment record created for ${fileName}`);
            }
          }
        } catch (error) {
          console.error(`Error processing attachment ${fileName}:`, error);
          // Continue with other attachments
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Error creating referral:', error);
    throw error;
  }
};

// Update referral status
const updateReferralStatus = async ({ id, status }: { id: string; status: ReferralStatus }) => {
  console.log(`Updating referral ${id} status to ${status}`);
  
  try {
    // Map UI status to database status
    let dbStatus: string = status;
    let updateData: any = {};
    
    // Special handling for different statuses
    switch (status) {
      case 'Accepted':
        // 'Accepted' in UI maps to 'Acknowledged' in DB
        console.log('Mapping UI status Accepted to DB status Acknowledged');
        dbStatus = 'Acknowledged';
        updateData = { 
          status: dbStatus,
          start_time: new Date().toISOString() // Mark acceptance time
        };
        break;
        
      case 'Closed':
        // 'Closed' might be a separate status or use end_time
        console.log('Checking if Closed status exists in enum');
        // Check if 'Closed' exists in the enum
        const { data: statusCheck } = await supabase.rpc('check_enum_value_exists', {
          enum_name: 'referral_status',
          enum_value: 'Closed'
        });
        
        if (statusCheck) {
          console.log('Closed status exists, using it directly');
          dbStatus = 'Closed';
          updateData = { status: dbStatus };
        } else {
          console.log('Closed status does not exist, using Acknowledged with end_time');
          dbStatus = 'Acknowledged'; // Use Acknowledged with end_time
          updateData = { 
            status: dbStatus,
            end_time: new Date().toISOString() // Mark completion time
          };
        }
        break;
        
      default:
        updateData = { status };
    }
    
    // Update the referral
    console.log('Updating referral with data:', updateData);
    const { data: updatedData, error: updateError } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    console.log('Referral updated successfully');
    return updatedData;
  }
  catch (error) {
    console.error('Error updating referral status:', error);
    throw error;
  }
};

// Custom hooks
export const useReferrals = () => {
  const { profile } = useAuthStore(); 
  
  const queryKey = profile?.id ? referralKeys.list({ userId: profile.id }) : referralKeys.list({ userId: 'none' });
  
  return useQuery({
    queryKey: queryKey,
    queryFn: () => profile?.id ? fetchReferrals(profile.id) : Promise.resolve([]),
    enabled: !!profile?.id,
    staleTime: 1 * 60 * 1000, // 1 minute - reduced to ensure we get fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};

export const useCreateReferral = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      toast.success('Referral created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create referral');
    },
  });
};

export const useUpdateReferralStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateReferralStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      toast.success('Referral status updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update referral');
    },
  });
};

// Fetch referral attachments
export const useReferralAttachments = (referralId: string) => {
  return useQuery({
    queryKey: [...referralKeys.detail(referralId), 'attachments', referralId],
    queryFn: async () => {
      try {
        console.log('Fetching attachments for referral:', referralId);
        
        // Try to use the function if it exists
        const { data, error } = await supabase.rpc(
          'get_referral_attachments',
          { ref_id: referralId }
        );
        
        if (error) {
          console.error('Error fetching attachments with RPC:', error.message, error.code, error.details);
          
          // Fallback to direct query if RPC fails
          const { data: directData, error: directError } = await supabase
            .from('referral_attachments')
            .select('*')
            .eq('referral_id', referralId);
            
          if (directError) {
            console.error('Direct query error:', directError);
            throw directError;
          }
          
          if (directData && directData.length > 0) {
            console.log('Found attachments via direct query:', directData.length);
            return await Promise.all(directData.map(async (item: any) => {
              // Generate proper signed URL for the file
              const fileUrl = await getSignedFileUrl(item.file_name);
              
              return {
                id: item.id,
                fileName: item.file_name,
                fileType: item.file_type || getFileTypeFromName(item.file_name),
                fileSize: item.file_size ? formatFileSize(item.file_size) : 'Unknown',
                fileUrl: fileUrl,
                uploadedBy: 'Unknown', // We don't have uploader name in direct query
                createdAt: item.created_at
              };
            }));
          }
        }
        
        if (data && data.length > 0) {
          console.log('Found attachments via RPC:', data.length);
          // Transform data to match component interface
          return await Promise.all(data.map(async (item: any) => {
            // Generate proper signed URL for the file
            const fileUrl = await getSignedFileUrl(item.file_name);
            
            return {
              id: item.id,
              fileName: item.file_name,
              fileType: item.file_type || getFileTypeFromName(item.file_name),
              fileSize: item.file_size ? formatFileSize(item.file_size) : 'Unknown',
              fileUrl: fileUrl,
              uploadedBy: item.uploader_name || 'Unknown',
              createdAt: item.created_at
            };
          }));
        }
        
        // If no attachments found in dedicated table, check the attachments array in referrals
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('attachments')
          .eq('id', referralId)
          .single();
          
        if (referralError) {
          console.error('Error fetching referral attachments array:', referralError);
          throw referralError;
        }
        
        if (referralData?.attachments && referralData.attachments.length > 0) {
          console.log('Found attachments in referral array:', referralData.attachments.length);
          // Create attachment objects from the attachment names with proper URLs
          return await Promise.all(referralData.attachments.map(async (name: string, index: number) => {
            const fileUrl = await getSignedFileUrl(name);
            console.log(`Generated URL for ${name}:`, fileUrl);
            
            return {
              id: `legacy-${index}`,
              fileName: name,
              fileType: getFileTypeFromName(name),
              fileSize: 'Unknown',
              fileUrl: fileUrl,
              uploadedBy: 'Unknown',
              createdAt: new Date().toISOString()
            };
          }));
        }
        
        console.log('No attachments found for referral:', referralId);
        return [];
      } catch (error) {
        console.error('Error fetching attachments:', error);
        return [];
      }
    },
    enabled: !!referralId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper function to get signed URL for file access
const getSignedFileUrl = async (fileName: string): Promise<string> => {
  try {
    console.log('Getting signed URL for file:', fileName);
    
    // Check if fileName already includes user path structure
    let fullFilePath = fileName;
    
    // If fileName doesn't contain a slash, we need to find the correct user path
    if (!fileName.includes('/')) {
      console.log('File name does not include path, searching for file in storage...');
      
      // Try to list files in the bucket to find the correct path
      const { data: fileList, error: listError } = await supabase.storage
        .from('referral_attachments')
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      
      if (!listError && fileList) {
        // Look for the file recursively
        console.log('Searching for file in bucket...');
        
        // Try to get subdirectories (user folders)
        for (const item of fileList) {
          if (item.name && !item.name.includes('.')) { // This is likely a directory (user ID)
            const { data: subFiles, error: subError } = await supabase.storage
              .from('referral_attachments')
              .list(item.name, { limit: 100 });
            
            if (!subError && subFiles) {
              const foundFile = subFiles.find(f => f.name === fileName || f.name?.endsWith(fileName));
              if (foundFile) {
                fullFilePath = `${item.name}/${foundFile.name}`;
                console.log('Found file at path:', fullFilePath);
                break;
              }
            }
          }
        }
      }
    }
    
    console.log('Using file path:', fullFilePath);
    
    // First, try to get a signed URL (for private files)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('referral_attachments')
      .createSignedUrl(fullFilePath, 3600); // 1 hour expiry
    
    if (signedData?.signedUrl && !signedError) {
      console.log('Generated signed URL:', signedData.signedUrl);
      return signedData.signedUrl;
    }
    
    console.log('Signed URL failed, trying public URL. Error:', signedError?.message);
    
    // If signed URL fails, try public URL (since bucket is public)
    const { data: publicData } = supabase.storage
      .from('referral_attachments')
      .getPublicUrl(fullFilePath);
    
    if (publicData?.publicUrl) {
      console.log('Generated public URL:', publicData.publicUrl);
      return publicData.publicUrl;
    }
    
    // Fallback to manual URL construction
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/referral_attachments/${fullFilePath}`;
      console.log('Generated fallback URL:', fallbackUrl);
      return fallbackUrl;
    }
    
    console.error('Could not generate file URL for:', fileName);
    return '';
  } catch (error) {
    console.error('Error generating file URL:', error);
    // Return empty string instead of throwing to prevent breaking the UI
    return '';
  }
};

// Helper function to get file type from name
const getFileTypeFromName = (fileName: string): string => {
  console.log('Getting file type for:', fileName);
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
    default: {
      console.log('Unknown file extension:', extension);
      return 'file';
    }
  }
};

// Helper function to format file size
const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};
