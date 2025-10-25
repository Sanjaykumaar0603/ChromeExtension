
"use client";

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode;
}

export function AudioVisualizer({ analyserNode }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || !analyserNode) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    // Get computed styles for theme colors
    const style = getComputedStyle(document.body);
    const backgroundColor = style.getPropertyValue('--secondary');
    const foregroundColor = style.getPropertyValue('--primary');

    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasCtx) return;
      
      animationFrameIdRef.current = requestAnimationFrame(draw);

      analyserNode.getByteTimeDomainData(dataArray);

      // Fill background
      canvasCtx.fillStyle = `hsl(${backgroundColor})`;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = `hsl(${foregroundColor})`;
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      if(animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [analyserNode]);

  return <canvas ref={canvasRef} width="300" height="96" className="w-full h-full rounded-lg" />;
}

    