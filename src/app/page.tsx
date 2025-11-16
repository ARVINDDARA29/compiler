'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { deployToGithub } from '@/app/actions/deploy';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const [srcDoc, setSrcDoc] = useState('');
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);

  const [deployments, setDeployments] = useState(50000);

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50); // Initial width in percentage

  const containerRef = useRef<HTMLDivElement>(null);

  const handleRunCode = () => {
    setSrcDoc(`
        <html>
          <head>
            <style>${cssCode}</style>
          </head>
          <body>
            ${htmlCode}
            <script>${jsCode}</script>
          </body>
        </html>
      `);
  }

  // Initial run
  useEffect(() => {
    handleRunCode();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newSidebarWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newSidebarWidth > 20 && newSidebarWidth < 80) { // Constraint resizing
        setSidebarWidth(newSidebarWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  

  useEffect(() => {
    // Increment deployments on an interval for visual effect
    const interval = setInterval(() => {
      setDeployments(prev => prev + Math.floor(Math.random() * 5) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      setDeployments(prev => prev + 1);
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

  return (
    <>
      <div className="flex h-screen w-screen flex-col bg-secondary">
        <AppHeader 
          isDeploying={isDeploying} 
          onDeploy={() => setIsDeployDialogOpen(true)} 
          onRun={handleRunCode}
        />
        <main ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div 
            className="w-full flex-1 md:w-1/2 md:h-full overflow-y-auto"
            style={{ width: `calc(${sidebarWidth}%)` }}
          >
             <div className="p-2 md:p-4 h-full">
                <CodeEditor
                    htmlCode={htmlCode}
                    setHtmlCode={setHtmlCode}
                    cssCode={cssCode}
                    setCssCode={setCssCode}
                    jsCode={jsCode}
                    setJsCode={setJsCode}
                />
             </div>
          </div>
          <div
            onMouseDown={handleMouseDown}
            className="w-full md:w-2 h-2 md:h-full cursor-row-resize md:cursor-col-resize bg-border hover:bg-primary/20 transition-colors"
          />
           <div 
            className="w-full flex-1 md:w-1/2 md:h-full flex flex-col p-2 md:p-4 md:pl-0"
            style={{ width: `calc(${100 - sidebarWidth}%)` }}
          >
             <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
                <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="flex-1 overflow-hidden">
                    <LivePreview srcDoc={srcDoc} />
                </TabsContent>
            </Tabs>
          </div>
        </main>
        <footer className="px-4 py-3 border-t bg-card text-card-foreground">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} CodeDeploy. Made by Bishnoi engineers.</p>
                    <div className="flex items-center gap-3">
                        <a href="#" className="hover:text-foreground">Terms and Conditions</a>
                        <a href="#" className="hover:text-foreground">Privacy Policy</a>
                    </div>
                </div>
                <p>Deployments: <span className="font-semibold text-foreground">{deployments.toLocaleString()}</span></p>
            </div>
        </footer>
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
