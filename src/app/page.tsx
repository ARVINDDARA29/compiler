'use client';

import { useState } from 'react';
import AppHeader from '@/components/app/app-header';
import CodeEditor from '@/components/app/code-editor';
import LivePreview from '@/components/app/live-preview';
import { deployToGithub } from '@/app/actions/deploy';
import { getSuggestions } from '@/app/actions/suggest';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  
  const { toast } = useToast();

  const handleDeploy = async () => {
    setIsDeploying(true);
    const result = await deployToGithub({ html: htmlCode, css: cssCode, js: jsCode });
    setIsDeploying(false);

    if (result.success) {
      toast({
        title: "Deployment Successful!",
        description: "Your code has been pushed to GitHub.",
        action: (
          <a href={`https://adbossappmaker.github.io/sites/`} target="_blank" rel="noopener noreferrer">
             <Button variant="outline" size="sm">View Site</Button>
          </a>
        ),
      });
    } else {
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
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
    <div className="flex h-screen w-screen flex-col bg-secondary">
      <AppHeader isDeploying={isDeploying} onDeploy={handleDeploy} />
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
  );
}
