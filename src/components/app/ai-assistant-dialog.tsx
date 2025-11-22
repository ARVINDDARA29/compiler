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
import { Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { runCodeAssistantFlow } from '@/ai/flows/code-assistant-flow';
import { validateApiKey } from '@/ai/flows/validate-api-key-flow';

const API_KEY_STORAGE_KEY = 'gemini-api-key';

type ConnectionState = 'UNVERIFIED' | 'CHECKING' | 'CONNECTED' | 'ERROR';

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeUpdate: (codes: { html?: string; css?: string; js?: string }) => void;
}

export function AiAssistantDialog({ open, onOpenChange, onCodeUpdate }: AiAssistantDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('UNVERIFIED');
  const { toast } = useToast();

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    // When the dialog opens or API key changes, reset the connection state
    if (open) {
        setConnectionState('UNVERIFIED');
    }
  }, [open, apiKey]);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast({ variant: 'destructive', title: 'API Key is missing' });
      return;
    }
    setConnectionState('CHECKING');
    try {
      const result = await validateApiKey(apiKey);
      if (result.success) {
        setConnectionState('CONNECTED');
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        toast({ title: 'Connection Successful', description: 'You can now generate code.' });
      } else {
        throw new Error(result.error || 'Invalid API Key.');
      }
    } catch (error) {
      setConnectionState('ERROR');
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Unable to connect to Gemini.',
      });
    }
  };

  const handleGenerate = async () => {
    if (connectionState !== 'CONNECTED') {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Please validate your API key first.' });
      return;
    }
    if (!prompt) {
      toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please tell the assistant what you want to build.' });
      return;
    }
    
    setIsGenerating(true);
    let accumulatedJson = '';

    try {
      const stream = await runCodeAssistantFlow(prompt, apiKey);
      
      for await (const chunk of stream) {
        accumulatedJson += chunk;
      }
      
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
        description: error instanceof Error ? error.message : "Could not parse the AI response. Check console for details.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setIsGenerating(false);
      // Keep connection state for next time, but reset if key was invalid
      if(connectionState === 'ERROR') {
        setConnectionState('UNVERIFIED');
      }
    }
  }, [open]);
  
  const isBusy = isGenerating || connectionState === 'CHECKING';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            AI Code Assistant
          </DialogTitle>
          <DialogDescription>
            Enter your Gemini API key from Google AI Studio to connect and generate code.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="gemini-api-key">Gemini API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="gemini-api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isBusy}
              />
              <Button onClick={handleTestConnection} disabled={isBusy || !apiKey} variant="outline">
                {connectionState === 'CHECKING' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Connection
              </Button>
            </div>
            {connectionState === 'CONNECTED' && <p className="text-sm text-green-500 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Connected</p>}
            {connectionState === 'ERROR' && <p className="text-sm text-destructive flex items-center gap-1"><XCircle className="h-4 w-4" /> Connection failed. Please check your key.</p>}
          </div>
          
          <div className="grid w-full gap-1.5 mt-4">
            <Label htmlFor="ai-prompt">Your Idea</Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g., 'a simple portfolio page with a profile picture, a short bio, and three project cards'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={isBusy || connectionState !== 'CONNECTED'}
            />
          </div>
        </div>

        <DialogFooter>
            <Button type="button" onClick={handleGenerate} disabled={isBusy || connectionState !== 'CONNECTED' || !prompt}>
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
