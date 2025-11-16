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

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


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

  // Initial run is removed, run only on button click

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newSidebarWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newSidebarWidth > 20 && newSidebarWidth < 80) { // Constraint resizing
          setSidebarWidth(newSidebarWidth);
        }
      }
    };
    
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
    
    // Show deploying state for at least 60 seconds
    const delayPromise = new Promise(resolve => setTimeout(resolve, 60000));

    try {
        const [result] = await Promise.all([deployPromise, delayPromise]);

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
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Deployment Failed",
            description: "An unexpected error occurred during deployment.",
        });
    } finally {
        setIsDeploying(false);
        setProjectName('');
    }
  };
  
  const getSidebarWidth = () => {
    if (!isClient) return '50%';
    if (window.innerWidth < 768) {
      return '100%';
    }
    return `calc(${sidebarWidth}%)`;
  };

  const getPreviewWidth = () => {
      if (!isClient) return '50%';
      if (window.innerWidth < 768) {
        return '100%';
      }
      return `calc(${100 - sidebarWidth}%)`;
  }


  return (
    <>
      <div className="flex h-screen w-screen flex-col bg-secondary overflow-y-auto">
        <AppHeader 
          isDeploying={isDeploying} 
          onDeploy={() => setIsDeployDialogOpen(true)} 
          onRun={handleRunCode}
        />
        <div ref={containerRef} className="flex flex-1 flex-col md:flex-row">
          <div 
            className="flex flex-col w-full overflow-hidden p-2 md:p-4"
            style={{ 
              width: getSidebarWidth(),
              minHeight: '50vh',
             }}
          >
            <CodeEditor
                htmlCode={htmlCode}
                setHtmlCode={setHtmlCode}
                cssCode={cssCode}
                setCssCode={setCssCode}
                jsCode={jsCode}
                setJsCode={setJsCode}
            />
          </div>
          <div
            onMouseDown={handleMouseDown}
            className="w-full md:w-2 h-2 md:h-full cursor-row-resize md:cursor-col-resize bg-border hover:bg-primary/20 transition-colors hidden md:block"
          />
           <div 
            className="flex flex-col w-full p-2 md:p-4 md:pl-0"
            style={{ 
                width: getPreviewWidth(),
                minHeight: '50vh',
            }}
          >
             <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
                <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="flex-1 overflow-auto">
                    <LivePreview srcDoc={srcDoc} />
                </TabsContent>
            </Tabs>
          </div>
        </div>
        <footer className="w-full bg-card text-card-foreground border-t mt-auto">
            <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>&copy; {new Date().getFullYear()} CodeDeploy. Made by Bishnoi engineers.</p>
                    <div className="flex items-center gap-4">
                        <a href="#" className="hover:text-foreground">Terms and Conditions</a>
                        <a href="#" className="hover:text-foreground">Privacy Policy</a>
                    </div>
                </div>
                 <div className="border-t my-4"></div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <p>Total Deployments: <span className="font-semibold text-foreground">{deployments.toLocaleString()}</span></p>
                </div>
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
