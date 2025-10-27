
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, RefreshCcw } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


interface SetupCameraProfileProps {
  onPhotoTaken: (photoDataUri: string) => void;
}

export function SetupCameraProfile({ onPhotoTaken }: SetupCameraProfileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (photo) return; // Don't ask for permission if photo is already taken
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to set up your profile.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [photo, toast]);

  const handleTakePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg');
    setPhoto(dataUri);
  }, []);

  const handleRetake = () => {
    setPhoto(null);
  };
  
  const handleConfirm = () => {
    if (photo) {
        onPhotoTaken(photo);
        toast({ title: 'Profile Set!', description: 'Your reference photo has been saved.' });
    }
  }

  return (
    <main className="flex flex-col items-center justify-center bg-background p-4 w-[400px] h-[600px]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set Up Your Profile</CardTitle>
          <CardDescription>
            Take a photo of yourself. This will be used to verify your presence and automatically manage your camera privacy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
             {photo ? (
                <img src={photo} alt="Your snapshot" className="w-full h-full object-cover"/>
             ): (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
             )}
          </div>
          {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature.
                </AlertDescription>
              </Alert>
            )}
        </CardContent>
        <CardFooter className="flex justify-between">
            {photo ? (
                <>
                    <Button variant="outline" onClick={handleRetake}>
                        <RefreshCcw className="mr-2"/> Retake
                    </Button>
                    <Button onClick={handleConfirm}>
                        Confirm
                    </Button>
                </>
            ) : (
                <Button onClick={handleTakePhoto} disabled={!hasCameraPermission} className="w-full">
                    <Camera className="mr-2"/> Take Photo
                </Button>
            )}
        </CardFooter>
      </Card>
    </main>
  );
}
