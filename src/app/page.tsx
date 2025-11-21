
'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Expand, Star, MessageSquarePlus, Upload } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useUser, useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { AuthDialog } from '@/components/app/auth-dialog';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import DeployingOverlay from '@/components/app/deploying-overlay';

const initialHtml = `<header>
  <h1>Welcome to My Page</h1>
  <p>A simple and clean starting point for your next project.</p>
</header>
<main>
  <section id="about">
    <h2>About This Template</h2>
    <p>This is a responsive HTML, CSS, and JavaScript template. You can edit the code in the tabs to see your changes live.</p>
  </section>
  <section id="features">
    <h2>Features</h2>
    <ul>
      <li>HTML, CSS, JS editor</li>
      <li>Live preview</li>
      <li>One-click deploy</li>
    </ul>
  </section>
</main>
<footer id="page-footer">
  <p>Powered by Arvind Bishnoi</p>
</footer>
`;

const initialCss = `body {
  font-family: 'Inter', sans-serif;
  background-color: #f0f2f5;
  color: #333;
  line-height: 1.6;
  margin: 0;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

header {
  text-align: center;
  margin-bottom: 3rem;
  border-bottom: 2px solid #ddd;
  padding-bottom: 1rem;
  width: 100%;
  max-width: 800px;
}

header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 0.5rem;
}

header p {
  font-size: 1.1rem;
  color: #555;
}

main {
  width: 100%;
  max-width: 800px;
}

section {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #38bdf8;
}

ul {
  list-style: none;
  padding-left: 0;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

li:last-child {
  border-bottom: none;
}

#page-footer {
  text-align: center;
  margin-top: 2rem;
  color: #777;
  font-size: 0.9rem;
}

/* Add a little animation */
section {
  transition: transform 0.3s ease-in-out;
}

section:hover {
  transform: translateY(-5px);
}
`;

const initialJs = `console.log("Welcome to the editor!");

// Example: Add a click effect to sections
document.querySelectorAll('section').forEach(section => {
  section.addEventListener('click', () => {
    console.log(\`You clicked on the \${section.querySelector('h2').innerText} section.\`);
    section.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
    setTimeout(() => {
      section.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
    }, 300);
  });
});
`;

type MobileView = 'editor' | 'preview';

