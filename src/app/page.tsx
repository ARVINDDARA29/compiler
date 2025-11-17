
'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Expand, Star, MessageSquarePlus } from 'lucide-react';
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
import { useUser, useFirebase } from '@/firebase';
import { AuthDialog } from '@/components/app/auth-dialog';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';

const initialHtml = `<header class="hero">
  <h1>My Awesome Product</h1>
  <p>A solution for all your needs. Innovative, fast, and reliable.</p>
  <a href="#about" class="cta-button">Learn More</a>
</header>
<section id="about" class="about-us">
  <h2>About Us</h2>
  <p>We are a team of passionate developers dedicated to creating the best products. Our mission is to solve real-world problems with elegant and efficient solutions.</p>
</section>
`;

const initialCss = `body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f9f9f9;
  color: #333;
  line-height: 1.6;
}

.hero {
  background-color: #2E3192;
  color: white;
  padding: 4rem 2rem;
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.cta-button {
  background-color: #6639A6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.cta-button:hover {
  background-color: #522d83;
}

.about-us {
  padding: 4rem 2rem;
  text-align: center;
  background-color: #fff;
}

.about-us h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #2E3192;
}
`;

const initialJs = `document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();

    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
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
  const [projectName, setProjectName] = useState('');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  
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

  const runCode = () => {
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
    if (isMobile) {
      setMobileView('preview');
    }
  };

  useEffect(() => {
    runCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on initial load

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
      description: "Your site will be ready in about 45 seconds. If it's not live after a minute, try refreshing the page.",
    });

    const deploymentPromise = deployToGithub({
      html: htmlCode,
      css: cssCode,
      js: jsCode,
      projectName,
      addWatermark,
    });
    
    const timerPromise = new Promise(resolve => setTimeout(resolve, 45000));

    try {
      const [deploymentResult] = await Promise.all([deploymentPromise, timerPromise]);

      if (deploymentResult.success && deploymentResult.url) {
        
        const sitesCollectionRef = collection(firestore, 'sites');
        const newSiteRef = doc(sitesCollectionRef, projectName);

        await setDoc(newSiteRef, {
          userId: user.uid,
          projectName: projectName,
          url: deploymentResult.url,
          deployedAt: new Date(),
        });
        
        setLastDeployedProject(projectName);

        toast({
          title: 'Deployment Successful!',
          description: 'Your link is permanent and free forever.',
          duration: 9000,
          action: (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFeedbackDialogOpen(true)}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Feedback
              </Button>
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

    try {
        const feedbackCollectionRef = collection(firestore, 'feedbacks');
        const newFeedbackRef = doc(feedbackCollectionRef);
        await setDoc(newFeedbackRef, {
            userId: user.uid,
            projectName: lastDeployedProject,
            rating: feedbackRating,
            comment: feedbackComment,
            submittedAt: new Date(),
        });

        toast({
            title: 'Feedback Submitted!',
            description: 'Thank you for your feedback.',
        });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Feedback Failed',
            description: 'Could not submit your feedback. Please try again.',
        });
    } finally {
        setIsFeedbackDialogOpen(false);
        setFeedbackRating(0);
        setFeedbackComment('');
        setLastDeployedProject('');
    }
  };
  
  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <AppHeader
        isDeploying={isDeploying}
        onDeploy={openDeployDialog}
        onRun={runCode}
        mobileView={mobileView}
        onSwitchToCode={() => setMobileView('editor')}
      />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <main
          ref={containerRef}
          className="flex flex-1 overflow-hidden md:flex-row flex-col"
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
                    <LivePreview srcDoc={srcDoc} />
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
