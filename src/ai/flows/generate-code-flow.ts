
'use server';
/**
 * @fileOverview A Genkit flow for generating code based on a user prompt.
 *
 * - generateCode - A function that streams code generation.
 * - GenerateCodeInput - The input type for the generateCode function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCodeInputSchema = z.object({
  prompt: z.string().describe('The user prompt describing the code to generate.'),
  language: z.enum(['html', 'css', 'js']).describe('The programming language to generate.'),
});

export type GenerateCodeInput = z.infer<typeof GenerateCodeInputSchema>;

export async function generateCode(input: GenerateCodeInput) {
  const { stream } = await generateCodeFlow(input);
  return stream;
}

const generateCodeFlow = ai.defineFlow(
  {
    name: 'generateCodeFlow',
    inputSchema: GenerateCodeInputSchema,
    outputSchema: z.string(),
    stream: true,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `You are an expert coding assistant. Generate a code snippet based on the user's prompt.
      The desired language is ${input.language}.
      Only output the raw code for the snippet. Do not include any markdown, explanations, or any text other than the code itself.
      
      USER PROMPT: ${input.prompt}`,
      model: 'googleai/gemini-1.5-flash',
      stream: true,
    });

    return llmResponse.stream();
  }
);
