
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { runCodeAssistantFlow } from '@/ai/flows/code-assistant-flow';

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeUpdate: (codes: { html?: string; css?: string; js?: string }) => void;
}

export function AiAssistantDialog({ open, onOpenChange, onCodeUpdate }: AiAssistantDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is empty',
        description: 'Please tell the assistant what you want to build.',
      });
      return;
    }
     if (!apiKey) {
      toast({
        variant: 'destructive',
        title: 'API Key is missing',
        description: 'Please enter your Gemini API key to generate code.',
      });
      return;
    }
    
    setIsGenerating(true);
    let accumulatedJson = '';

    try {
      const stream = await runCodeAssistantFlow(prompt, apiKey);
      
      for await (const chunk of stream) {
        accumulatedJson += chunk;
      }
      
      // Attempt to find a valid JSON object within the accumulated text
      const jsonMatch = accumulatedJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in the AI's response.");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      onCodeUpdate({
        html: parsed.html || '',
        css: parsed.css || '',
        js: parsed.js || '',
      });

      onOpenChange(false);

    } catch (error) {
      console.error('AI Assistant Error:', error, 'Accumulated JSON:', accumulatedJson);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Could not parse the AI response. Check the console for details.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!open) {
      // Don't clear API key, but clear prompt
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
            Describe what you want to build. You will need a Gemini API key from Google AI Studio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="gemini-api-key">Gemini API Key</Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isGenerating}
            />
          </div>
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
            <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt || !apiKey}>
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
