
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
import { Mic, MicOff, Video, VideoOff, BrainCircuit, User } from 'lucide-react';
import { detectPersonAndTurnOffCamera } from '@/ai/flows/auto-turn-off-camera';

declare global {
  interface Window {
    chrome: any;
  }
}

export function PrivacyControls() {
  const { toast } = useToast();
  const portRef = useRef<any>(null);

  // Mic state
  const [micEnabled, setMicEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState([0.5]);
  const [muteDuration, setMuteDuration] = useState(5);
  const [micStatus, setMicStatus] = useState<'listening' | 'muted' | 'off' | 'analyzing'>('off');

  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [personDescription, setPersonDescription] = useState('A person sitting at a desk');
  const [cameraStatus, setCameraStatus] = useState<'on' | 'off' | 'analyzing'>('off');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effect to manage the connection to the background script
  useEffect(() => {
    // Check if we are in a chrome extension context
    if (typeof window.chrome === 'undefined' || !window.chrome.runtime || !window.chrome.runtime.connect) {
        console.log("Not in an extension context.");
        return;
    }

    const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID;
    if (!extensionId || extensionId === 'YOUR_EXTENSION_ID_HERE') {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Extension ID is not set. Please add it to your .env file.' });
        console.error("Extension ID not set. Please set NEXT_PUBLIC_EXTENSION_ID in your .env file.");
        return;
    }

    try {
        portRef.current = chrome.runtime.connect(extensionId, { name: "privacyControls" });
    } catch (e) {
        console.error("Could not connect to extension background:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot connect to extension background. Is the extension installed and enabled?' });
        return;
    }


    const handleMessage = (message: any) => {
      if (message.action === 'updateStatus') {
        setMicStatus(message.status);
      }
    };

    portRef.current.onMessage.addListener(handleMessage);

    return () => {
      if (portRef.current) {
        portRef.current.disconnect();
        portRef.current = null;
      }
    };
  }, [toast]);
  
  // Effect to handle mic enabled/disabled toggle
  useEffect(() => {
    if (portRef.current) {
        if (micEnabled) {
            portRef.current.postMessage({ action: 'startMicMonitoring', sensitivity: sensitivity[0], muteDuration });
        } else {
            portRef.current.postMessage({ action: 'stopMicMonitoring' });
        }
    } else if (micEnabled) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot connect to extension background.' });
        setMicEnabled(false);
    }
  }, [micEnabled, sensitivity, muteDuration, toast]);


  const captureFrame = useCallback(() => {
    if (!videoRef.current || !videoRef.current.srcObject) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  }, []);

  const analyzeCameraFeed = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    setCameraStatus('analyzing');
    try {
      const result = await detectPersonAndTurnOffCamera({
        videoDataUri: frame,
        loggedInPersonDescription: personDescription,
      });

      if (!result.personDetected) {
        toast({ title: 'Privacy Alert', description: 'You are not in the frame. Turning off camera.' });
        setCameraEnabled(false); // This will trigger the cleanup effect
      } else {
         setCameraStatus('on');
      }
    } catch (error) {
      console.error('Error analyzing camera feed:', error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not analyze video feed.' });
      setCameraStatus('on');
    }
  }, [captureFrame, personDescription, toast]);

  const startCameraMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('on');
      // Start analysis interval
      analysisIntervalRef.current = setInterval(analyzeCameraFeed, 5000); // Analyze every 5 seconds
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Could not access the camera.',
      });
      setCameraEnabled(false);
    }
  }, [toast, analyzeCameraFeed]);

  const stopCameraMonitoring = useCallback(() => {
    // Stop analysis interval
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    // Stop camera stream
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
