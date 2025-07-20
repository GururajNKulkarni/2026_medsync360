import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bug, 
  Database, 
  FileText, 
  Eye, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Link,
  ExternalLink,
  Image,
  File
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import type { ReferralAttachment } from '../../../types/referral.types';

interface AttachmentDiagnosticProps {
  referralId: string;
  attachments: ReferralAttachment[];
  onClose: () => void;
}

export const AttachmentDiagnostic: React.FC<AttachmentDiagnosticProps> = ({
  referralId,
  attachments,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ReferralAttachment | null>(null);
  const [urlTestResults, setUrlTestResults] = useState<Record<string, any>>({});
  const [storagePermissionTest, setStoragePermissionTest] = useState<{
    status: 'pending' | 'success' | 'error';
    message: string;
  }>({ status: 'pending', message: 'Not tested yet' });

  // Run initial diagnostics
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // 1. Check if referral exists
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('id, attachments')
        .eq('id', referralId)
        .single();

      if (referralError) {
        throw new Error(`Referral not found: ${referralError.message}`);
      }

      // 2. Check if attachments array exists in referral
      const hasAttachmentsArray = referral.attachments && referral.attachments.length > 0;

      // 3. Check if attachments exist in dedicated table
      const { data: attachmentRecords, error: attachmentError } = await supabase
        .from('referral_attachments')
        .select('*')
        .eq('referral_id', referralId);

      if (attachmentError) {
        console.error('Error fetching attachment records:', attachmentError);
      }

      // 4. Check if get_referral_attachments function exists
      let rpcFunctionExists = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_referral_attachments',
          { ref_id: referralId }
        );
        rpcFunctionExists = !rpcError;
      } catch (error) {
        console.error('RPC function test error:', error);
        rpcFunctionExists = false;
      }

      // 5. Check storage bucket configuration
      const {
        data: bucketData,
        error: bucketError
      } = await supabase.storage.getBucket('referral_attachments');

      const bucketExists = bucketData !== null && bucketError === null;
      const bucketIsPublic = bucketData?.public ?? false;

      // Set diagnostic results
      setDiagnosticResults({
        referralExists: true,
        hasAttachmentsArray,
        attachmentsArrayCount: hasAttachmentsArray ? referral.attachments.length : 0,
        attachmentTableCount: attachmentRecords?.length || 0,
        rpcFunctionExists,
        bucketExists,
        bucketIsPublic,
        attachmentRecords: attachmentRecords || []
      });

      // Test storage permissions
      testStoragePermissions();

    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnosticResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        referralExists: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testStoragePermissions = async () => {
    try {
      setStoragePermissionTest({ status: 'pending', message: 'Testing storage permissions...' });
      
      // Try to get a list of files from the storage bucket
      const { data, error } = await supabase
        .storage
        .from('referral_attachments')
        .list();
      
      if (error) {
        setStoragePermissionTest({ 
          status: 'error', 
          message: `Storage permission error: ${error.message}` 
        });
        return;
      }
      
      setStoragePermissionTest({ 
        status: 'success', 
        message: `Storage access successful. Found ${data.length} files.` 
      });
    } catch (error) {
      setStoragePermissionTest({ 
        status: 'error', 
        message: `Storage test exception: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const testAttachmentUrl = async (attachment: ReferralAttachment) => {
    setSelectedAttachment(attachment);
    
    try {
      // First, check if the URL is properly formatted
      if (!attachment.fileUrl) {
        setUrlTestResults({
          ...urlTestResults,
          [attachment.id]: {
            status: 'error',
            message: 'No file URL available'
          }
        });
        return;
      }

      // Log the URL for debugging
      console.log('Testing URL:', attachment.fileUrl);
      
      // Test if the URL is accessible via fetch
      const testResult = {
        url: attachment.fileUrl,
        timestamp: new Date().toISOString(),
        status: 'pending' as 'pending' | 'success' | 'error',
        message: 'Testing...',
        headers: {} as Record<string, string>
      };
      
      try {
        // Use fetch with HEAD request to check if the URL is accessible
        const response = await fetch(attachment.fileUrl, { 
          method: 'HEAD',
          mode: 'no-cors' // This is important for CORS issues
        });
        
        // Even with no-cors, we can check if the request completed
        testResult.status = 'success';
        testResult.message = 'URL appears to be accessible';
      } catch (error) {
        testResult.status = 'error';
        testResult.message = `Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Update the test results
      setUrlTestResults({
        ...urlTestResults,
        [attachment.id]: testResult
      });
      
    } catch (error) {
      setUrlTestResults({
        ...urlTestResults,
        [attachment.id]: {
          status: 'error',
          message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  };

  const fixAttachmentUrl = async (attachment: ReferralAttachment) => {
    try {
      // Generate a proper URL using Supabase's getPublicUrl method
      const { data: urlData } = supabase.storage
        .from('referral_attachments')
        .getPublicUrl(attachment.fileName);
      
      if (!urlData?.publicUrl) {
        toast.error('Failed to generate corrected URL');
        return;
      }
      
      const correctedUrl = urlData.publicUrl;
      console.log('Generated corrected URL:', correctedUrl);
      
      // Update the attachment record
      const { error } = await supabase
        .from('referral_attachments')
        .update({ file_url: correctedUrl })
        .eq('id', attachment.id);
      
      if (error) {
        toast.error(`Failed to update URL: ${error.message}`);
        return;
      }
      
      toast.success('Attachment URL updated');
      
      // Update local state
      const updatedAttachment = { ...attachment, fileUrl: correctedUrl };
      setSelectedAttachment(updatedAttachment);
      
      // Test the new URL
      await testAttachmentUrl(updatedAttachment);
      
      // Refresh diagnostics
      runDiagnostics();
      
    } catch (error) {
      toast.error(`Error fixing URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return <Image className="w-5 h-5 text-blue-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Bug className="w-6 h-6 mr-2 text-blue-600" />
          Attachment Diagnostic
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={runDiagnostics}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {/* Diagnostic Summary */}
      {diagnosticResults && (
        <Card padding="lg" className="bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4">Diagnostic Summary</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Referral Exists:</span>
              <span className={diagnosticResults.referralExists ? "text-green-600" : "text-red-600"}>
                {diagnosticResults.referralExists ? "Yes" : "No"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Attachments Array:</span>
              <span className={diagnosticResults.hasAttachmentsArray ? "text-green-600" : "text-yellow-600"}>
                {diagnosticResults.hasAttachmentsArray 
                  ? `Yes (${diagnosticResults.attachmentsArrayCount} items)` 
                  : "No"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Attachment Records:</span>
              <span className={diagnosticResults.attachmentTableCount > 0 ? "text-green-600" : "text-yellow-600"}>
                {diagnosticResults.attachmentTableCount} records
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-800">RPC Function:</span>
              <span className={diagnosticResults.rpcFunctionExists ? "text-green-600" : "text-red-600"}>
                {diagnosticResults.rpcFunctionExists ? "Available" : "Not Available"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Storage Bucket:</span>
              <span className={diagnosticResults.bucketExists ? "text-green-600" : "text-red-600"}>
                {diagnosticResults.bucketExists 
                  ? (diagnosticResults.bucketIsPublic ? "Public" : "Private") 
                  : "Not Found"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-800">Storage Permissions:</span>
              <span className={
                storagePermissionTest.status === 'success' ? "text-green-600" : 
                storagePermissionTest.status === 'error' ? "text-red-600" : 
                "text-yellow-600"
              }>
                {storagePermissionTest.status === 'pending' ? "Not Tested" : storagePermissionTest.message}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Attachment List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Attachment Tests</h3>
        
        {attachments.length === 0 ? (
          <Card padding="lg" className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No attachments found for this referral</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <Card 
                key={attachment.id} 
                padding="md" 
                className={cn(
                  "border-2",
                  selectedAttachment?.id === attachment.id ? "border-blue-500" : "border-gray-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getFileIcon(attachment.fileType)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500">{attachment.fileSize}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAttachmentUrl(attachment)}
                    >
                      <Eye size={14} className="mr-1" />
                      Test URL
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fixAttachmentUrl(attachment)}
                    >
                      <RefreshCw size={14} className="mr-1" />
                      Fix URL
                    </Button>
                  </div>
                </div>
                
                {/* URL Display */}
                {attachment.fileUrl && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">URL:</span>
                      <a 
                        href={attachment.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center"
                      >
                        <ExternalLink size={10} className="mr-1" />
                        Open
                      </a>
                    </div>
                    <p className="text-xs font-mono text-gray-600 break-all mt-1">
                      {attachment.fileUrl}
                    </p>
                  </div>
                )}
                
                {/* Test Results */}
                {urlTestResults[attachment.id] && (
                  <div className={cn(
                    "mt-3 p-2 rounded-lg text-sm",
                    urlTestResults[attachment.id].status === 'success' ? "bg-green-50" : 
                    urlTestResults[attachment.id].status === 'error' ? "bg-red-50" : 
                    "bg-yellow-50"
                  )}>
                    <div className="flex items-center">
                      {urlTestResults[attachment.id].status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : urlTestResults[attachment.id].status === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-600 mr-2" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        urlTestResults[attachment.id].status === 'success' ? "text-green-700" : 
                        urlTestResults[attachment.id].status === 'error' ? "text-red-700" : 
                        "text-yellow-700"
                      )}>
                        {urlTestResults[attachment.id].message}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <Card padding="lg" className="bg-gray-50 border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
        
        <div className="space-y-2">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Ensure Storage Bucket is Public</p>
              <p className="text-xs text-gray-600">The referral_attachments bucket should be set to public for direct URL access.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Verify File URLs</p>
              <p className="text-xs text-gray-600">Each attachment should have a valid URL pointing to the Supabase storage.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Check CORS Settings</p>
              <p className="text-xs text-gray-600">Ensure CORS is properly configured to allow access from your application domain.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          Close Diagnostic
        </Button>
      </div>
    </div>
  );
};

export default AttachmentDiagnostic;
