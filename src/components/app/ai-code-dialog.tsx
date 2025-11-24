
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AiCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prompt: string) => void;
}

export function AiCodeDialog({
  open,
  onOpenChange,
  onConfirm,
}: AiCodeDialogProps) {
  const [prompt, setPrompt] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!prompt.trim()) {
        toast({
            variant: 'destructive',
            title: 'Prompt is required',
            description: 'Please enter a description of the code you want to generate.',
        });
        return;
    }
    onConfirm(prompt);
  };
  
  useEffect(() => {
    if (!open) {
      setPrompt('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Generate Code with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to create, and the AI will generate the code for you in the active editor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'a simple login form with a username and password field' or 'a button that changes color when you hover over it'"
                rows={4}
            />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!prompt.trim()}
          >
            Generate Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
