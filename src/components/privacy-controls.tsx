"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzeAudioAndMute } from '@/ai/flows/auto-mute-microphone';
import { detectPersonAndTurnOffCamera } from '@/ai/flows/auto-turn-off-camera';
import { Mic, MicOff, Video, VideoOff, BrainCircuit, User } from 'lucide-react';

declare global {
  interface Window {
    chrome: any;
  }
}

export function PrivacyControls() {
  const { toast } = useToast();

  const [micEnabled, setMicEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState([0.5]);
  const [muteDuration, setMuteDuration] = useState(5);
  const [micStatus, setMicStatus] = useState<
    'listening' | 'muted' | 'off' | 'analyzing'
  >('off');

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [personDescription, setPersonDescription] = useState(
    'A person sitting at a desk'
  );
  const [cameraStatus, setCameraStatus] = useState<'on' | 'off' | 'analyzing'>(
    'off'
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setMicMutedState = useCallback((shouldMute: boolean) => {
    if (typeof window.chrome !== 'undefined' && window.chrome.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage({ action: 'setMicMuted', muted: shouldMute }, (response: any) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            // Don't toast here, as it can be noisy if the background is just busy.
            return;
        }
        if (response?.success) {
          setMicStatus(shouldMute ? 'muted' : 'listening');
        }
      });
    }
  }, []);

  const processAudioChunk = useCallback(
    async (base64Audio: string) => {
        if (!base64Audio) return;

        setMicStatus('analyzing');
        try {
          const result = await analyzeAudioAndMute({
            audioDataUri: base64Audio,
            voiceDetectionThreshold: sensitivity[0],
            muteDuration: muteDuration,
          });
          setMicMutedState(result.shouldMute);
        } catch (error) {
          console.error('AI audio analysis failed:', error);
          toast({
            variant: 'destructive',
            title: 'AI Error',
            description: 'Could not analyze audio.',
          });
          setMicStatus('listening');
        }
    },
    [sensitivity, muteDuration, toast, setMicMutedState]
  );

  const startMicMonitoring = useCallback(() => {
    if (typeof window.chrome === 'undefined' || !window.chrome.runtime?.sendMessage) {
        toast({ variant: "destructive", title: "Error", description: "Cannot connect to extension background." });
        setMicEnabled(false);
        return;
    }
    window.chrome.runtime.sendMessage({ action: 'startMicMonitoring' }, (response: any) => {
        if (chrome.runtime.lastError) {
             toast({ variant: "destructive", title: "Capture Error", description: chrome.runtime.lastError.message || "Could not start microphone monitoring."});
             setMicEnabled(false);
             setMicStatus('off');
             return;
        }
        if (response?.success) {
            setMicStatus('listening');
            toast({ title: 'Success', description: 'Microphone monitoring started.' });
        } else {
            toast({ variant: "destructive", title: "Capture Error", description: response?.message || "Could not start microphone monitoring."});
            setMicEnabled(false);
            setMicStatus('off');
        }
    });
  }, [toast]);


  const stopMicMonitoring = useCallback(() => {
    if (typeof window.chrome !== 'undefined' && window.chrome.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage({ action: 'stopMicMonitoring' }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
        setMicStatus('off');
      });
    }
  }, []);

  // Effect to handle messages from the background script
  useEffect(() => {
    if (typeof window.chrome === 'undefined' || !window.chrome.runtime) return;

    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.action === 'processAudioChunk' && message.audioDataUri) {
        processAudioChunk(message.audioDataUri);
      } else if (message.action === 'micMonitoringStopped') {
        setMicStatus('off');
        setMicEnabled(false);
      }
    };
    
    window.chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      if (window.chrome.runtime.onMessage) {
        window.chrome.runtime.onMessage.removeListener(messageListener);
      }
    };

  }, [processAudioChunk]);

  useEffect(() => {
    if (micEnabled) {
      startMicMonitoring();
    } else {
      stopMicMonitoring();
    }
  }, [micEnabled, startMicMonitoring, stopMicMonitoring]);

  const analyzeCameraFeed = useCallback(async () => {
    if (
      !videoRef.current ||
      !cameraStreamRef.current ||
      videoRef.current.readyState < 2
    )
      return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL('image/jpeg');

    setCameraStatus('analyzing');
    try {
      const result = await detectPersonAndTurnOffCamera({
        videoDataUri: imageDataUri,
        loggedInPersonDescription: personDescription,
      });
      if (!result.personDetected) {
        // This will trigger the stopCameraMonitoring effect
        setCameraEnabled(false); 
      } else {
        setCameraStatus('on');
      }
    } catch (error) {
      console.error('AI camera analysis failed:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not analyze video feed.',
      });
      setCameraStatus('on');
    }
  }, [personDescription, toast]);

  const startCameraMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraStatus('on');
          // Interval to check for person presence every 10 seconds
          cameraIntervalRef.current = setInterval(analyzeCameraFeed, 10000);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Could not access the camera.',
      });
      setCameraEnabled(false);
    }
  }, [analyzeCameraFeed, toast]);

  const stopCameraMonitoring = useCallback(() => {
    if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
    cameraIntervalRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('off');
  }, []);

  useEffect(() => {
    if (cameraEnabled) {
      startCameraMonitoring();
    } else {
      stopCameraMonitoring();
    }
    return () => stopCameraMonitoring(); // Cleanup on unmount
  }, [cameraEnabled, startCameraMonitoring, stopCameraMonitoring]);

  const micStatusInfo = {
    off: { icon: MicOff, text: 'Disabled', color: 'text-muted-foreground' },
    listening: { icon: Mic, text: 'Listening', color: 'text-green-500' },
    muted: { icon: MicOff, text: 'Muted', color: 'text-yellow-500' },
    analyzing: {
      icon: BrainCircuit,
      text: 'Analyzing...',
      color: 'text-blue-500 animate-pulse',
    },
  };

  const cameraStatusInfo = {
    off: { icon: VideoOff, text: 'Camera Off', color: 'text-muted-foreground' },
    on: { icon: Video, text: 'Camera On', color: 'text-green-500' },
    analyzing: {
      icon: BrainCircuit,
      text: 'Analyzing...',
      color: 'text-blue-500 animate-pulse',
    },
  };

  const MicStatusIcon = micStatusInfo[micStatus].icon;
  const CameraStatusIcon = cameraStatusInfo[cameraStatus].icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Auto-Mute Microphone</CardTitle>
            <Switch checked={micEnabled} onCheckedChange={setMicEnabled} />
          </div>
          <CardDescription>
            Mute your mic automatically when no voice is detected in the current tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sensitivity">Voice Detection Sensitivity</Label>
            <Slider
              id="sensitivity"
              min={0.1}
              max={1}
              step={0.1}
              value={sensitivity}
              onValueChange={setSensitivity}
              disabled={!micEnabled}
            />
          </div>
          <div>
            <Label htmlFor="mute-duration">Mute after (seconds)</Label>
            <Input
              id="mute-duration"
              type="number"
              min="1"
              value={muteDuration}
              onChange={(e) => setMuteDuration(Number(e.target.value))}
              disabled={!micEnabled}
            />
          </div>
        </CardContent>
        <CardFooter>
          <div
            className={`flex items-center gap-2 text-sm ${micStatusInfo[micStatus].color}`}
          >
            <MicStatusIcon className="h-4 w-4" />
            <span>Status: {micStatusInfo[micStatus].text}</span>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Auto-Off Camera</CardTitle>
            <Switch checked={cameraEnabled} onCheckedChange={setCameraEnabled} />
          </div>
          <CardDescription>
            Turn off your camera if you're not in the frame.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="person-description">Describe Yourself</Label>
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground" />
              <Input
                id="person-description"
                placeholder="e.g., person with glasses and a blue shirt"
                value={personDescription}
                onChange={(e) => setPersonDescription(e.target.value)}
                disabled={!cameraEnabled}
              />
            </div>
          </div>
          <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
            {cameraStatus === 'off' ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <VideoOff className="h-12 w-12" />
                <p>Camera is off</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              ></video>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div
            className={`flex items-center gap-2 text-sm ${cameraStatusInfo[cameraStatus].color}`}
          >
            <CameraStatusIcon className="h-4 w-4" />
            <span>Status: {cameraStatusInfo[cameraStatus].text}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
