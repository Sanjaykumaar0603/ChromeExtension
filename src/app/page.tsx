"use client";

import { useAuth } from '@/hooks/use-auth';
import { Login } from '@/components/login';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, LogOut, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrivacyControls } from '@/components/privacy-controls';
import { UrlManagement } from '@/components/url-management';

export default function Home() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
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
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="absolute top-2 right-2"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="privacy" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="privacy">
                <Shield className="mr-2 h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="pinger">
                <Globe className="mr-2 h-4 w-4" />
                Pinger
              </TabsTrigger>
            </TabsList>
            <TabsContent value="privacy" className="mt-4">
              <PrivacyControls />
            </TabsContent>
            <TabsContent value="pinger" className="mt-4">
              <UrlManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
