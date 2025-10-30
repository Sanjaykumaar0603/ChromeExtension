"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, LogOut, Globe, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrivacyControls } from '@/components/privacy-controls';
import { UrlManagement } from '@/components/url-management';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { SetupCameraProfile } from '@/components/setup-camera-profile';
import { ProfileSettings } from '@/components/profile-settings';

export default function Home() {
  const [referencePhoto, setReferencePhoto] = useLocalStorage<string | null>('referencePhoto', null);

  if (!referencePhoto) {
    return <SetupCameraProfile onPhotoTaken={setReferencePhoto} />;
  }

  return (
    <main className="flex flex-col items-center justify-start bg-background p-4 w-[400px]">
      <Card className="w-full max-w-2xl mx-auto shadow-none bg-card border-0">
        <CardHeader className="text-center relative">
          <div className="flex items-center justify-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">
              Smart Privacy
            </CardTitle>
          </div>
          <CardDescription className="pt-2">
            Your personal dashboard for web privacy and utility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="privacy" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="privacy">
                <Shield className="mr-2 h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="pinger">
                <Globe className="mr-2 h-4 w-4" />
                Pinger
              </TabsTrigger>
              <TabsTrigger value="profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </TabsTrigger>
            </TabsList>
            <TabsContent value="privacy" className="mt-4">
              <PrivacyControls referencePhoto={referencePhoto} />
            </TabsContent>
            <TabsContent value="pinger" className="mt-4">
              <UrlManagement />
            </TabsContent>
            <TabsContent value="profile" className="mt-4">
                <ProfileSettings
                    referencePhoto={referencePhoto}
                    onRetakePhoto={() => setReferencePhoto(null)}
                />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
