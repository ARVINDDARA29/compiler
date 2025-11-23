
'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
  const milliseconds = (time % 1000).toString().padStart(3, '0').slice(0, 2); // Show only two digits for ms
  return `${minutes}:${seconds}.${milliseconds}`;
};

const DeployingOverlay = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      if (startTimeRef.current !== undefined) {
        setElapsedTime(time - startTimeRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
      <h2 className="text-2xl font-semibold text-white mb-4">Deploying...</h2>
      <div className="w-64 text-center">
        <p className="text-lg text-white font-mono tabular-nums">
          {formatTime(elapsedTime)}
        </p>
      </div>
    </div>
  );
};

export default DeployingOverlay;
