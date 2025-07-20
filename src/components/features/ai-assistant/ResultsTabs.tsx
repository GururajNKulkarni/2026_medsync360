import React from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, Edit3, Copy, Download } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface MedicalResults {
  summary: {
    chiefComplaint: string;
    assessment: string;
    plan: string;
    confidence: number;
  };
  detailedRecord: {
    hpi: string;
    pmh: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      confidence: number;
    }>;
    allergies: string[];
    vitals: {
      bloodPressure: string;
      heartRate: string;
      temperature: string;
      respiratoryRate: string;
      oxygenSaturation: string;
      confidence: number;
    };
    physicalExam: string;
    ros: string;
  };
  codes: {
    icd10: Array<{
      code: string;
      description: string;
      confidence: number;
    }>;
    cpt: Array<{
      code: string;
      description: string;
      confidence: number;
    }>;
  };
}

interface ResultsTabsProps {
  results: MedicalResults;
  transcript: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'transcript', label: 'Transcript', icon: MessageSquare }
];

export const ResultsTabs: React.FC<ResultsTabsProps> = ({
  results,
  transcript,
  activeTab,
  onTabChange
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTimestamp = (index: number) => {
    // Mock timestamp calculation
    const minutes = Math.floor(index / 10);
    const seconds = (index % 10) * 6;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };

  const handleExportTranscript = () => {
    try {
      // Create a text blob with the transcript
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
      
      toast.success('Transcript exported successfully');
    } catch (error) {
      console.error('Error exporting transcript:', error);
      toast.error('Failed to export transcript');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chief Complaint */}
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Chief Complaint</h4>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getConfidenceColor(results.summary.confidence)
                  )}>
                    {results.summary.confidence}%
                  </span>
                </div>
                <p className="text-gray-700">{results.summary.chiefComplaint}</p>
              </Card>

              {/* Assessment */}
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Assessment</h4>
                  <Button variant="ghost" size="sm">
                    <Edit3 size={14} />
                  </Button>
                </div>
                <p className="text-gray-700">{results.summary.assessment}</p>
              </Card>
            </div>

            {/* Plan */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Treatment Plan</h4>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit3 size={14} />
                  </Button>
                </div>
              </div>
              <p className="text-gray-700">{results.summary.plan}</p>
            </Card>
          </motion.div>
        )}

        {activeTab === 'transcript' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Full Conversation Transcript</h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCopyToClipboard(transcript, 'Transcript')}
                >
                  <Copy size={14} className="mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportTranscript}
                >
                  <Download size={14} className="mr-1" />
                  Export
                </Button>
              </div>
            </div>
            
            <Card padding="md" className="bg-gray-50">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {transcript.split('\n').map((line, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-xs text-gray-500 font-mono w-12 flex-shrink-0">
                      {formatTimestamp(index)}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-600 mr-2">
                        {index % 3 === 0 ? 'Doctor:' : 'Patient:'}
                      </span>
                      <span className="text-gray-700">{line}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};