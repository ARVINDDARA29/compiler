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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Loader2, Sparkles } from 'lucide-react';
import { runCodeAssistantFlow } from '@/ai/flows/code-assistant-flow';

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeUpdate: (codes: { html?: string; css?: string; js?: string }) => void;
}

export function AiAssistantDialog({ open, onOpenChange, onCodeUpdate }: AiAssistantDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ html?: string; css?: string; js?: string }>({});
  const { toast } = useToast();
  const { user } = useUser();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is empty',
        description: 'Please tell the assistant what you want to build.',
      });
      return;
    }
    
    setIsGenerating(true);
    let accumulatedJson = '';

    try {
      const stream = await runCodeAssistantFlow(prompt);
      
      for await (const chunk of stream) {
        accumulatedJson += chunk;
      }
      
      const parsed = JSON.parse(accumulatedJson);
      onCodeUpdate({
        html: parsed.html,
        css: parsed.css,
        js: parsed.js,
      });

      onOpenChange(false);

    } catch (error) {
      console.error('AI Assistant Error:', error, 'Accumulated JSON:', accumulatedJson);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not parse the AI response. Check the console for details.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setIsGenerating(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            AI Code Assistant
          </DialogTitle>
          <DialogDescription>
            Describe what you want to build, and the AI will generate the code for you. The existing code will be replaced.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="ai-prompt">Your Idea</Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g., 'a simple portfolio page with a profile picture, a short bio, and three project cards'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={isGenerating}
            />
          </div>
        </div>
        <DialogFooter>
            <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt}>
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    'Generate'
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
