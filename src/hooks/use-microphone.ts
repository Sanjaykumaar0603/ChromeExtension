
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

type MicStatus = 'listening' | 'muted' | 'off';

interface UseMicrophoneProps {
  silenceThreshold?: number; // seconds
  onMicError?: (error: string) => void;
}

export function useMicrophone({
  silenceThreshold = 5,
  onMicError,
}: UseMicrophoneProps) {
  const [micStatus, setMicStatus] = useState<MicStatus>('off');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number>(Date.now());

  const stopMuting = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    setMicStatus('off');
    setAnalyser(null);
  }, []);

  const startMuting = useCallback(async () => {
    if (streamRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const newAnalyser = audioContext.createAnalyser();
      setAnalyser(newAnalyser);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(newAnalyser);

      newAnalyser.fftSize = 512;
      const bufferLength = newAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      silenceStartRef.current = Date.now();
      setMicStatus('listening');

      intervalIdRef.current = setInterval(() => {
        if (!newAnalyser || !streamRef.current) return;

        newAnalyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / dataArray.length;
        const isSilent = average < 2; // More robust silence detection

        const audioTrack = streamRef.current.getAudioTracks()[0];

        if (!audioTrack) return;

        if (!isSilent) {
          silenceStartRef.current = Date.now();
          if (!audioTrack.enabled) {
            audioTrack.enabled = true;
          }
          setMicStatus('listening');
        } else {
          const silenceDuration = (Date.now() - silenceStartRef.current) / 1000;
          if (silenceDuration > silenceThreshold && audioTrack.enabled) {
            audioTrack.enabled = false;
            setMicStatus('muted');
          }
        }
      }, 200);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (onMicError) {
        onMicError('Could not access microphone. Please check permissions.');
      }
      stopMuting();
    }
  }, [onMicError, silenceThreshold, stopMuting]);

  useEffect(() => {
    return () => {
      stopMuting();
    };
  }, [stopMuting]);

  return { micStatus, startMuting, stopMuting, analyserNode: analyser };
}
