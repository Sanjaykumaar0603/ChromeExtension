
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Timer, CheckCircle, XCircle, AlertCircle, Trash2, AreaChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SavedUrl {
  id: string;
  url: string;
  pingInterval: number;
  pingHistory: { timestamp: number, status: 'success' | 'error', duration: number }[];
  lastPingTime?: number;
}

interface PingResult {
  status: 'pending' | 'success' | 'slow' | 'error';
  message: string;
}

export function UrlManagement() {
  const [urls, setUrls] = useLocalStorage<SavedUrl[]>('savedUrls', []);
  const [newUrl, setNewUrl] = useState('');
  const [newPingInterval, setNewPingInterval] = useState<number | ''>(5);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const { toast } = useToast();
  const [expandedUrlId, setExpandedUrlId] = useState<string | null>(null);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handlePingUrl = useCallback(async (urlItem: SavedUrl, isManual: boolean = false) => {
    const startTime = Date.now();
    if (!isManual) {
      setPingResults((prev) => ({ ...prev, [urlItem.id]: { status: 'pending', message: 'Pinging...' } }));
    }

    try {
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlItem.url)}`);
      const duration = Date.now() - startTime;

      const newHistoryEntry = { timestamp: Date.now(), status: 'success' as const, duration };
      
      let newResult: PingResult;
      if (response.ok) {
        newResult = {
            status: duration > 1000 ? 'slow' : 'success',
            message: `${duration}ms`,
        };
        newHistoryEntry.status = 'success';
      } else {
        newResult = { status: 'error', message: `HTTP ${response.status}` };
        newHistoryEntry.status = 'error';
      }

      setPingResults((prev) => ({ ...prev, [urlItem.id]: newResult }));
      setUrls((prevUrls) =>
        prevUrls.map((u) =>
          u.id === urlItem.id
            ? {
                ...u,
                pingHistory: [...(u.pingHistory || []), newHistoryEntry].slice(-20),
                lastPingTime: Date.now(),
              }
            : u
        )
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const newHistoryEntry = { timestamp: Date.now(), status: 'error' as const, duration };
      setPingResults((prev) => ({ ...prev, [urlItem.id]: { status: 'error', message: 'Network Error' } }));
      setUrls((prevUrls) =>
        prevUrls.map((u) =>
          u.id === urlItem.id
            ? {
                ...u,
                pingHistory: [...(u.pingHistory || []), newHistoryEntry].slice(-20),
                lastPingTime: Date.now(),
              }
            : u
        )
      );
    }
  }, [setUrls]);

  useEffect(() => {
    // This effect manages timers for URLs.
    const currentTimers = timersRef.current;
    const urlIds = new Set(urls.map(u => u.id));

    // Start timers for new URLs
    urls.forEach(urlItem => {
      if (!currentTimers[urlItem.id]) {
        const interval = urlItem.pingInterval * 60 * 1000;
        if (interval > 0) {
          // Initial ping is delayed slightly to allow UI to settle.
          setTimeout(() => handlePingUrl(urlItem, false), 1000);
          
          currentTimers[urlItem.id] = setInterval(() => {
            handlePingUrl(urlItem, false);
          }, interval);
        }
      }
    });

    // Cleanup: find and clear timers for URLs that no longer exist.
    Object.keys(currentTimers).forEach(timerId => {
        if (!urlIds.has(timerId)) {
            clearInterval(currentTimers[timerId]);
            delete currentTimers[timerId];
        }
    });

    return () => {
      // Cleanup all timers when the component unmounts.
      Object.values(timersRef.current).forEach(clearInterval);
      timersRef.current = {};
    };
  }, [urls, handlePingUrl]);


  const handleAddUrl = () => {
    if (!newUrl.trim()) {
      toast({ title: 'Error', description: 'URL cannot be empty.', variant: 'destructive' });
      return;
    }
    if (typeof newPingInterval !== 'number' || newPingInterval <= 0) {
      toast({ title: 'Error', description: 'Ping interval must be a positive number.', variant: 'destructive' });
      return;
    }
    
    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
    }

    const newUrlItem: SavedUrl = {
      id: Date.now().toString(),
      url: formattedUrl,
      pingInterval: newPingInterval,
      pingHistory: [],
    };

    setUrls((prev) => [...prev, newUrlItem]);
    setNewUrl('');
    setNewPingInterval(5);
    toast({ title: 'Success', description: 'URL added and monitoring started.' });
  };

  const handleRemoveUrl = (id: string) => {
    // Clear the timer for the URL being removed
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
    
    setUrls((prevUrls) => prevUrls.filter((url) => url.id !== id));
    
    setPingResults((prevResults) => {
      const newResults = { ...prevResults };
      delete newResults[id];
      return newResults;
    });

    toast({ title: 'Success', description: 'URL removed.' });
  };

  const getStatusIcon = (status?: PingResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'slow':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Timer className="h-4 w-4 animate-spin" />;
      default:
        return null;
    }
  };
  
  const getChartData = (urlItem: SavedUrl) => {
      return (urlItem.pingHistory || []).map(h => ({
          time: new Date(h.timestamp).toLocaleTimeString(),
          duration: h.status === 'error' ? null : h.duration,
      }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="example.com"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <div className="flex gap-2">
            <Input
            type="number"
            placeholder="Ping interval (minutes)"
            value={newPingInterval}
            onChange={(e) => setNewPingInterval(e.target.value === '' ? '' : Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            min="1"
            className="w-full"
            />
            <Button onClick={handleAddUrl}>
                Add URL
            </Button>
        </div>
      </div>

      <ScrollArea className="h-80 pr-4">
        <div className="space-y-4">
          {urls.length > 0 ? (
            urls.map((urlItem) => (
              <Card key={urlItem.id}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{urlItem.url}</div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                {getStatusIcon(pingResults[urlItem.id]?.status)}
                                <span>{pingResults[urlItem.id]?.message || 'Waiting for first ping...'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setExpandedUrlId(expandedUrlId === urlItem.id ? null : urlItem.id)}>
                                <AreaChart className="h-4 w-4"/>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePingUrl(urlItem, true)}>
                            Ping
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveUrl(urlItem.id)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     {expandedUrlId === urlItem.id && (urlItem.pingHistory || []).length > 0 && (
                        <div className="mt-4 h-40">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getChartData(urlItem)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" fontSize={10} />
                                <YAxis fontSize={10} unit="ms" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))'
                                    }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line type="monotone" dataKey="duration" name="Response time" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No URLs to monitor yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
