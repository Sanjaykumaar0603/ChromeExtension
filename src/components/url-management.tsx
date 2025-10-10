"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Timer, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';  // Import chart library (Chart.js)
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register the necessary components in chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface SavedUrl {
  id: string;
  url: string;
  pingInterval: number;
  lastPingTime?: number;
  pingHistory: { timestamp: number, status: 'success' | 'error' }[]; // New field for history
}

interface PingResult {
  status: 'pending' | 'success' | 'slow' | 'error';
  message: string;
}

export function UrlManagement() {
  const [urls, setUrls] = useLocalStorage<SavedUrl[]>('savedUrls', []);
  const [newUrl, setNewUrl] = useState('');
  const [newPingInterval, setNewPingInterval] = useState<number | ''>('');
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const { toast } = useToast();

  // State to keep track of remaining time for each URL
  const [remainingTimes, setRemainingTimes] = useState<Record<string, number>>({});

  // State to track the expanded URL ID for showing the graph
  const [expandedUrlId, setExpandedUrlId] = useState<string | null>(null);

  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handlePingUrl = useCallback(async (urlItem: SavedUrl) => {
    const startTime = Date.now();
    const newHistory = [...urlItem.pingHistory]; // Copy existing history to update
    const status = { status: 'pending', message: 'Pinging...' };

    setPingResults((prevResults) => ({
      ...prevResults,
      [urlItem.id]: status,
    }));

    try {
      const response = await fetch(urlItem.url, { mode: 'no-cors' });
      const duration = Date.now() - startTime;

      if (response.ok || response.type === 'opaque') {
        newHistory.push({ timestamp: Date.now(), status: 'success' }); // Add success to history
        setPingResults((prevResults) => ({
          ...prevResults,
          [urlItem.id]: {
            status: duration > 500 ? 'slow' : 'success',
            message: `${duration}ms`,
          },
        }));
      } else {
        newHistory.push({ timestamp: Date.now(), status: 'error' }); // Add failure to history
        setPingResults((prevResults) => ({
          ...prevResults,
          [urlItem.id]: { status: 'error', message: `HTTP error! status: ${response.status}` },
        }));
      }
    } catch (error: any) {
      newHistory.push({ timestamp: Date.now(), status: 'error' }); // Add failure to history
      setPingResults((prevResults) => ({
        ...prevResults,
        [urlItem.id]: { status: 'error', message: `Error: ${error.message}` },
      }));
    } finally {
      // Update lastPingTime and pingHistory
      setUrls((prevUrls) =>
        prevUrls.map((url) =>
          url.id === urlItem.id ? { ...url, lastPingTime: Date.now(), pingHistory: newHistory } : url
        )
      );
    }
  }, [setPingResults, setUrls]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update remaining time for each URL
      const newRemainingTimes: Record<string, number> = {};

      urls.forEach((urlItem) => {
        const lastPingTime = urlItem.lastPingTime || 0; // Default to 0 if undefined
        const nextPingTime = lastPingTime + urlItem.pingInterval * 60 * 1000; // Calculate next ping time in ms

        // Calculate the remaining time until the next ping
        const remainingTime = nextPingTime - Date.now();

        // Only update if the remaining time is greater than 0 (so we don't display negative times)
        if (remainingTime > 0) {
          newRemainingTimes[urlItem.id] = remainingTime;
        } else {
          // If the ping time is in the past or now, set it to 0 to trigger an immediate ping
          newRemainingTimes[urlItem.id] = 0;
          handlePingUrl(urlItem); // Trigger the ping immediately
        }
      });

      // Update the remaining times for all URLs
      setRemainingTimes(newRemainingTimes);

    }, 1000); // Update every second

    // Cleanup the interval when component unmounts or urls change
    return () => clearInterval(intervalId);

  }, [urls, handlePingUrl]);

  const handleAddUrl = () => {
    if (!newUrl.trim()) {
      toast({
        title: 'Error',
        description: 'URL cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof newPingInterval !== 'number' || newPingInterval <= 0) {
      toast({
        title: 'Error',
        description: 'Ping interval must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    const newUrlItem: SavedUrl = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      pingInterval: newPingInterval,
      pingHistory: [],
    };

    setUrls([...urls, newUrlItem]);
    setNewUrl('');
    setNewPingInterval('');
    toast({
      title: 'Success',
      description: 'URL and ping interval saved.',
    });
  };

  const handleRemoveUrl = (id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setUrls((prevUrls) => prevUrls.filter((url) => url.id !== id));
    setPingResults((prevResults) => {
      const newResults = { ...prevResults };
      delete newResults[id];
      return newResults;
    });
    toast({
      title: 'Success',
      description: 'URL removed.',
    });
  };

  const toggleGraph = (urlId: string) => {
    setExpandedUrlId(expandedUrlId === urlId ? null : urlId); // Toggle the graph
  };

  // Chart data preparation
  const getChartData = (urlItem: SavedUrl) => {
    if (!urlItem.pingHistory.length) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = urlItem.pingHistory.map((entry) => new Date(entry.timestamp).toLocaleTimeString());
    const successData = urlItem.pingHistory.filter((entry) => entry.status === 'success').length;
    const errorData = urlItem.pingHistory.length - successData;

    return {
      labels,
      datasets: [
        {
          label: 'Success Pings',
          data: new Array(labels.length).fill(successData),
          borderColor: 'green',
          backgroundColor: 'rgba(0, 255, 0, 0.2)',
          fill: true,
        },
        {
          label: 'Failed Pings',
          data: new Array(labels.length).fill(errorData),
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          fill: true,
        },
      ],
    };
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
      <div className="flex flex-col gap-4">
        <Input
          type="url"
          placeholder="https://example.com"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <Input
          type="number"
          placeholder="Ping interval (minutes)"
          value={newPingInterval}
          onChange={(e) => setNewPingInterval(Number(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
          min="1"
        />
        <Button onClick={handleAddUrl} className="self-start">
          Add URL
        </Button>
      </div>

      <ScrollArea className="h-96 pr-4">
        <div className="space-y-4">
          {urls.length > 0 ? (
            urls.map((urlItem) => (
              <Card key={urlItem.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <div
                      className="font-medium truncate hover:underline cursor-pointer"
                      onClick={() => toggleGraph(urlItem.id)}
                    >
                      {urlItem.url}
                    </div>

                    {urlItem.lastPingTime && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Last ping: {new Date(urlItem.lastPingTime).toLocaleString()}
                      </div>
                    )}

                    {pingResults[urlItem.id] && (
                      <div
                        className="flex items-center gap-2 text-sm text-muted-foreground mt-1 cursor-pointer"
                        onClick={() => toggleGraph(urlItem.id)} // Click last result to toggle chart
                      >
                        {getStatusIcon(pingResults[urlItem.id].status)}
                        <span>{pingResults[urlItem.id].message}</span>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground mt-1">
                      Time remaining: {remainingTimes[urlItem.id] ? `${Math.floor(remainingTimes[urlItem.id] / 1000)}s` : '0s'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePingUrl(urlItem)}>
                      Ping Now
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveUrl(urlItem.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
                {expandedUrlId === urlItem.id && (
                  <div className="p-4">
                    <Line data={getChartData(urlItem)} options={{ responsive: true }} />
                  </div>
                )}
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No URLs saved yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
