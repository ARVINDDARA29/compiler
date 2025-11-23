
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { AuthDialog } from '@/components/app/auth-dialog';
import { DeployDialog } from '@/components/app/deploy-dialog';
import DeployingOverlay from '@/components/app/deploying-overlay';
import { FeedbackDialog } from '@/components/app/feedback-dialog';
import { useUser, useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { deployToCloudflare } from '@/app/actions/deploy';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';


const defaultHtml = `
<div class="container">
  <header>
    <h1>Welcome to RunAndDeploy</h1>
    <p>Your simple editor for HTML, CSS, and JavaScript.</p>
  </header>
  <main>
    <h2>Created by Arvind Bishnoi</h2>
    <p>This tool allows you to write code in the editors and see a live preview instantly. When you're ready, you can deploy your project with a single click.</p>
    <p>Feel free to edit this code and start your own project!</p>
  </main>
  <footer>
    <p>Happy Coding!</p>
  </footer>
</div>
`.trim();

const defaultCss = `
body {
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  color: #333;
  margin: 0;
  text-align: center;
}

.container {
  background-color: #ffffff;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  max-width: 600px;
}

header h1 {
  font-size: 2.5rem;
  color: #1a73e8;
  margin-bottom: 0.5rem;
}

header p {
  font-size: 1.1rem;
  color: #5f6368;
  margin-top: 0;
}

main h2 {
  font-size: 1.5rem;
  margin-top: 2rem;
  color: #3c4043;
}

p {
  line-height: 1.6;
}

footer {
  margin-top: 2rem;
  font-style: italic;
  color: #5f6368;
}
`.trim();

const defaultJs = `
// Feel free to add your own JavaScript!
console.log("Welcome to RunAndDeploy by Arvind Bishnoi!");
`.trim();


export default function Home() {
  const [htmlCode, setHtmlCode] = useState(defaultHtml);
  const [cssCode, setCssCode] = useState(defaultCss);
  const [jsCode, setJsCode] = useState(defaultJs);
  const [srcDoc, setSrcDoc] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [showDeployingOverlay, setShowDeployingOverlay] = useState(false);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');


  const { toast } = useToast();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const isMobile = useIsMobile();
  const previewRef = useRef<HTMLIFrameElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  

  const runCode = useCallback(() => {
    setIsRunning(true);
    const combinedSrc = `
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
    setSrcDoc(combinedSrc);
    // Give iframe time to render
    setTimeout(() => {
        setIsRunning(false);
        if (isMobile) {
            setMobileView('preview');
        }
    }, 300);
  }, [htmlCode, cssCode, jsCode, isMobile]);

  useEffect(() => {
    runCode();
  }, []);

  const handleDeployClick = () => {
    if (user) {
      setIsDeployDialogOpen(true);
    } else {
      setIsAuthDialogOpen(true);
    }
  };
  
  const handleConfirmDeploy = async (projectName: string, addWatermark: boolean) => {
    setIsDeployDialogOpen(false);
    setIsDeploying(true);
    setShowDeployingOverlay(true);

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Please log in to deploy.',
      });
      setIsDeploying(false);
      setShowDeployingOverlay(false);
      return;
    }

    try {
      // Short delay for better UX, can be adjusted or removed
      await new Promise(resolve => setTimeout(resolve, 1500));

      const enableUserSpecificUrl = JSON.parse(localStorage.getItem('enableUserSpecificUrl') || 'false');
      let finalProjectName = projectName;

      if (enableUserSpecificUrl && user.displayName) {
        const sanitizedUserName = user.displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        finalProjectName = `${sanitizedUserName}-${projectName}`; // Using a hyphen separator
      }
      
      const siteId = `${user.uid}-${finalProjectName.replace('/', '-')}`;

      const result = await deployToCloudflare({
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        projectName: finalProjectName,
        addWatermark,
        siteId,
      });

      if (result.success && result.url) {
        const siteData = {
          userId: user.uid,
          projectName: finalProjectName,
          url: result.url,
          deployedAt: serverTimestamp(),
        };
        const siteRef = doc(firestore, 'sites', siteId);
        await setDoc(siteRef, siteData).catch(err => {
             const path = siteRef.path;
             const operation = 'create';
             const requestResourceData = siteData;
             const permissionError = new FirestorePermissionError({path, operation, requestResourceData});
             errorEmitter.emit('permission-error', permissionError);
        });

        toast({
          title: 'Deployment Successful!',
          description: (
            <span>
              Your site is live at: {' '}
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">
                {result.url}
              </a>
            </span>
          ),
          duration: 10000,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Deployment Failed',
          description: result.error || 'An unknown error occurred.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsDeploying(false);
      setShowDeployingOverlay(false);
    }
  };

  const handleImport = () => {
    importFileRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (file.name.endsWith('.html')) {
          setHtmlCode(content);
        } else if (file.name.endsWith('.css')) {
          setCssCode(content);
        } else if (file.name.endsWith('.js')) {
          setJsCode(content);
        }
      };
      reader.readAsText(file);
    }
    toast({ title: 'Files Imported', description: 'Code editors have been updated.' });
    event.target.value = ''; // Reset input
  };
  
  const handleExport = () => {
    const content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Project</title>
  <style>
    ${cssCode}
  </style>
</head>
<body>
  ${htmlCode}
  <script>
    ${jsCode}
  </script>
</body>
</html>
    `.trim();

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Project Exported', description: 'index.html has been downloaded.' });
  };
  
  const handleFeedbackClick = () => {
    if (user) {
        setIsFeedbackDialogOpen(true);
    } else {
        setIsAuthDialogOpen(true);
    }
  }


  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <AnimatePresence>
        {showDeployingOverlay && <DeployingOverlay />}
      </AnimatePresence>

      <AppHeader
        isDeploying={isDeploying}
        isRunning={isRunning}
        onDeploy={handleDeployClick}
        onRun={runCode}
        onImport={handleImport}
        onExport={handleExport}
        mobileView={mobileView}
        onSwitchToCode={() => setMobileView('editor')}
        onFeedbackClick={handleFeedbackClick}
      />
      <input type="file" ref={importFileRef} onChange={handleFileChange} accept=".html,.css,.js" multiple style={{ display: 'none' }} />

      <main className="flex-1 overflow-hidden">
        {isMobile ? (
            <div className="h-full">
                {mobileView === 'editor' ? (
                   <CodeEditor
                        htmlCode={htmlCode}
                        setHtmlCode={setHtmlCode}
                        cssCode={cssCode}
                        setCssCode={setCssCode}
                        jsCode={jsCode}
                        setJsCode={setJsCode}
                    />
                ) : (
                    <LivePreview ref={previewRef} srcDoc={srcDoc} />
                )}
            </div>
        ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={50}>
                    <CodeEditor
                        htmlCode={htmlCode}
                        setHtmlCode={setHtmlCode}
                        cssCode={cssCode}
                        setCssCode={setCssCode}
                        jsCode={jsCode}
                        setJsCode={setJsCode}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50}>
                    <LivePreview ref={previewRef} srcDoc={srcDoc} />
                </ResizablePanel>
            </ResizablePanelGroup>
        )}
      </main>

      <AuthDialog 
        open={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
      />
      <DeployDialog 
        open={isDeployDialogOpen} 
        onOpenChange={setIsDeployDialogOpen} 
        onConfirm={handleConfirmDeploy}
        isDeploying={isDeploying} 
      />
      <FeedbackDialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
      />
    </div>
  );
}
