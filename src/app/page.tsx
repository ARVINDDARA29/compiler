
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

const initialHtml = `<h1>Welcome to Your To-Do List</h1>
<div class="card">
  <input type="text" id="todo-input" placeholder="Add a new task...">
  <button id="add-btn">Add Task</button>
  <ul id="todo-list"></ul>
</div>
`;

const initialCss = `body {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -1px;
  margin-bottom: 2rem;
}

.card {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

#todo-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #334155;
  border-radius: 8px;
  background-color: #0f172a;
  color: #e2e8f0;
  font-size: 1rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

#add-btn {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  margin-bottom: 1.5rem;
}

#add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(56, 189, 248, 0.3);
}

#todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

#todo-list li {
  background: rgba(51, 65, 85, 0.5);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

#todo-list li.completed {
  text-decoration: line-through;
  color: #64748b;
}

#todo-list li:hover {
  background: rgba(51, 65, 85, 0.8);
}

#todo-list .delete-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 5px;
}
`;

const initialJs = `const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

function addTodo() {
    const todoText = todoInput.value.trim();
    if (todoText !== '') {
        const li = document.createElement('li');
        
        const span = document.createElement('span');
        span.textContent = todoText;
        li.appendChild(span);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', function() {
            todoList.removeChild(li);
        });
        li.appendChild(deleteBtn);
        
        li.addEventListener('click', function(e) {
            if (e.target.tagName !== 'BUTTON') {
                li.classList.toggle('completed');
            }
        });
        
        todoList.appendChild(li);
        todoInput.value = '';
    }
}
`;

type MobileView = 'editor' | 'preview';

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
  const [enableAds, setEnableAds] = useState(false);

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
    setSrcDoc(''); 
    setTimeout(() => {
        setSrcDoc(generateSrcDoc());
    }, 0);
    
    if (isMobile) {
        setMobileView('preview');
    }
  };


  useEffect(() => {
    const timeoutId = setTimeout(() => {
        const newSrcDoc = generateSrcDoc();
        setSrcDoc(newSrcDoc);
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [htmlCode, cssCode, jsCode]);

  useEffect(() => {
    if (isFullScreenPreviewOpen) {
      setSrcDoc(generateSrcDoc());
    }
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

    toast({
      title: 'Deploying Project...',
      description: "Your site will be ready in about 45 seconds. If traffic is high, it can sometimes take up to 1 hour.",
    });

    const isFullHtml = htmlCode.trim().toLowerCase().startsWith('<!doctype html>') || htmlCode.trim().toLowerCase().startsWith('<html>');

    try {
      const deploymentResult = await deployToGithub({
          html: isFullHtml ? htmlCode : htmlCode,
          css: isFullHtml ? '' : cssCode,
          js: isFullHtml ? '' : jsCode,
          projectName,
          addWatermark,
          enableAds,
      });

      if (deploymentResult.success && deploymentResult.url) {
        
        const sitesCollectionRef = collection(firestore, 'sites');
        const newSiteRef = doc(sitesCollectionRef, projectName);
        const siteData = {
          userId: user.uid,
          projectName: projectName,
          url: deploymentResult.url,
          deployedAt: new Date(),
          enableAds: enableAds,
        };

        setDoc(newSiteRef, siteData).catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: newSiteRef.path,
                operation: 'create',
                requestResourceData: siteData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
        
        // Wait 45 seconds before showing success, to give GitHub pages time to build
        await new Promise(resolve => setTimeout(resolve, 45000));
        
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
      setEnableAds(false);
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
      <AppHeader
        isDeploying={isDeploying}
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
      <div className="flex flex-col flex-1 h-full overflow-hidden">
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
             <div className="grid grid-cols-4 items-start gap-4">
               <Label htmlFor="ads" className="text-right pt-2">
                Monetize
              </Label>
              <div className="col-span-3 flex flex-col space-y-2">
                <div className='flex items-center space-x-2 pt-2'>
                    <Switch
                      id="ads"
                      checked={enableAds}
                      onCheckedChange={setEnableAds}
                    />
                    <Label htmlFor="ads" className="text-sm font-normal text-muted-foreground">
                      Enable Ads & Analytics
                    </Label>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Start earning by showing ads. Rates are approx. $0.36 per 1000 impressions.
                </p>
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

    