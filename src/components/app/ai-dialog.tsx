
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiDialog({ open, onOpenChange }: AiDialogProps) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (open) {
          // Reset loading state every time the dialog opens
          setIsLoading(true);
          const scriptId = 'gradio-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.type = 'module';
            script.src = 'https://gradio.s3-us-west-2.amazonaws.com/5.38.0/gradio.js';
            document.head.appendChild(script);
          }
        }
    }, [open]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className='p-6 pb-0'>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-6 pt-2 relative">
           <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-b-lg"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold">AI is loading...</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
                  To use it, ask it to 'write code in HTML/CSS/JS'. Then, copy the code, paste it into the editor, and deploy.
                </p>
              </motion.div>
            )}
           </AnimatePresence>
           <iframe
                src="https://qwen-qwen3-coder-webdev.hf.space"
                frameBorder="0"
                className={cn('w-full h-full transition-opacity duration-500', isLoading ? 'opacity-0' : 'opacity-100')}
                onLoad={() => setIsLoading(false)}
            ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
