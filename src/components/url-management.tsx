"use client";

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Link,
  Trash2,
  Timer,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface SavedUrl {
  id: string;
  url: string;
}

interface PingResult {
  status: 'pending' | 'success' | 'slow' | 'error';
  message: string;
}

export function UrlManagement() {
  const [urls, setUrls] = useLocalStorage<SavedUrl[]>('savedUrls', []);
  const [newUrl, setNewUrl] = useState('');
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>(
    {}
  );
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleAddUrl = () => {
    if (newUrl.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid URL.',
      });
      return;
    }

    try {
      new URL(newUrl);
    } catch (_) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'The URL format is incorrect.',
      });
      return;
    }

    if (urls.some((u) => u.url === newUrl)) {
      toast({
        variant: 'destructive',
        title: 'URL already exists',
        description: 'This URL is already in your saved list.',
      });
      return;
    }

    setUrls([...urls, { id: crypto.randomUUID(), url: newUrl }]);
    setNewUrl('');
  };

  const handleRemoveUrl = (id: string) => {
    setUrls(urls.filter((u) => u.id !== id));
  };

  const handlePingUrl = async (id: string, url: string) => {
    setPinging((prev) => ({ ...prev, [id]: true }));
    setPingResults((prev) => ({
      ...prev,
      [id]: { status: 'pending', message: 'Pinging...' },
    }));

    const start = performance.now();
    try {
      // Use a more reliable endpoint for checking status that allows CORS
      await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store'});
      const duration = performance.now() - start;

      let result: PingResult;
      if (duration > 2000) {
        result = {
          status: 'slow',
          message: `Slow response (~${Math.round(duration)}ms)`,
        };
      } else {
        result = {
          status: 'success',
          message: `Responded in ~${Math.round(duration)}ms`,
        };
      }
      setPingResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      setPingResults((prev) => ({
        ...prev,
        [id]: { status: 'error', message: 'Site is not responding' },
      }));
    }


    setPinging((prev) => ({ ...prev, [id]: false }));
  };

  const getStatusIcon = (status: PingResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'slow':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Timer className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://example.com"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <Button onClick={handleAddUrl}>Add URL</Button>
      </div>

      <ScrollArea className="h-96 pr-4">
        <div className="space-y-4">
          {urls.length > 0 ? (
            urls.map((urlItem) => (
              <Card key={urlItem.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <a
                      href={urlItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium truncate hover:underline"
                    >
                      {urlItem.url}
                    </a>
                    {pingResults[urlItem.id] && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        {getStatusIcon(pingResults[urlItem.id].status)}
                        <span>{pingResults[urlItem.id].message}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePingUrl(urlItem.id, urlItem.url)}
                      disabled={pinging[urlItem.id]}
                    >
                      <Timer className="h-4 w-4" />
                      <span className="sr-only">Ping URL</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveUrl(urlItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove URL</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Link className="mx-auto h-12 w-12" />
              <p className="mt-4">No URLs saved yet.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
