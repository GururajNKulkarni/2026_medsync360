import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioLevel: number;
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  error: string | null;
}

interface AudioRecordingHook extends AudioRecordingState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

export const useAudioRecording = (): AudioRecordingHook => {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    recordingDuration: 0,
    audioLevel: 0,
    transcript: '',
    finalTranscript: '',
    interimTranscript: '',
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastResultIndexRef = useRef<number>(0);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        let newFinalTranscript = '';
        let newInterimTranscript = '';

        // Process only new results from the last processed index
        for (let i = lastResultIndexRef.current; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            newFinalTranscript += transcript + ' ';
            lastResultIndexRef.current = i + 1; // Update the last processed index
          } else {
            newInterimTranscript += transcript;
          }
        }

        setState(prev => {
          const updatedFinalTranscript = prev.finalTranscript + newFinalTranscript;
          const combinedTranscript = updatedFinalTranscript + newInterimTranscript;
          
          return {
            ...prev,
            finalTranscript: updatedFinalTranscript,
            interimTranscript: newInterimTranscript,
            transcript: combinedTranscript.trim()
          };
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
          setState(prev => ({
            ...prev,
            error: `Speech recognition error: ${event.error}`
          }));
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart recognition if still recording
        setState(prev => {
          if (prev.isRecording && !prev.isPaused) {
            try {
              setTimeout(() => {
                if (recognitionRef.current && prev.isRecording && !prev.isPaused) {
                  recognitionRef.current.start();
                }
              }, 100);
            } catch (error) {
              console.warn('Failed to restart speech recognition:', error);
            }
          }
          return prev;
        });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !state.isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      
      setState(prev => ({
        ...prev,
        audioLevel: normalizedLevel
      }));

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [state.isRecording]);

  // Duration timer
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      intervalRef.current = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused]);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      lastResultIndexRef.current = 0; // Reset the index

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Handle recorded data if needed
        }
      };

      mediaRecorderRef.current.start(1000); // Collect data every second

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        recordingDuration: 0,
        transcript: '',
        finalTranscript: '',
        interimTranscript: ''
      }));

      // Start audio level monitoring
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
    }
  }, [monitorAudioLevel]);

  const stopRecording = useCallback(async () => {
    try {
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Stop audio stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clear intervals and animations
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        audioLevel: 0,
        interimTranscript: '' // Clear interim but keep final transcript
      }));

    } catch (error) {
      console.error('Error stopping recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }));
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.warn('Failed to restart speech recognition:', error);
      }
    }

    setState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const resetRecording = useCallback(() => {
    lastResultIndexRef.current = 0;
    setState({
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioLevel: 0,
      transcript: '',
      finalTranscript: '',
      interimTranscript: '',
      error: null
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording
  };
};