import React, { useState, useEffect } from 'react';

interface SavedUrl {
  id: string;
  url: string;
  pingInterval: number;
  lastPingTime?: number;
  // timerId is not needed in this component
}

interface TimerDisplayProps {
  urlItem: SavedUrl;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ urlItem }) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const calculateTimeRemaining = () => {
      if (!urlItem.lastPingTime) {
        // If never pinged, calculate time until the first ping
        const firstPingTime = Date.now() + urlItem.pingInterval * 60 * 1000;
        const remaining = firstPingTime - Date.now();
         setTimeRemaining(remaining > 0 ? remaining : 0);
         return remaining;
      } else {
        const nextPingTime = urlItem.lastPingTime + urlItem.pingInterval * 60 * 1000;
        const remaining = nextPingTime - Date.now();
        setTimeRemaining(remaining > 0 ? remaining : 0);
        return remaining;
      }
    };

    // Initial calculation
    let remaining = calculateTimeRemaining();

    // Set up interval to update every second if time remaining is positive
    if (remaining > 0) {
       interval = setInterval(() => {
         remaining = calculateTimeRemaining();
         if (remaining <= 0) {
           clearInterval(interval!);
         }
       }, 1000); // Update every second
    }


    // Cleanup function to clear the interval
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [urlItem.lastPingTime, urlItem.pingInterval]); // Re-run effect if these change

  const formatTime = (ms: number) => {
    if (ms <= 0) {
      // You might want to show a "Pinging now..." or similar message here
      return 'Pinging...';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `Next ping in: ${minutes}m ${seconds}s`;
  };

  // Display 'Loading...' or similar until the initial time is calculated
  if (timeRemaining === null) {
      return <span>Calculating next ping time...</span>;
  }


  return <span>{formatTime(timeRemaining)}</span>;
};

export default TimerDisplay;
