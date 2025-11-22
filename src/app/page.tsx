
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function Home() {
    const [apiKey, setApiKey] = useState('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');
    const [userPrompt, setUserPrompt] = useState('');
    const [code, setCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const codeOutputRef = useRef<HTMLElement>(null);
    const previewFrameRef = useRef<HTMLIFrameElement>(null);
    
    // System Prompt to enforce single file HTML
    const SYSTEM_PROMPT = `You are an expert Frontend Developer. 
    Your task is to write complete, production-ready web code based on the user's prompt.
    RULES:
    1. Output ONLY a single HTML file containing all CSS (in <style>) and JavaScript (in <script>).
    2. Do NOT use external CSS/JS files. Use CDNs only for libraries (Tailwind, FontAwesome, Three.js etc) if needed.
    3. Make the design modern, responsive, and visually stunning.
    4. Do NOT output markdown backticks (like \`\`\`html). Just raw code.
    5. If using Tailwind, use the script tag: <script src="https://cdn.tailwindcss.com"><\/script>
    6. Start directly with <!DOCTYPE html>.`;

    const generateCode = async () => {
        if (!userPrompt.trim()) {
            alert("Please enter a prompt!");
            return;
        }
        if (!apiKey.trim()) {
            alert("API Key is missing!");
            return;
        }

        if (isGenerating) {
            abortControllerRef.current?.abort();
            setIsGenerating(false);
            return;
        }

        setIsGenerating(true);
        setCode('');

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "kwaipilot/kat-coder-pro:free",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": userPrompt}
                    ],
                    "stream": true,
                    "max_tokens": 8000
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedCode = '';

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
                                setCode(accumulatedCode);
                            }
                        } catch (e) {
                            console.error("JSON Parse error", e);
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped.');
            } else {
                setCode(prev => prev + `\n\n[Error: ${error.message}]`);
            }
        } finally {
            setIsGenerating(false);
        }
    };
    
    const renderPreview = useCallback((codeToRender: string) => {
        if (previewFrameRef.current) {
            let cleanCode = codeToRender.replace(/```html|```/g, "");
            const blob = new Blob([cleanCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            previewFrameRef.current.src = url;
            // It's good practice to revoke the URL after it's loaded to free up memory
            previewFrameRef.current.onload = () => URL.revokeObjectURL(url);
        }
    }, []);

    useEffect(() => {
       if (!isGenerating && code) {
           renderPreview(code);
       }
       // Auto-scroll code view
       if (codeOutputRef.current) {
           codeOutputRef.current.parentElement!.scrollTop = codeOutputRef.current.parentElement!.scrollHeight;
       }
    }, [code, isGenerating, renderPreview]);


    const runCodeManual = () => {
        if (code) {
            renderPreview(code);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            alert("Code copied to clipboard!");
        });
    };

    const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey && e.key === 'Enter') {
            generateCode();
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <header className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-robot text-sky-400 text-xl"></i>
                    <h1 className="font-bold text-lg tracking-wide text-white">AI Code Architect <span className="text-xs text-slate-400 font-normal ml-2">v1.0 (Streaming)</span></h1>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <input 
                            type="password"
                            id="apiKeyInput"
                            placeholder="OpenRouter API Key"
                            className="bg-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded border border-slate-600 focus:border-sky-500 outline-none w-48 transition-all"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-64 p-2 bg-black text-xs rounded hidden group-hover:block z-50 border border-slate-700">
                            Default key loaded. Change if needed.
                        </div>
                    </div>
                    <button onClick={runCodeManual} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2">
                        <i className="fa-solid fa-play"></i> Run Again
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 flex flex-col border-r border-slate-700">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                        <label className="block text-sky-400 text-sm font-semibold mb-2">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Kya banana hai? (Prompt)
                        </label>
                        <div className="relative">
                            <textarea 
                                id="userPrompt"
                                className="w-full h-24 bg-slate-900 text-slate-200 p-3 rounded-lg border border-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none text-sm shadow-inner"
                                placeholder="Example: Ek login page banao jisme floating particles background ho aur glassmorphism effect ho..."
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                onKeyDown={handlePromptKeyDown}
                            ></textarea>
                            <button id="generateBtn" onClick={generateCode} className="absolute bottom-3 right-3 bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <span>{isGenerating ? 'Stop' : 'Generate'}</span> 
                                <i className={`fa-solid ${isGenerating ? 'fa-stop' : 'fa-paper-plane'}`}></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                        <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42] text-xs">
                            <span className="text-slate-300 font-mono">generated_code.html</span>
                            <div className="flex gap-2">
                                <button onClick={copyToClipboard} className="text-slate-400 hover:text-white" title="Copy Code">
                                    <i className="fa-regular fa-copy"></i>
                                </button>
                                {isGenerating && <span className="text-slate-500 italic flex items-center"><div className="loader mr-1"></div> Generating...</span>}
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 relative">
                            <pre className="code-editor text-sm m-0"><code ref={codeOutputRef} className="language-html text-green-400 whitespace-pre-wrap">{code}</code>{isGenerating && <span className="typing-cursor"></span>}</pre>
                        </div>
                    </div>
                </div>
                <div className="w-1/2 flex flex-col bg-white">
                    <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex justify-between items-center">
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
    );
}
