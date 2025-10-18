import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlManagement } from '@/components/url-management';
import { PrivacyControls } from '@/components/privacy-controls';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-start bg-background p-4 w-[400px]">
      <Card className="w-full max-w-2xl mx-auto shadow-none bg-card border-0">
        <CardHeader className="text-center">
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
              <TabsTrigger value="urls">URL Manager</TabsTrigger>
            </TabsList>
            <TabsContent value="privacy" className="mt-6">
              <PrivacyControls />
            </TabsContent>
            <TabsContent value="urls" className="mt-6">
              <UrlManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
