
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';

interface AiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiDialog({ open, onOpenChange }: AiDialogProps) {

    useEffect(() => {
        const scriptId = 'gradio-script';
        if (open && !document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.type = 'module';
          script.src = 'https://gradio.s3-us-west-2.amazonaws.com/5.38.0/gradio.js';
          document.head.appendChild(script);
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
        <div className="flex-1 overflow-auto p-6 pt-2">
           <iframe
                src="https://qwen-qwen3-coder-webdev.hf.space"
                frameBorder="0"
                className='w-full h-full'
            ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
