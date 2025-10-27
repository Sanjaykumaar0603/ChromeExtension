
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, BrainCircuit } from 'lucide-react';
import { detectPersonAndTurnOffCamera } from '@/ai/flows/auto-turn-off-camera';
import { useMicrophone } from '@/hooks/use-microphone';
import { AudioVisualizer } from './AudioVisualizer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PrivacyControlsProps {
  referencePhoto: string;
}

export function PrivacyControls({ referencePhoto }: PrivacyControlsProps) {
  const { toast } = useToast();

  // Mic state
  const [micEnabled, setMicEnabled] = useState(false);
  const [muteDuration, setMuteDuration] = useState(5);
  const { micStatus, startMuting, stopMuting, analyserNode } = useMicrophone({
    silenceThreshold: muteDuration,
    onMicError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Mic Error',
        description: error,
      });
      setMicEnabled(false);
    }
  });


  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'on' | 'off' | 'analyzing'>('off');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const absenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mic Toggle
  const handleMicToggle = (enabled: boolean) => {
    setMicEnabled(enabled);
    if (enabled) {
      startMuting();
    } else {
      stopMuting();
    }
  };


  const captureFrame = useCallback(() => {
    if (!videoRef.current || !videoRef.current.srcObject || videoRef.current.paused || videoRef.current.ended || videoRef.current.videoWidth === 0) return null;
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
        videoFrameDataUri: frame,
        referencePhotoDataUri: referencePhoto,
      });

      if (!result.personDetected) {
        if (!absenceTimerRef.current) {
          absenceTimerRef.current = setTimeout(() => {
            toast({ title: 'Privacy Alert', description: 'You have been away for 5 seconds. Turning off camera.' });
            setCameraEnabled(false); // This will trigger the cleanup effect
          }, 5000);
        }
      } else {
        if (absenceTimerRef.current) {
          clearTimeout(absenceTimerRef.current);
          absenceTimerRef.current = null;
        }
      }
      setCameraStatus('on');
    } catch (error) {
      console.error('Error analyzing camera feed:', error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not analyze video feed.' });
      setCameraStatus('on');
    }
  }, [captureFrame, referencePhoto, toast]);
  
  const stopCameraMonitoring = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
     if (absenceTimerRef.current) {
      clearTimeout(absenceTimerRef.current);
      absenceTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('off');
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (cameraEnabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true});
          setHasCameraPermission(true);
          cameraStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraStatus('on');
          analysisIntervalRef.current = setInterval(analyzeCameraFeed, 1000); // Check every second
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
          setCameraEnabled(false);
          setCameraStatus('off');
        }
      } else {
        stopCameraMonitoring();
        setHasCameraPermission(null);
      }
    };
    
    getCameraPermission();
    
    return () => {
        stopCameraMonitoring();
    }
  }, [cameraEnabled, analyzeCameraFeed, stopCameraMonitoring, toast]);

  // Sync camera mic with auto-mute status
  useEffect(() => {
    if (cameraStreamRef.current) {
      const audioTrack = cameraStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = micStatus !== 'muted';
      }
    }
  }, [micStatus]);


  const micStatusInfo = {
    off: { icon: MicOff, text: 'Disabled', color: 'text-muted-foreground' },
    listening: { icon: Mic, text: 'Voice Detected', color: 'text-green-500 animate-pulse' },
    muted: { icon: MicOff, text: 'Muted (Silence)', color: 'text-yellow-500' },
  };

  const cameraStatusInfo = {
    off: { icon: VideoOff, text: 'Camera Off', color: 'text-muted-foreground' },
    on: { icon: Video, text: 'Camera On & Monitored', color: 'text-green-500' },
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
            <Switch checked={micEnabled} onCheckedChange={handleMicToggle} />
          </div>
          <CardDescription>
            Mute your mic automatically when no voice is detected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {micEnabled && analyserNode && (
            <div className="bg-secondary rounded-lg flex items-center justify-center overflow-hidden h-24">
              <AudioVisualizer analyserNode={analyserNode} />
            </div>
          )}
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
          <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraStatus === 'off' ? 'hidden' : ''}`}
            ></video>
            {cameraStatus === 'off' && (
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <VideoOff className="h-12 w-12" />
                <p>Camera is off</p>
              </div>
            )}
          </div>
           {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature.
                </AlertDescription>
              </Alert>
            )}
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
