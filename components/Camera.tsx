
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraProps {
  onCapture: (base64: string) => void;
  isActive: boolean;
}

const Camera: React.FC<CameraProps> = ({ onCapture, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Use more standard constraints to avoid forced zoom on some devices
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera access error:", err);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isActive, startCamera]);

  // Expose capture method via window for speed
  (window as any).captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Use actual video dimensions for capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      }
    }
    return null;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover" 
        style={{ minWidth: '100%', minHeight: '100%' }}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;
