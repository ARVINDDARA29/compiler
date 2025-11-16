'use client';

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { AlertTriangle, Monitor } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LivePreviewProps {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
}

interface ConsoleError {
  message: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
}

const LivePreview: FC<LivePreviewProps> = ({ htmlCode, cssCode, jsCode }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const [errors, setErrors] = useState<ConsoleError[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounce iframe update
  useEffect(() => {
    const timeout = setTimeout(() => {
      const jsWithErrorHandling = `
        window.addEventListener('error', (event) => {
          const errorPayload = { 
            type: 'runtime-error', 
            payload: {
              message: event.message,
              lineno: event.lineno,
              colno: event.colno
            }
          };
          window.parent.postMessage(errorPayload, '*');
        });
        try {
          ${jsCode}
        } catch(e) {
          const errorPayload = {
            type: 'runtime-error',
            payload: {
              message: e.message,
            }
          };
          window.parent.postMessage(errorPayload, '*');
        }
      `;

      setSrcDoc(`
        <html>
          <head>
            <style>${cssCode}</style>
          </head>
          <body>
            ${htmlCode}
            <script>${jsWithErrorHandling}</script>
          </body>
        </html>
      `);
      // Clear errors on each code update
      setErrors([]);
    }, 250);

    return () => clearTimeout(timeout);
  }, [htmlCode, cssCode, jsCode]);

  // Listen for errors from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security: check origin if possible, and ensure it's from our iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      const { type, payload } = event.data;
      if (type === 'runtime-error' && payload) {
        setErrors((prevErrors) => [{ ...payload, timestamp: Date.now() }, ...prevErrors]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Tabs defaultValue="preview" className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="preview">
          <Monitor className="mr-2 h-4 w-4" /> Preview
        </TabsTrigger>
        <TabsTrigger value="console" className="relative">
          <AlertTriangle className="mr-2 h-4 w-4" /> Console
          {errors.length > 0 && <span className="absolute right-2 top-1.5 ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">{errors.length}</span>}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="preview" className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title="Live Preview"
          sandbox="allow-scripts"
          frameBorder="0"
          width="100%"
          height="100%"
          className="bg-white"
        />
      </TabsContent>
      <TabsContent value="console" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 font-code text-sm">
            {errors.length === 0 ? (
              <p className="text-muted-foreground">No errors reported.</p>
            ) : (
              errors.map((error) => (
                <div key={error.timestamp} className="border-b py-2 text-destructive">
                  <p>{error.message}</p>
                  {error.lineno && <p className="text-xs text-destructive/80">at line {error.lineno}</p>}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default LivePreview;
