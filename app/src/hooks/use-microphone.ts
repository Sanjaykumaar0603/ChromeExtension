
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
  const isMutedBySilenceRef = useRef(false);

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
    isMutedBySilenceRef.current = false;
  }, []);

  const startMic = useCallback(async () => {
    try {
        if (streamRef.current) return; // Already running

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const newAnalyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(newAnalyser);
        setAnalyser(newAnalyser);

        setMicStatus('listening');
        isMutedBySilenceRef.current = false;
        silenceStartRef.current = Date.now();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (onMicError) {
            onMicError('Could not access microphone. Please check permissions.');
        }
        stopMuting();
    }
  }, [onMicError, stopMuting]);


  const stopMicForSilence = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
    }
     setAnalyser(null);
    setMicStatus('muted');
    isMutedBySilenceRef.current = true;
  }, []);


  const startMuting = useCallback(() => {
    startMic();

    if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
    }

    intervalIdRef.current = setInterval(() => {
        if (isMutedBySilenceRef.current) {
            // If muted, we need to listen for ambient noise to unmute
            // We can't use the analyser, so we'll re-acquire the mic briefly
            navigator.mediaDevices.getUserMedia({ audio: true }).then(transientStream => {
                const transientAudioContext = new AudioContext();
                const transientAnalyser = transientAudioContext.createAnalyser();
                const transientSource = transientAudioContext.createMediaStreamSource(transientStream);
                transientSource.connect(transientAnalyser);
                
                transientAnalyser.fftSize = 512;
                const bufferLength = transientAnalyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                transientAnalyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for(let i = 0; i < dataArray.length; i++) {
                    sum += Math.abs(dataArray[i] - 128);
                }
                const average = sum / dataArray.length;
                
                // Stop the transient stream immediately
                transientStream.getTracks().forEach(track => track.stop());
                transientAudioContext.close();

                if (average > 2.5) { // Slightly higher threshold to unmute
                    startMic();
                }
            }).catch(() => {
                // Ignore errors here, as the user might have revoked permission
            });
            return;
        }


        if (!analyser || !streamRef.current) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / dataArray.length;
        const isSilent = average < 2;

        if (!isSilent) {
            silenceStartRef.current = Date.now();
            if (micStatus !== 'listening') {
                 setMicStatus('listening');
            }
        } else {
            const silenceDuration = (Date.now() - silenceStartRef.current) / 1000;
            if (silenceDuration > silenceThreshold) {
                stopMicForSilence();
            }
        }
    }, 500); // Check every 500ms

  }, [startMic, stopMicForSilence, analyser, silenceThreshold, micStatus]);


  useEffect(() => {
    // This is a cleanup effect that runs when the component unmounts
    return () => {
      stopMuting();
    };
  }, [stopMuting]);

  return { micStatus, startMuting, stopMuting, analyserNode: analyser };
}
