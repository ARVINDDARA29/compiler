'use client';

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { cn } from '@/lib/utils';


interface LivePreviewProps {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  previewMode: 'desktop' | 'mobile';
}

const LivePreview: FC<LivePreviewProps> = ({ htmlCode, cssCode, jsCode, previewMode }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounce iframe update
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`
        <html>
          <head>
            <style>${cssCode}</style>
          </head>
          <body>
            ${htmlCode}
            <script>${jsCode}</script>
          </body>
        </html>
      `);
    }, 250);

    return () => clearTimeout(timeout);
  }, [htmlCode, cssCode, jsCode]);


  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card items-center justify-center">
        <div className={cn(
            "h-full bg-white transition-all duration-300 ease-in-out",
            previewMode === 'desktop' ? 'w-full' : 'w-[375px] max-w-full h-[667px] max-h-full rounded-lg shadow-lg border-2 border-gray-800'
        )}>
            <iframe
                ref={iframeRef}
                srcDoc={srcDoc}
                title="Live Preview"
                sandbox="allow-scripts"
                frameBorder="0"
                width="100%"
                height="100%"
                className={cn(previewMode === 'mobile' && 'rounded-md')}
            />
        </div>
    </div>
  );
};

export default LivePreview;
