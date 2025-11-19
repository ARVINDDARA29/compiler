'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  srcDoc: string;
  isFullScreen?: boolean;
}

const LivePreview = forwardRef<HTMLIFrameElement, LivePreviewProps>(
  ({ srcDoc, isFullScreen = false }, ref) => {
    return (
      <div className={cn(
          "flex h-full flex-col overflow-hidden bg-card items-center justify-center",
          !isFullScreen && "p-0"
      )}>
          <div className={cn(
              "h-full bg-white transition-all duration-300 ease-in-out w-full"
          )}>
              <iframe
                  ref={ref}
                  srcDoc={srcDoc}
                  title="Live Preview"
                  sandbox="allow-scripts allow-modals allow-forms"
                  frameBorder="0"
                  width="100%"
                  height="100%"
              />
          </div>
      </div>
    );
  }
);

LivePreview.displayName = 'LivePreview';

export default LivePreview;
