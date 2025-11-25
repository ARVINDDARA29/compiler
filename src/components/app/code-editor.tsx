
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
  onTabChange: (tab: 'html' | 'css' | 'js') => void;
}

const CodeEditor: FC<CodeEditorProps> = ({
  htmlCode,
  setHtmlCode,
  cssCode,
  setCssCode,
  jsCode,
  setJsCode,
  onTabChange,
}) => {
  return (
    <Tabs defaultValue="html" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card h-full" onValueChange={(value) => onTabChange(value as 'html' | 'css' | 'js')}>
      <div className="flex items-center justify-between pr-2 bg-muted">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="html" className="flex-1 overflow-y-auto mt-0">
        <Textarea
          value={htmlCode}
          onChange={(e) => setHtmlCode(e.target.value)}
          className="h-full w-full resize-none border-0 rounded-none font-code text-sm focus-visible:ring-0"
          placeholder="Type your HTML here..."
        />
      </TabsContent>
      <TabsContent value="css" className="flex-1 overflow-y-auto mt-0">
        <Textarea
          value={cssCode}
          onChange={(e) => setCssCode(e.target.value)}
          className="h-full w-full resize-none border-0 rounded-none font-code text-sm focus-visible:ring-0"
          placeholder="Type your CSS here..."
        />
      </TabsContent>
      <TabsContent value="js" className="flex-1 overflow-y-auto mt-0">
        <Textarea
          value={jsCode}
          onChange={(e) => setJsCode(e.target.value)}
          className="h-full w-full resize-none border-0 rounded-none font-code text-sm focus-visible:ring-0"
          placeholder="Type your JavaScript here..."
        />
      </TabsContent>
    </Tabs>
  );
};

export default CodeEditor;
