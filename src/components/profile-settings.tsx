
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";

interface ProfileSettingsProps {
  referencePhoto: string;
  onRetakePhoto: () => void;
}

export function ProfileSettings({ referencePhoto, onRetakePhoto }: ProfileSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile Photo</CardTitle>
        <CardDescription>
          This is the photo used to verify your presence on camera.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-lg overflow-hidden w-48 h-48 border">
            <img
                src={referencePhoto}
                alt="Your reference"
                className="w-full h-full object-cover"
            />
        </div>
        <Button onClick={onRetakePhoto} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retake Photo
        </Button>
      </CardContent>
    </Card>
  );
}
