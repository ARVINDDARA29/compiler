'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { deployToGithub } from '@/app/actions/deploy';
import { getSuggestions } from '@/app/actions/suggest';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const initialHtml = `<h1>Welcome to CodeDeploy!</h1>
<p>Edit the code on the left to see it live here.</p>
<button id="myButton">Click me</button>
`;

const initialCss = `body {
  font-family: sans-serif;
  padding: 2rem;
  background-color: #f9f9f9;
  color: #333;
}

h1 {
  color: #2E3192;
}

button {
  background-color: #6639A6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #522d83;
}
`;

const initialJs = `const button = document.getElementById('myButton');
button.addEventListener('click', () => {
  alert('Hello from your deployed site!');
});
`;

export default function Home() {
  const [htmlCode, setHtmlCode] = useState(initialHtml);
  const [cssCode, setCssCode] = useState(initialCss);
  const [jsCode, setJsCode] = useState(initialJs);
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);

  const { toast } = useToast();

  const handleDeploy = async () => {
    if (!projectName) {
        toast({
            variant: "destructive",
            title: "Project Name Required",
            description: "Please enter a name for your project.",
        });
        return;
    }
    
    setIsDeploying(true);
    setIsDeployDialogOpen(false);

    const deployPromise = deployToGithub({ html: htmlCode, css: cssCode, js: jsCode, projectName, addWatermark });
    const delayPromise = new Promise(resolve => setTimeout(resolve, 60000));

    const [result] = await Promise.all([deployPromise, delayPromise]);

    setIsDeploying(false);

    if (result.success && result.url) {
      toast({
        title: "Deployment Successful!",
        description: "Your code has been pushed to GitHub.",
        action: (
          <div className="flex items-center gap-2">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">View Site</Button>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(result.url!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy URL</span>
            </Button>
          </div>
        ),
      });
    } else {
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
    setProjectName('');
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    const combinedCode = `
      <!-- HTML -->
      ${htmlCode}
      
      /* CSS */
      ${cssCode}

      // JavaScript
      ${jsCode}
    `;
    const result = await getSuggestions(combinedCode);
    setSuggestions(result);
    setIsSuggesting(false);
  };

  return (
    <>
      <div className="flex h-screen w-screen flex-col bg-secondary">
        <AppHeader isDeploying={isDeploying} onDeploy={() => setIsDeployDialogOpen(true)} />
        <main className="grid flex-1 grid-cols-1 md:grid-cols-2 overflow-hidden">
          <div className="h-full p-2 md:p-4 overflow-y-auto">
            <CodeEditor
              htmlCode={htmlCode}
              setHtmlCode={setHtmlCode}
              cssCode={cssCode}
              setCssCode={setCssCode}
              jsCode={jsCode}
              setJsCode={setJsCode}
              suggestions={suggestions}
              isSuggesting={isSuggesting}
              onSuggest={handleSuggest}
            />
          </div>
          <div className="hidden md:flex h-full flex-col p-2 md:p-4 md:pl-0">
            <LivePreview htmlCode={htmlCode} cssCode={cssCode} jsCode={jsCode} />
          </div>
        </main>
      </div>
      <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deploy Project</DialogTitle>
            <DialogDescription>
              Enter a name for your project. This will be used for the GitHub repository path.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                className="col-span-3"
                placeholder="my-awesome-site"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="watermark" className="text-right">
                Watermark
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="watermark"
                  checked={addWatermark}
                  onCheckedChange={setAddWatermark}
                />
                <Label htmlFor="watermark" className="text-sm font-normal text-muted-foreground">
                  Add "Bishnoi deployer" watermark
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleDeploy} disabled={isDeploying || !projectName}>
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
