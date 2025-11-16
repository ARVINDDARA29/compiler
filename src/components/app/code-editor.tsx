'use client';

import type { FC } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CodeEditorProps {
  htmlCode: string;
  setHtmlCode: (code: string) => void;
  cssCode: string;
  setCssCode: (code: string) => void;
  jsCode: string;
  setJsCode: (code: string) => void;
  suggestions: string[];
  isSuggesting: boolean;
  onSuggest: () => void;
}

const CodeEditor: FC<CodeEditorProps> = ({
  htmlCode,
  setHtmlCode,
  cssCode,
  setCssCode,
  jsCode,
  setJsCode,
  suggestions,
  isSuggesting,
  onSuggest,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs defaultValue="html" className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="flex-1 overflow-y-auto">
          <Textarea
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            className="h-full min-h-[200px] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your HTML here..."
          />
        </TabsContent>
        <TabsContent value="css" className="flex-1 overflow-y-auto">
          <Textarea
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            className="h-full min-h-[200px] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your CSS here..."
          />
        </TabsContent>
        <TabsContent value="js" className="flex-1 overflow-y-auto">
          <Textarea
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            className="h-full min-h-[200px] resize-none border-0 font-code text-sm focus-visible:ring-0"
            placeholder="Type your JavaScript here..."
          />
        </TabsContent>
      </Tabs>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            <Lightbulb className="mr-2 inline-block h-4 w-4" />
            Dependency Suggestions
          </CardTitle>
          <Button onClick={onSuggest} disabled={isSuggesting} size="sm" variant="ghost">
            {isSuggesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Suggest'
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {isSuggesting ? (
            <p className="text-sm text-muted-foreground">Analyzing code...</p>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((dep) => (
                <Badge key={dep} variant="secondary">
                  {dep}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Suggest" to get library recommendations based on your code.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeEditor;
