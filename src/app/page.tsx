
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { useIsMobile } from '@/hooks/use-mobile';
import { deployToGithub } from '@/app/actions/deploy';
import DeployingOverlay from '@/components/app/deploying-overlay';
import { useToast } from '@/hooks/use-toast';
import { AuthDialog } from '@/components/app/auth-dialog';
import { useUser, useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AiAssistantDialog } from '@/components/app/ai-assistant-dialog';
import { DeployDialog } from '@/components/app/deploy-dialog';


const DEFAULT_HTML = `
<div class="flex items-center justify-center h-full">
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold">Welcome to RunAndDeploy</h1>
    <p class="text-muted-foreground">Click the "Run" button to see your changes live!</p>
  </div>
</div>
`;

export default function Home() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [srcDoc, setSrcDoc] = useState('');

  const [isDeploying, setIsDeploying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
  const [isAiDialogOpen, setAiDialogOpen] = useState(false);
  const [isDeployDialogOpen, setDeployDialogOpen] = useState(false);

  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const { toast } = useToast();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const previewFrameRef = useRef<HTMLIFrameElement>(null);


  const handleRunCode = useCallback(() => {
    setIsRunning(true);
    const combinedSrc = `
      <html>
        <head>
          <style>${cssCode}</style>
          <script>
            window.addEventListener('error', function(event) {
              console.error('Error in iframe:', event.error);
            });
          <\/script>
        </head>
        <body>
          ${htmlCode}
          <script>${jsCode}<\/script>
        </body>
      </html>
    `;
    setSrcDoc(combinedSrc);
    // Simulate a short delay for the 'running' state
    setTimeout(() => setIsRunning(false), 300);
    if (isMobile) {
      setMobileView('preview');
    }
  }, [htmlCode, cssCode, jsCode, isMobile]);

  useEffect(() => {
    // Initial run on page load
    const initialSrc = `
      <html>
        <head>
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
        </body>
      </html>
    `;
    setSrcDoc(initialSrc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeployClick = () => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    setDeployDialogOpen(true);
  };
  
  const handleConfirmDeploy = async (projectName: string, addWatermark: boolean) => {
    if (!projectName || projectName.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Deployment Canceled',
        description: 'You must provide a project name.',
      });
      return;
    }

    setIsDeploying(true);
    setDeployDialogOpen(false); // Close the dialog

    try {
      const result = await deployToGithub({
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        projectName,
        addWatermark,
      });

      if (result.success && result.url && firestore && user) {
        // Save to Firestore
        const siteData = {
          userId: user.uid,
          projectName: projectName,
          url: result.url,
          deployedAt: serverTimestamp(),
        };
        // Use a more robust doc ID to prevent overwrites on same project name by different users
        const siteRef = doc(firestore, 'sites', `${user.uid}-${projectName.replace(/\s+/g, '-').toLowerCase()}`);
        await setDoc(siteRef, siteData);

        toast({
          title: 'Deployment Successful!',
          description: `Your site is live at: ${result.url}`,
          duration: 9000,
          action: (
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              <button className="bg-primary text-primary-foreground p-2 rounded-md text-sm">Visit</button>
            </a>
          ),
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Deployment Failed',
          description: result.error || 'An unknown error occurred.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsDeploying(false);
    }
  };
  
  const handleAiCodeUpdate = (codes: { html?: string; css?: string; js?: string }) => {
    setHtmlCode(codes.html || '');
    setCssCode(codes.css || '');
    setJsCode(codes.js || '');
    // We don't auto-run after AI generation, let the user click "Run"
  };


  const EditorView = (
      <CodeEditor
        htmlCode={htmlCode}
        setHtmlCode={setHtmlCode}
        cssCode={cssCode}
        setCssCode={setCssCode}
        jsCode={jsCode}
        setJsCode={setJsCode}
        onAiAssistClick={() => setAiDialogOpen(true)}
      />
  );

  const PreviewView = <LivePreview ref={previewFrameRef} srcDoc={srcDoc} />;

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <AppHeader
          isDeploying={isDeploying}
          isRunning={isRunning}
          onDeploy={handleDeployClick}
          onRun={handleRunCode}
          onImport={() => {}}
          mobileView={mobileView}
          onSwitchToCode={() => setMobileView('editor')}
          onFeedbackClick={() => {}}
        />
        <main className="flex-1 overflow-hidden">
          {mobileView === 'editor' ? EditorView : PreviewView}
        </main>
      </div>
    );
  }

  return (
    <>
    {isDeploying && <DeployingOverlay />}
    <AuthDialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen} />
    <AiAssistantDialog open={isAiDialogOpen} onOpenChange={setAiDialogOpen} onCodeUpdate={handleAiCodeUpdate} />
    <DeployDialog 
        open={isDeployDialogOpen} 
        onOpenChange={setDeployDialogOpen}
        onConfirm={handleConfirmDeploy}
    />

    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        isDeploying={isDeploying}
        isRunning={isRunning}
        onDeploy={handleDeployClick}
        onRun={handleRunCode}
        onImport={() => {}}
        mobileView="editor"
        onSwitchToCode={() => {}}
        onFeedbackClick={() => {}}
      />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={25}>
          {EditorView}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          {PreviewView}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    </>
  );
}
