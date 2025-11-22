
'use client';

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [userPrompt, setUserPrompt] = useState('');
  const [apiKey, setApiKey] = useState('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');
  const [codeOutput, setCodeOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const MODEL_NAME = "kwaipilot/kat-coder-pro:free";
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const SYSTEM_PROMPT = `You are an expert Frontend Developer. 
        Your task is to write complete, production-ready web code based on the user's prompt.
        RULES:
        1. Output ONLY a single HTML file containing all CSS (in <style>) and JavaScript (in <script>).
        2. Do NOT use external CSS/JS files. Use CDNs only for libraries (Tailwind, FontAwesome, Three.js etc) if needed.
        3. Make the design modern, responsive, and visually stunning.
        4. Do NOT output markdown backticks (like \`\`\`html). Just raw code.
        5. If using Tailwind, use the script tag: <script src="https://cdn.tailwindcss.com"><\/script>
        6. Start directly with <!DOCTYPE html>.`;

  useEffect(() => {
    if (codeContainerRef.current) {
        codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [codeOutput]);


  const generateCode = async () => {
    if (!userPrompt.trim()) {
      alert("Please enter a prompt!");
      return;
    }
    if (!apiKey.trim()) {
      alert("API Key is missing!");
      return;
    }

    setIsGenerating(true);
    setCodeOutput('');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    let accumulatedCode = '';

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AI Code Architect",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": MODEL_NAME,
          "messages": [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": userPrompt }
          ],
          "stream": true,
          "max_tokens": 8000
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                accumulatedCode += content;
                let cleanDisplay = accumulatedCode.replace(/```html|```/g, "");
                setCodeOutput(cleanDisplay);
              }
            } catch (e) {
              console.error("JSON Parse error", e);
            }
          }
        }
      }
      
      renderPreview(accumulatedCode);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped.');
      } else {
        setCodeOutput(prev => prev + `\n\n[Error: ${error.message}]`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = (code: string) => {
    let cleanCode = code.replace(/```html|```/g, "");
    if (previewFrameRef.current) {
        const blob = new Blob([cleanCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewFrameRef.current.src = url;

        // It's good practice to revoke the URL when it's no longer needed
        // but for an iframe that stays, this might be tricky.
        // You can revoke it when a new one is created.
        if (previewFrameRef.current.dataset.previousUrl) {
            URL.revokeObjectURL(previewFrameRef.current.dataset.previousUrl);
        }
        previewFrameRef.current.dataset.previousUrl = url;
    }
  };

  const runCodeManual = () => {
    if (codeOutput) {
      renderPreview(codeOutput);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeOutput).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      generateCode();
    }
  };

  return (
    <>
      <Head>
        <title>AI Prompt to Code (Stream)</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </Head>
      <div className="h-screen flex flex-col bg-[#0f172a] text-[#e2e8f0] font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-robot text-sky-400 text-xl"></i>
            <h1 className="font-bold text-lg tracking-wide text-white">AI Code Architect <span className="text-xs text-slate-400 font-normal ml-2">v1.0 (Streaming)</span></h1>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative group">
              <input type="password" id="apiKeyInput" placeholder="OpenRouter API Key"
                className="bg-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded border border-slate-600 focus:border-sky-500 outline-none w-48 transition-all"
                value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <div className="absolute right-0 top-full mt-1 w-64 p-2 bg-black text-xs rounded hidden group-hover:block z-50 border border-slate-700">
                Default key loaded. Change if needed.
              </div>
            </div>
            <button onClick={runCodeManual} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2">
              <i className="fa-solid fa-play"></i> Run Again
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Input & Code View */}
          <div className="w-1/2 flex flex-col border-r border-slate-700">
            <div className="p-4 bg-slate-800/50 border-b border-slate-700">
              <label className="block text-sky-400 text-sm font-semibold mb-2">
                <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Kya banana hai? (Prompt)
              </label>
              <div className="relative">
                <textarea id="userPrompt"
                  className="w-full h-24 bg-slate-900 text-slate-200 p-3 rounded-lg border border-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none text-sm shadow-inner"
                  placeholder="Example: Ek login page banao jisme floating particles background ho aur glassmorphism effect ho..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
                />
                <button id="generateBtn" onClick={generateCode} disabled={isGenerating}
                  className="absolute bottom-3 right-3 bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span>Generate</span> <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
              <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42] text-xs shrink-0">
                <span className="text-slate-300 font-mono">generated_code.html</span>
                <div className="flex gap-2 items-center">
                  <button onClick={copyToClipboard} className="text-slate-400 hover:text-white" title="Copy Code">
                    {isCopied ? <i className="fa-solid fa-check"></i> : <i className="fa-regular fa-copy"></i>}
                  </button>
                  {isGenerating && (
                    <span id="statusIndicator" className="text-slate-500 italic flex items-center">
                      <div className="loader mr-1"></div> Generating...
                    </span>
                  )}
                </div>
              </div>
              <div ref={codeContainerRef} className="flex-1 overflow-auto p-4 relative">
                <pre className="code-editor text-sm m-0"><code id="codeOutput" className="language-html text-green-400 whitespace-pre-wrap break-words">{codeOutput}</code>{isGenerating && <span id="cursor" className="typing-cursor"></span>}</pre>
              </div>
            </div>
          </div>

          {/* Right Side: Live Preview */}
          <div className="w-1/2 flex flex-col bg-white">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex justify-between items-center shrink-0">
              <span className="text-slate-600 text-xs font-bold uppercase tracking-wider"><i className="fa-solid fa-desktop mr-1"></i> Live Preview</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            </div>
            <div className="flex-1 relative bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgb3BhY2l0eT0iMC4wNSI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48L3N2Zz4=')]">
              <iframe ref={previewFrameRef} className="w-full h-full border-none" sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"></iframe>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        /* Placed here to not interfere with Next.js's built-in globals */
        body {
            /* These styles are applied to the parent body, let's control it inside the component */
        }
        
        .glass-panel {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #1e293b; 
        }
        ::-webkit-scrollbar-thumb {
            background: #475569; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #64748b; 
        }

        .code-editor {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            line-height: 1.5;
        }

        .typing-cursor::after {
            content: '▋';
            animation: blink 1s step-start infinite;
            color: #38bdf8;
        }

        @keyframes blink {
            50% { opacity: 0; }
        }

        /* Loader */
        .loader {
            border: 3px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            border-top: 3px solid #38bdf8;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            display: inline-block;
            vertical-align: middle;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

    