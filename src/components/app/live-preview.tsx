'use client';

import { useRef } from 'react';
import type { FC } from 'react';
import { cn } from '@/lib/utils';


interface LivePreviewProps {
  srcDoc: string;
}

const LivePreview: FC<LivePreviewProps> = ({ srcDoc }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card items-center justify-center">
        <div className={cn(
            "h-full bg-white transition-all duration-300 ease-in-out w-full"
        )}>
            <iframe
                ref={iframeRef}
                srcDoc={srcDoc}
                title="Live Preview"
                sandbox="allow-scripts"
                frameBorder="0"
                width="100%"
                height="100%"
            />
        </div>
    </div>
  );
};

export default LivePreview;
