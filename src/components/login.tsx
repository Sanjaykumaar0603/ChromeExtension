"use client";

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export function Login() {
  const { login, error } = useAuth();

  return (
    <main className="flex flex-col items-center justify-center bg-background p-4 w-[400px] h-[600px]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">
              Smart Privacy
            </CardTitle>
          </div>
          <CardDescription className="pt-2">
            Please log in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={login} className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.4 76.4c-24.1-23.4-58.2-38-96.5-38-83.8 0-152.3 68.5-152.3 152.3s68.5 152.3 152.3 152.3c99.9 0 132.3-81.2 135.5-121.2H248v-96.1h239.9c1.4 9.4 2.1 19.3 2.1 29.7z"></path></svg>
            Sign in with Google
          </Button>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
