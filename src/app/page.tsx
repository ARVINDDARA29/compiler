'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
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
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

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
  const [shareLink, setShareLink] = useState(true);

  const [deployments, setDeployments] = useState(50000);
  
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isClient, setIsClient] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isClient || window.innerWidth < 768) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 20 && newWidth < 80) {
            setSidebarWidth(newWidth);
        }
      };

      if (isClient) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        if (isClient) {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
      };
  }, [isDragging, isClient]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleRunCode();
    }, 500);

    return () => clearTimeout(timeout);
  }, [htmlCode, cssCode, jsCode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDeployments(prev => prev + Math.floor(Math.random() * 5) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = async () => {
    if (!projectName) {
      toast({
        variant: 'destructive',
        title: 'Project Name Required',
        description: 'Please enter a name for your project.',
      });
      return;
    }
  
    setIsDeploying(true);
    setIsDeployDialogOpen(false);
  
    toast({
      title: 'Deploying Project...',
      description: 'Your site will be ready in about 30 seconds.',
    });
  
    try {
      const deploymentPromise = deployToGithub({
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        projectName,
        addWatermark,
      });
  
      const timerPromise = new Promise(resolve => setTimeout(resolve, 30000));
  
      const [deploymentResult] = await Promise.all([deploymentPromise, timerPromise]);
  
      if (deploymentResult.success && deploymentResult.url) {
        if (shareLink && firestore) {
          try {
            await addDoc(collection(firestore, 'deployedSites'), {
              projectName: projectName,
              url: deploymentResult.url,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            console.error('Error sharing link:', error);
          }
        }
  
        toast({
          title: 'Deployment Successful!',
          description: 'Your link is permanent and free forever.',
          duration: 9000,
          action: (
            <div className="flex items-center gap-2">
              <a href={deploymentResult.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  View Site
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (deploymentResult?.url) {
                    navigator.clipboard.writeText(deploymentResult.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy URL</span>
              </Button>
            </div>
          ),
        });
      } else {
        throw new Error(deploymentResult.error || 'An unknown error occurred during deployment.');
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsDeploying(false);
      setProjectName('');
      setAddWatermark(true);
      setShareLink(true);
    }
  };
  
  const getSidebarWidth = () => {
    if (!isClient || window.innerWidth < 768) {
      return '100%';
    }
    return `${sidebarWidth}%`;
  };

  const getPreviewWidth = () => {
      if (!isClient || window.innerWidth < 768) {
        return '100%';
      }
      return `${100 - sidebarWidth}%`;
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col bg-background">
        <AppHeader 
          isDeploying={isDeploying} 
          onDeploy={() => setIsDeployDialogOpen(true)} 
          onRun={handleRunCode}
        />
        <main ref={containerRef} className="flex-1 flex flex-col md:flex-row min-h-0 p-2 md:p-4 gap-4">
            <div 
                className="flex flex-col md:h-full overflow-hidden"
                style={{ 
                  width: getSidebarWidth(),
                  height: isClient && window.innerWidth < 768 ? '50%' : '100%',
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
                className="w-full md:w-2 h-2 md:h-auto cursor-row-resize md:cursor-col-resize bg-border hover:bg-primary/20 transition-colors rounded-full"
            />
            <div 
                className="flex flex-col md:h-full overflow-hidden"
                style={{ 
                    width: getPreviewWidth(),
                    height: isClient && window.innerWidth < 768 ? '50%' : '100%',
                }}
            >
                <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="flex-1 overflow-auto bg-white">
                        <LivePreview srcDoc={srcDoc} />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
        <footer className="w-full bg-background text-card-foreground border-t">
            <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>&copy; {new Date().getFullYear()} CodeDeploy. Made by Bishnoi engineers.</p>
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Total Deployments: {deployments.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="#" className="hover:text-foreground">Terms and Conditions</a>
                        <a href="#" className="hover:text-foreground">Privacy Policy</a>
                    </div>
                </div>
            </div>
        </footer>
      </div>
      <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deploy Project</DialogTitle>
            <DialogDescription>
              Your link will be permanent and always free. Deploy your site to the web in one click.
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
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="share" className="text-right flex flex-col">
                Share
                <Share2 className="h-3 w-3 mt-1"/>
               </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="share"
                  checked={shareLink}
                  onCheckedChange={setShareLink}
                />
                <Label htmlFor="share" className="text-sm font-normal text-muted-foreground">
                  Add link to public showcase
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleDeploy} disabled={isDeploying || !projectName}>
              {isDeploying ? 'Deploying...' : 'Deploy to Internet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
