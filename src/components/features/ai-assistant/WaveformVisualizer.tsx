import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface WaveformVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  duration: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  audioLevel,
  duration
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      // Add new audio level to waveform data
      setWaveformData(prev => {
        const newData = [...prev, audioLevel || Math.random() * 0.5 + 0.1];
        // Keep only last 100 data points for better performance
        return newData.slice(-100);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const { width, height } = rect;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (waveformData.length === 0) {
      // Show placeholder when no data
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw waveform
    const barWidth = width / Math.max(waveformData.length, 50);
    const centerY = height / 2;

    waveformData.forEach((level, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(level * centerY * 0.8, 2); // Minimum height of 2px
      
      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      if (isRecording) {
        gradient.addColorStop(0, `rgba(59, 130, 246, ${0.8 + level * 0.2})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.6 + level * 0.4})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, ${0.8 + level * 0.2})`);
      } else {
        gradient.addColorStop(0, `rgba(107, 114, 128, ${0.5 + level * 0.3})`);
        gradient.addColorStop(0.5, `rgba(107, 114, 128, ${0.3 + level * 0.4})`);
        gradient.addColorStop(1, `rgba(107, 114, 128, ${0.5 + level * 0.3})`);
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight, Math.max(barWidth - 1, 1), barHeight * 2);
    });

    // Draw center line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Add recording indicator
    if (isRecording) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 20, 20, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

  }, [waveformData, isRecording]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Audio Waveform</h4>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
          <span>Level: {Math.round((audioLevel || 0) * 100)}%</span>
        </div>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-20 bg-white rounded border border-gray-200"
          style={{ width: '100%', height: '80px' }}
        />
        
        {isRecording && (
          <div className="absolute top-2 right-2 flex items-center gap-2 text-sm text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording</span>
          </div>
        )}
        
        {!isRecording && waveformData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            Click "Start Recording" to begin
          </div>
        )}
      </div>
    </motion.div>
  );
};