export default function Home() {
  const [htmlCode, setHtmlCode] = useState(initialHtml);
  const [cssCode, setCssCode] = useState(initialCss);
  const [jsCode, setJsCode] = useState(initialJs);
  const [srcDoc, setSrcDoc] = useState('');
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [isFullScreenPreviewOpen, setIsFullScreenPreviewOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('editor');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [lastDeployedProject, setLastDeployedProject] = useState('');

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useUser();
  const { firestore } = useFirebase();

  const generateSrcDoc = () => {
    const isFullHtml = htmlCode.trim().toLowerCase().startsWith('<!doctype html>') || htmlCode.trim().toLowerCase().startsWith('<html>');
    if (isFullHtml) {
        return htmlCode;
    }
    return `
        <html>
            <head>
                <style>${cssCode}</style>
            </head>
            <body>
                ${htmlCode}
                <script>${jsCode}</script>
            </body>
        </html>
    `;
  };
  
  const runCode = () => {
    setIsRunning(true);
    setSrcDoc(''); 
    setTimeout(() => {
        setSrcDoc(generateSrcDoc());
        setIsRunning(false);
    }, 250);
    
    if (isMobile) {
        setMobileView('preview');
    }
  };


  useEffect(() => {
    // Run code on initial load
    setSrcDoc(generateSrcDoc());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFullScreenPreviewOpen) {
      setSrcDoc(generateSrcDoc());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreenPreviewOpen]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current || isMobile) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 20 && newWidth < 80) {
            setSidebarWidth(newWidth);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, isMobile]);

  const openDeployDialog = () => {
    if (user) {
      setIsDeployDialogOpen(true);
    } else {
      setIsAuthDialogOpen(true);
    }
  };

  useEffect(() => {
    if(user && isAuthDialogOpen) {
      setIsAuthDialogOpen(false);
      setIsDeployDialogOpen(true);
    }
  }, [user, isAuthDialogOpen]);


  const handleDeploy = async () => {
    if (!projectName) {
      toast({
        variant: 'destructive',
        title: 'Project Name Required',
        description: 'Please enter a name for your project.',
      });
      return;
    }

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to deploy a project.',
      });
      openDeployDialog();
      return;
    }

    setIsDeploying(true);
    setIsDeployDialogOpen(false);

    const isFullHtml = htmlCode.trim().toLowerCase().startsWith('<!doctype html>') || htmlCode.trim().toLowerCase().startsWith('<html>');

    try {
      const deploymentResult = await deployToGithub({
          html: isFullHtml ? htmlCode : htmlCode,
          css: isFullHtml ? '' : cssCode,
          js: isFullHtml ? '' : jsCode,
          projectName,
          addWatermark,
      });

      // Wait for GitHub Pages to build and deploy, which can take a minute.
      // This timeout is an optimistic wait.
      setTimeout(() => {
        setIsDeploying(false);
        setProjectName('');
        setAddWatermark(true);

        if (deploymentResult.success && deploymentResult.url) {
          
          const sitesCollectionRef = collection(firestore, 'sites');
          const newSiteRef = doc(sitesCollectionRef, projectName);
          const siteData = {
            userId: user.uid,
            projectName: projectName,
            url: deploymentResult.url,
            deployedAt: new Date(),
            isPublic: false,
          };

          setDoc(newSiteRef, siteData, { merge: true }).catch(async (error) => {
              const permissionError = new FirestorePermissionError({
                  path: newSiteRef.path,
                  operation: 'create',
                  requestResourceData: siteData,
              });
              errorEmitter.emit('permission-error', permissionError);
          });
          
          setLastDeployedProject(projectName);

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
            toast({
                variant: 'destructive',
                title: 'Deployment Failed',
                description: deploymentResult.error || 'An unknown error occurred during deployment.',
            });
        }
      }, 45000);

    } catch (error) {
      console.error('Deployment failed:', error);
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
      setIsDeploying(false); // Make sure to stop deploying on error
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating Required',
        description: 'Please select a star rating.',
      });
      return;
    }
    
    if (!user || !firestore) return;

    const feedbackCollectionRef = collection(firestore, 'feedbacks');
    const newFeedbackRef = doc(feedbackCollectionRef);
    const feedbackData = {
        userId: user.uid,
        projectName: lastDeployedProject || 'general',
        rating: feedbackRating,
        comment: feedbackComment,
        submittedAt: new Date(),
    };

    setDoc(newFeedbackRef, feedbackData)
        .then(() => {
            toast({
                title: 'Feedback Submitted!',
                description: 'Thank you for your feedback.',
            });
        })
        .catch(async (error) => {
             const permissionError = new FirestorePermissionError({
                path: newFeedbackRef.path,
                operation: 'create',
                requestResourceData: feedbackData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    setIsFeedbackDialogOpen(false);
    setFeedbackRating(0);
    setFeedbackComment('');
    setLastDeployedProject('');
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    let importedFiles = 0;

    const readFile = (file: File) => {
        return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                if (file.name.endsWith('.html')) {
                    setHtmlCode(content);
                    importedFiles++;
                } else if (file.name.endsWith('.css')) {
                    setCssCode(content);
                    importedFiles++;
                } else if (file.name.endsWith('.js')) {
                    setJsCode(content);
                    importedFiles++;
                }
                resolve();
            };
            reader.readAsText(file);
        });
    };

    const filePromises = Array.from(files).map(readFile);

    Promise.all(filePromises).then(() => {
        if (importedFiles > 0) {
            toast({
                title: 'Files Imported',
                description: `Successfully imported ${importedFiles} file(s).`,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'No Compatible Files',
                description: 'Could not find any .html, .css, or .js files to import.',
            });
        }
    });

    e.target.value = '';
  };
  
  const handleEditorClick = (e: React.MouseEvent) => {
      if (iframeRef.current && e.target === iframeRef.current) {
          e.stopPropagation();
      }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {isDeploying && <DeployingOverlay />}
      <AppHeader
        isDeploying={isDeploying}
        isRunning={isRunning}
        onDeploy={openDeployDialog}
        onRun={runCode}
        onImport={handleImportClick}
        mobileView={mobileView}
        onSwitchToCode={() => setMobileView('editor')}
        onFeedbackClick={() => setIsFeedbackDialogOpen(true)}
      />
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple 
        accept=".html,.css,.js" 
        className="hidden" 
      />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <main
          ref={containerRef}
          className="flex flex-1 overflow-hidden md:flex-row flex-col"
          onClick={handleEditorClick}
        >
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              isMobile ? (mobileView === 'editor' ? 'flex' : 'hidden') : 'flex'
            )}
            style={{ width: isMobile ? '100%' : `${sidebarWidth}%` }}
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
            className="w-2 h-full cursor-col-resize bg-border hover:bg-primary/20 transition-colors hidden md:block"
          />

          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              isMobile ? (mobileView === 'preview' ? 'flex' : 'hidden') : 'flex'
            )}
            style={{ width: isMobile ? '100%' : `${100 - sidebarWidth}%` }}
          >
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
                <div className="flex items-center justify-between pr-2 bg-muted rounded-t-md">
                  <TabsList className="grid w-full grid-cols-1 bg-muted">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullScreenPreviewOpen(true)}>
                    <Expand className="h-4 w-4" />
                    <span className="sr-only">Fullscreen Preview</span>
                  </Button>
                </div>
                <TabsContent value="preview" className="flex-1 overflow-auto bg-white mt-0">
                    <LivePreview srcDoc={srcDoc} ref={iframeRef} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>


      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />

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
                  Add "RunAndDeploy" watermark
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
      
      <Dialog open={isFullScreenPreviewOpen} onOpenChange={setIsFullScreenPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 m-0">
          <DialogHeader className="sr-only">
             <DialogTitle>Full Screen Preview</DialogTitle>
             <DialogDescription>A full screen preview of your code.</DialogDescription>
          </DialogHeader>
          <LivePreview srcDoc={srcDoc} isFullScreen={true} />
        </DialogContent>
      </Dialog>
      
       <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Thank you for using RunAndDeploy! How was your experience?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-8 w-8 cursor-pointer transition-colors',
                    feedbackRating >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  )}
                  onClick={() => setFeedbackRating(star)}
                />
              ))}
            </div>
             <div className="grid w-full gap-1.5">
              <Label htmlFor="feedback-comment">Comments (optional)</Label>
              <Textarea
                id="feedback-comment"
                placeholder="Tell us what you think..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
              Skip
            </Button>
            <Button type="button" onClick={handleFeedbackSubmit}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}

    