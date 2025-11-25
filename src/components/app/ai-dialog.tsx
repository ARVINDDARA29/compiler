
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiDialog({ open, onOpenChange }: AiDialogProps) {
    const [isLoading, setIsLoading] = useState(true);

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
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-b-lg p-4"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4 text-center">AI Assistant is Loading...</h3>
                <div className="bg-muted/50 border border-border rounded-lg p-4 max-w-lg text-center">
                    <p className="text-base font-semibold text-foreground">
                        How to use the AI:
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Ask the AI to "write code in HTML, CSS, and JavaScript". Then, copy the generated code, paste it into the respective editor tabs, and click deploy!
                    </p>
                </div>
              </motion.div>
            )}
           </AnimatePresence>
           <iframe
              src="https://qwen-qwen3-coder-webdev.hf.space"
              frameBorder="0"
              className={cn('w-full h-full rounded-md transition-opacity duration-500', isLoading ? 'opacity-0' : 'opacity-100')}
              onLoad={() => setIsLoading(false)}
            ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
