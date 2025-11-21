'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CodeAssistantInputSchema = z.object({
  prompt: z.string(),
});

const CodeAssistantOutputSchema = z.object({
  html: z.string().optional(),
  css: z.string().optional(),
  js: z.string().optional(),
});

export const codeAssistantFlow = ai.defineFlow(
  {
    name: 'codeAssistantFlow',
    inputSchema: CodeAssistantInputSchema,
    outputSchema: z.string(),
    stream: true,
  },
  async (input, streamingCallback) => {
    const { stream } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are an expert web developer. The user will provide a prompt and you will generate the HTML, CSS, and JavaScript code to implement it.

      IMPORTANT:
      - You MUST return the code in a single JSON object.
      - The JSON object must have three keys: "html", "css", and "js".
      - The value for each key should be a string containing the code for that language.
      - Do NOT include any markdown formatting (like \`\`\`json) in your response. Just the raw JSON.
      - If a language is not needed, you can return an empty string for that key.

      User Prompt:
      ${input.prompt}`,
      stream: true,
      config: {
        temperature: 0.5,
      },
    });

    let finalResult = '';
    for await (const chunk of stream) {
      finalResult += chunk.text;
      if (streamingCallback) {
        streamingCallback(chunk.text);
      }
    }
    return finalResult;
  }
);

export async function runCodeAssistantFlow(prompt: string) {
  const { stream } = await codeAssistantFlow({prompt});
  return stream;
}
