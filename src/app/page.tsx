'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Share2, Globe, Users, Server } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
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

type DeployedLink = {
    id: string;
    projectName: string;
    url: string;
    createdAt: any;
};

export default function Home() {
  const [htmlCode, setHtmlCode] = useState(initialHtml);
  const [cssCode, setCssCode] = useState(initialCss);
  const [jsCode, setJsCode] = useState(initialJs);

  const [srcDoc, setSrcDoc] = useState('');
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isAllLinksDialogOpen, setIsAllLinksDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);
  const [shareLink, setShareLink] = useState(true);

  const [deployments, setDeployments] = useState(50000);
  const [deployedLinks, setDeployedLinks] = useState<DeployedLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50); // Initial width in percentage

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isClient, setIsClient] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  const fetchDeployedLinks = async () => {
    if (!firestore) return;
    setIsLoadingLinks(true);
    try {
        const linksCollection = collection(firestore, 'deployedSites');
        const q = query(linksCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const links: DeployedLink[] = [];
        querySnapshot.forEach((doc) => {
            links.push({ id: doc.id, ...doc.data() } as DeployedLink);
        });
        setDeployedLinks(links);
    } catch (error) {
        console.error("Error fetching deployed links:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch shared links.",
        });
    } finally {
        setIsLoadingLinks(false);
    }
  };
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if(isClient && firestore) {
      fetchDeployedLinks();
    }
  }, [isClient, firestore]);


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
            variant: "destructive",
            title: "Project Name Required",
            description: "Please enter a name for your project.",
        });
        return;
    }
    
    setIsDeploying(true);
    setIsDeployDialogOpen(false);

    toast({
        title: "Deploying Project...",
        description: "Your site is being deployed. This may take a moment.",
    });
    
    try {
        const deploymentResult = await deployToGithub({ html: htmlCode, css: cssCode, js: jsCode, projectName, addWatermark });

        if (deploymentResult.success && deploymentResult.url) {
            if (shareLink && firestore) {
                try {
                    await addDoc(collection(firestore, "deployedSites"), {
                        projectName: projectName,
                        url: deploymentResult.url,
                        createdAt: serverTimestamp()
                    });
                    // Refetch links to show the new one
                    await fetchDeployedLinks();
                } catch(error) {
                    console.error("Error sharing link:", error)
                    toast({
                        variant: "destructive",
                        title: "Sharing Failed",
                        description: "Could not add your link to the public list.",
                    });
                }
            }
            
            toast({
                title: "Deployment Successful!",
                description: "Your link is permanent and free forever.",
                duration: 9000,
                action: (
                <div className="flex items-center gap-2">
                    <a href={deploymentResult.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">View Site</Button>
                    </a>
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        if(deploymentResult.url) {
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
            toast({
                variant: "destructive",
                title: "Deployment Failed",
                description: deploymentResult.error || "An unknown error occurred.",
            });
        }
    } catch (error) {
        console.error("Deployment failed:", error);
        toast({
            variant: "destructive",
            title: "Deployment Failed",
            description: "An unexpected error occurred during deployment.",
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
        <div className="flex-1 flex flex-col min-h-0">
          <AppHeader 
            isDeploying={isDeploying} 
            onDeploy={() => setIsDeployDialogOpen(true)} 
            onRun={handleRunCode}
          />
          <main className="flex-1 flex flex-col overflow-y-auto">
              <div ref={containerRef} className="flex flex-1 flex-col md:flex-row min-h-0 p-2 md:p-4 gap-4">
                <div 
                    className="flex flex-col w-full md:h-full overflow-hidden"
                    style={{ 
                      width: getSidebarWidth(),
                      minHeight: isClient && window.innerWidth < 768 ? '50vh' : 'auto',
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
                    className="w-full md:w-2 h-2 md:h-auto cursor-row-resize md:cursor-col-resize bg-border hover:bg-primary/20 transition-colors rounded-full hidden md:block"
                />
                <div 
                    className="flex flex-col w-full md:h-full overflow-hidden"
                    style={{ 
                        width: getPreviewWidth(),
                        minHeight: isClient && window.innerWidth < 768 ? '50vh' : 'auto',
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
              </div>
              <section className="py-12 md:py-16 bg-secondary/50">
                  <div className="container mx-auto px-4">
                      <div className="text-center mb-8">
                          <h2 className="text-3xl font-bold tracking-tight">All Users App Links</h2>
                          <p className="text-muted-foreground mt-2">Explore sites deployed by other users.</p>
                      </div>
                      {isLoadingLinks ? (
                          <div className="flex justify-center"><Server className="h-8 w-8 animate-spin" /></div>
                      ) : deployedLinks.length > 0 ? (
                          <>
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                  {deployedLinks.slice(0, 5).map((link) => (
                                      <Card key={link.id}>
                                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                                              <CardTitle className="text-sm font-medium truncate">{link.projectName}</CardTitle>
                                              <Globe className="h-4 w-4 text-muted-foreground" />
                                          </CardHeader>
                                          <CardContent>
                                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                                                  {link.url}
                                              </a>
                                              <p className="text-xs text-muted-foreground mt-2">
                                                  {link.createdAt?.toDate() ? new Date(link.createdAt.toDate()).toLocaleString() : 'Just now'}
                                              </p>
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                              {deployedLinks.length > 5 && (
                                  <div className="mt-8 text-center">
                                      <Button onClick={() => setIsAllLinksDialogOpen(true)}>Show All</Button>
                                  </div>
                              )}
                          </>
                      ) : (
                         <div className="text-center text-muted-foreground py-8">
                              <Users className="mx-auto h-12 w-12" />
                              <p className="mt-4">No public links yet. Be the first to share!</p>
                          </div>
                      )}
                  </div>
              </section>
          </main>
          <footer className="w-full bg-background text-card-foreground border-t">
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
      <Dialog open={isAllLinksDialogOpen} onOpenChange={setIsAllLinksDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>All Deployed Sites</DialogTitle>
            <DialogDescription>
              Explore all sites deployed by the community.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deployedLinks.map((link) => (
                <Card key={link.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium truncate">{link.projectName}</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                      {link.url}
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      {link.createdAt?.toDate() ? new Date(link.createdAt.toDate()).toLocaleString() : 'Just now'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllLinksDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
