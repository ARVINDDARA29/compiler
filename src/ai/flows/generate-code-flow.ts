'use server';

/**
 * @fileOverview An AI flow for generating HTML, CSS, and JavaScript code from a user prompt.
 *
 * - generateCode - A function that handles the code generation process.
 * - GenerateCodeInput - The input type for the generateCode function.
 * - GenerateCodeOutput - The return type for the generateCode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const GenerateCodeInputSchema = z.object({
  prompt: z.string().describe('The user\'s description of the code to generate.'),
});
export type GenerateCodeInput = z.infer<typeof GenerateCodeInputSchema>;

const GenerateCodeOutputSchema = z.object({
  html: z.string().describe('The generated HTML code. This should be the content for the <body> tag.'),
  css: z.string().describe('The generated CSS code. This should be clean, modern, and responsive.'),
  js: z.string().describe('The generated JavaScript code. This should be for interactivity and can be empty if not needed.'),
});
export type GenerateCodeOutput = z.infer<typeof GenerateCodeOutputSchema>;


export async function generateCode(input: GenerateCodeInput): Promise<GenerateCodeOutput> {
  return generateCodeFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateCodePrompt',
    // Specify the model directly here.
    model: 'gpt-3.5-turbo',
    input: { schema: GenerateCodeInputSchema },
    output: { schema: GenerateCodeOutputSchema },
    prompt: `You are an expert web developer. Your task is to generate HTML, CSS, and JavaScript code based on a user's prompt.
    
    The user wants to build a single-page component or website.
    
    Guidelines:
    - HTML: Generate only the content for the <body> tag. Do not include <html>, <head>, or <body> tags. Use semantic HTML5 elements.
    - CSS: Generate modern, clean, and responsive CSS. Use flexbox or grid for layout. Add a basic color scheme and typography.
    - JavaScript: Generate code for interactivity if the prompt implies it (e.g., "a button that shows an alert"). If no interactivity is needed, you can return an empty string. Do not include <script> tags.
    - Be creative and generate visually appealing results.
    - Ensure the generated code is self-contained and does not rely on external libraries unless absolutely necessary.
    - Do not add comments to the code.
    
    User Prompt: {{{prompt}}}
    `,
});


const generateCodeFlow = ai.defineFlow(
  {
    name: 'generateCodeFlow',
    inputSchema: GenerateCodeInputSchema,
    outputSchema: GenerateCodeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
