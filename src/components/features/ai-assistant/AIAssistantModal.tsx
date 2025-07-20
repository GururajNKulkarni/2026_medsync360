import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Brain, 
  User, 
  Calendar, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Volume2,
  Loader2,
  Save,
  Download,
  Share2,
  Edit3,
  Flag,
  Smartphone,
  Monitor
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import { useResponsive } from '../../../hooks/useResponsive';
import { useAudioRecording } from '../../../hooks/useAudioRecording';
import { useMedicalAI } from '../../../hooks/useMedicalAI';
import { PatientInfoForm } from './PatientInfoForm';
import { RecordingControls } from './RecordingControls';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ProcessingStages } from './ProcessingStages';
import { ResultsTabs } from './ResultsTabs';
import { ConversationHistory } from './ConversationHistory';
import toast from 'react-hot-toast';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'record' | 'history' | 'edit';
  conversationId?: string;
}

interface PatientInfo {
  name: string;
  patientId: string;
  dateOfBirth: string;
  visitDate: string;
  medicalRecordNumber: string;
  insuranceInfo: string;
  appointmentType: string;
}

interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress: number;
  color: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  mode = 'record',
  conversationId
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [currentMode, setCurrentMode] = useState(mode);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    patientId: '',
    dateOfBirth: '',
    visitDate: new Date().toISOString().split('T')[0],
    medicalRecordNumber: '',
    insuranceInfo: '',
    appointmentType: ''
  });

  // Recording state
  const {
    isRecording,
    isPaused,
    recordingDuration,
    audioLevel,
    transcript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording
  } = useAudioRecording();

  // AI Processing state
  const {
    isProcessing,
    processingStage,
    results,
    confidence,
    processTranscript,
    saveConversation
  } = useMedicalAI();

  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    { id: 'recording', label: 'Recording audio...', status: 'pending', progress: 0, color: 'blue' },
    { id: 'transcribing', label: 'Transcribing speech...', status: 'pending', progress: 0, color: 'orange' },
    { id: 'analyzing', label: 'Analyzing medical content...', status: 'pending', progress: 0, color: 'purple' },
    { id: 'structuring', label: 'Structuring data...', status: 'pending', progress: 0, color: 'green' },
    { id: 'complete', label: 'Processing complete!', status: 'pending', progress: 0, color: 'green' }
  ]);

  const [activeTab, setActiveTab] = useState('summary');
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Auto-generate patient ID if empty
  useEffect(() => {
    if (!patientInfo.patientId && patientInfo.name) {
      const id = `P${Date.now().toString().slice(-6)}`;
      setPatientInfo(prev => ({ ...prev, patientId: id }));
    }
  }, [patientInfo.name, patientInfo.patientId]);

  // Update processing stages based on current stage
  useEffect(() => {
    if (processingStage) {
      setProcessingStages(prev => prev.map(stage => {
        if (stage.id === processingStage.id) {
          return { ...stage, status: 'active', progress: processingStage.progress };
        } else if (processingStage.completedStages?.includes(stage.id)) {
          return { ...stage, status: 'complete', progress: 100 };
        }
        return stage;
      }));
    }
  }, [processingStage]);

  const handleStartRecording = useCallback(async () => {
    if (!patientInfo.name.trim()) {
      alert('Please enter patient name before recording');
      return;
    }
    
    setShowGuidelines(false);
    await startRecording();
  }, [patientInfo.name, startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
    if (transcript) {
      await processTranscript(transcript, patientInfo);
    }
  }, [stopRecording, transcript, processTranscript, patientInfo]);

  const handleProcessWithAI = useCallback(async () => {
    if (transcript) {
      await processTranscript(transcript, patientInfo);
    }
  }, [transcript, processTranscript, patientInfo]);

  const handleExportRecord = () => {
    if (!results) return;
    
    try {
      // Create a JSON blob with the medical record data
      const recordData = {
        patientInfo,
        transcript,
        results,
        timestamp: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(recordData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-record-${patientInfo.patientId || Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
      
      toast.success('Medical record exported successfully');
    } catch (error) {
      console.error('Error exporting record:', error);
      toast.error('Failed to export medical record');
    }
  };
  
  const handleShareRecord = () => {
    if (!results) return;
    
    try {
      // Create a shareable text summary
      const summary = `
Medical Record for ${patientInfo.name} (${patientInfo.patientId || 'No ID'})
Date: ${patientInfo.visitDate || new Date().toLocaleDateString()}

Chief Complaint: ${results.summary.chiefComplaint}

Assessment: ${results.summary.assessment}

Plan: ${results.summary.plan}
      `.trim();
      
      // Copy to clipboard
      navigator.clipboard.writeText(summary)
        .then(() => toast.success('Summary copied to clipboard'))
        .catch(() => toast.error('Failed to copy to clipboard'));
    } catch (error) {
      console.error('Error sharing record:', error);
      toast.error('Failed to share medical record');
    }
  };

  const handleSaveRecord = useCallback(async () => {
    if (results) {
      await saveConversation({
        patientInfo,
        transcript,
        results,
        confidence
      });
      onClose();
    }
  }, [results, patientInfo, transcript, confidence, saveConversation, onClose]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingButtonState = () => {
    if (isProcessing) return { text: 'Processing...', color: 'bg-orange-500', icon: Loader2 };
    if (isRecording) return { text: 'Stop Recording', color: 'bg-red-500 animate-pulse', icon: Square };
    return { text: 'Start Recording', color: 'bg-green-500', icon: Mic };
  };

  const buttonState = getRecordingButtonState();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container - Fully Responsive */}
        <div className={cn(
          "fixed inset-0 flex",
          isMobile ? "items-end" : "items-center justify-center",
          isMobile ? "p-0" : "p-4"
        )}>
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: isMobile ? 1 : 0.95, 
              y: isMobile ? '100%' : 20 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: isMobile ? 1 : 0.95, 
              y: isMobile ? '100%' : 20 
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "bg-white shadow-2xl w-full flex flex-col",
              isMobile ? [
                "h-full max-h-[95vh] rounded-t-2xl",
                "overflow-hidden"
              ] : [
                "max-w-6xl max-h-[90vh] rounded-xl",
                "mx-auto"
              ]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Responsive */}
            <div className={cn(
              "flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex-shrink-0",
              isMobile ? "p-4 rounded-t-2xl" : "p-6 rounded-t-xl"
            )}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={cn(
                    "font-bold truncate",
                    isMobile ? "text-lg" : "text-xl"
                  )}>
                    {currentMode === 'history' ? 'Conversation History' : 'AI Medical Assistant'}
                  </h2>
                  <p className={cn(
                    "text-blue-100 truncate",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {currentMode === 'history' 
                      ? 'Manage recorded conversations'
                      : 'Record and process medical conversations'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Mode Toggle - Hidden on mobile */}
                {!isMobile && (
                  <div className="bg-white/20 rounded-lg p-1">
                    <button
                      onClick={() => setCurrentMode('record')}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                        currentMode === 'record' 
                          ? 'bg-white text-blue-600' 
                          : 'text-white hover:bg-white/20'
                      )}
                    >
                      Record
                    </button>
                    <button
                      onClick={() => setCurrentMode('history')}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                        currentMode === 'history' 
                          ? 'bg-white text-blue-600' 
                          : 'text-white hover:bg-white/20'
                      )}
                    >
                      History
                    </button>
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className={cn(
                    "text-white hover:bg-white/20 rounded-lg transition-colors",
                    "p-2 min-h-[44px] min-w-[44px]" // Touch target
                  )}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Mode Toggle for Mobile */}
            {isMobile && (
              <div className="flex bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setCurrentMode('record')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    currentMode === 'record' 
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600'
                  )}
                >
                  <Mic size={16} />
                  Record
                </button>
                <button
                  onClick={() => setCurrentMode('history')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    currentMode === 'history' 
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600'
                  )}
                >
                  <FileText size={16} />
                  History
                </button>
              </div>
            )}

            {/* Content - Scrollable and Responsive */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {currentMode === 'history' ? (
                <div className="flex-1 overflow-y-auto">
                  <ConversationHistory onEditConversation={(id) => {
                    setCurrentMode('edit');
                    // Load conversation data
                  }} />
                </div>
              ) : (
                <div className={cn(
                  "flex flex-1 overflow-hidden min-h-0",
                  isMobile ? "flex-col" : "flex-row"
                )}>
                  {/* Left Panel - Patient Info & Controls */}
                  <div className={cn(
                    "bg-gray-50 border-gray-200 overflow-y-auto flex-shrink-0",
                    isMobile ? [
                      "border-b max-h-[40vh] p-4"
                    ] : [
                      "border-r w-80 p-6"
                    ]
                  )}>
                    <PatientInfoForm
                      patientInfo={patientInfo}
                      onChange={setPatientInfo}
                      disabled={isRecording || isProcessing}
                    />

                    {/* Recording Controls */}
                    <div className="mt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Recording Controls</h3>
                      
                      {/* Timer and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xl font-mono font-bold text-gray-900">
                          {formatDuration(recordingDuration)}
                        </div>
                        <div className="flex items-center gap-2">
                          {isRecording && (
                            <div className="flex items-center gap-1 text-red-600">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium">Recording</span>
                            </div>
                          )}
                          {audioLevel > 0 && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Volume2 size={16} />
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 transition-all duration-100"
                                  style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Recording Button */}
                      <Button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={isProcessing || !patientInfo.name.trim()}
                        className={cn(
                          "w-full text-base font-semibold text-white border-0 min-h-[48px]",
                          buttonState.color
                        )}
                      >
                        <buttonState.icon size={24} className={cn(
                          "mr-3",
                          buttonState.icon === Loader2 && "animate-spin"
                        )} />
                        {buttonState.text}
                      </Button>

                      {!patientInfo.name.trim() && (
                        <p className="text-xs text-red-600 mt-2 text-center">
                          Please enter patient name before recording
                        </p>
                      )}

                      {/* Secondary Controls */}
                      {isRecording && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={isPaused ? resumeRecording : pauseRecording}
                            variant="outline"
                            className="flex-1 min-h-[44px]"
                          >
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                            {isPaused ? 'Resume' : 'Pause'}
                          </Button>
                        </div>
                      )}

                      {/* Recording Guidelines */}
                      {showGuidelines && !isRecording && (
                        <Card padding="sm" className="mt-3 bg-blue-50 border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">Recording Guidelines:</h4>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>• Speak clearly and at a consistent volume</li>
                            <li>• Ensure quiet environment for best transcription accuracy</li>
                          </ul>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Waveform Visualizer */}
                    {(isRecording || transcript) && (
                      <div className="p-3 border-b border-gray-200 flex-shrink-0">
                        <WaveformVisualizer
                          isRecording={isRecording}
                          audioLevel={audioLevel}
                          duration={recordingDuration}
                        />
                      </div>
                    )}

                    {/* Processing Stages */}
                    {isProcessing && (
                      <div className="p-3 border-b border-gray-200 flex-shrink-0">
                        <ProcessingStages stages={processingStages} />
                      </div>
                    )}

                    {/* Live Transcript */}
                    <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <h3 className="text-base font-semibold text-gray-900">Live Transcript</h3>
                        {transcript && !isProcessing && !results && (
                          <Button
                            onClick={handleProcessWithAI}
                            className="bg-blue-600 text-white min-h-[44px]"
                          >
                            <Brain size={16} className="mr-2" />
                            Process with AI
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex-1 border border-gray-300 rounded-lg p-3 overflow-y-auto bg-white min-h-0">
                        {transcript ? (
                          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-sm">
                            {transcript}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            {isRecording 
                              ? "Listening for speech..."
                              : "Click 'Start Recording' to begin"
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Results Display */}
                    {results && (
                      <div className="border-t border-gray-200 bg-green-50 p-3 flex-shrink-0 max-h-[40%] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-900">Processing Complete</span>
                            <span className="text-sm text-green-700">
                              Confidence: {confidence}% • Review recommended
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="min-h-[44px]">
                              <Edit3 size={16} className="mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="min-h-[44px]">
                              <Flag size={16} className="mr-1" />
                              Flag for Review
                            </Button>
                          </div>
                        </div>

                        <ResultsTabs
                          results={results}
                          transcript={transcript}
                          activeTab={activeTab}
                          onTabChange={setActiveTab}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions - Responsive */}
            {currentMode === 'record' && (
              <div className={cn(
                "flex items-center justify-between border-t border-gray-200 bg-gray-50 flex-shrink-0",
                isMobile ? "flex-col gap-3 p-4" : "p-4"
              )}>
                <div className={cn(
                  "text-xs text-gray-600",
                  isMobile && "text-center"
                )}>
                  {results ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle size={16} className="text-green-600" />
                      Medical record processed and ready for review
                    </span>
                  ) : transcript ? (
                    "Transcript ready for AI processing"
                  ) : (
                    "Record patient conversation to generate medical documentation"
                  )}
                </div>
                
                <div className={cn(
                  "flex gap-3",
                  isMobile && "w-full"
                )}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onClose}
                    className={cn(
                      "min-h-[44px]",
                      isMobile && "flex-1"
                    )}
                  >
                    Cancel
                  </Button>
                  {results && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleExportRecord}
                        disabled={!results}
                        className={cn(
                          "min-h-[44px]",
                          isMobile && "flex-1"
                        )}
                      >
                        <Download size={16} className="mr-2" />
                        Export
                      </Button>
                      {!isMobile && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleShareRecord}
                          disabled={!results}
                          className="min-h-[44px]"
                        >
                          <Share2 size={16} className="mr-2" />
                          Share
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={handleSaveRecord} 
                        disabled={!results}
                        className={cn(
                          "bg-blue-600 text-white min-h-[44px]",
                          isMobile && "flex-1"
                        )}
                      >
                        <Save size={16} className="mr-2" />
                        Save Record
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};