'use client';

import type { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CodeEditorProps {
  htmlCode: string;
  setHtmlCode: (code: string) => void;
  cssCode: string;
  setCssCode: (code: string) => void;
  jsCode: string;
  setJsCode: (code: string) => void;
}

const CodeEditor: FC<CodeEditorProps> = ({
  htmlCode,
  setHtmlCode,
  cssCode,
  setCssCode,
  jsCode,
  setJsCode,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs defaultValue="html" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="flex-1 overflow-y-auto">
          <Textarea
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            className="h-full min-h-[calc(100vh-200px)] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your HTML here..."
          />
        </TabsContent>
        <TabsContent value="css" className="flex-1 overflow-y-auto">
          <Textarea
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            className="h-full min-h-[calc(100vh-200px)] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your CSS here..."
          />
        </TabsContent>
        <TabsContent value="js" className="flex-1 overflow-y-auto">
          <Textarea
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            className="h-full min-h-[calc(100vh-200px)] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your JavaScript here..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodeEditor;
