'use server';
/**
 * @fileoverview A flow to validate a Gemini API key.
 *
 * - validateApiKey - A function that makes a simple, low-cost call to the Gemini API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ValidationInputSchema = z.object({
  apiKey: z.string(),
});

const ValidationOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const validateApiKeyFlow = ai.defineFlow(
  {
    name: 'validateApiKeyFlow',
    inputSchema: ValidationInputSchema,
    outputSchema: ValidationOutputSchema,
  },
  async (input) => {
    try {
      // Use a very simple, non-streaming prompt to test the key.
      const result = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: 'Say "hello".',
        auth: input.apiKey, // Use the provided API key for this specific call
        config: {
            temperature: 0,
        },
      });

      // Check if we got a response.
      if (result.text) {
        return { success: true };
      } else {
        // This case might happen if the API returns a 200 OK but with no content
        return { success: false, error: 'API returned an empty response.' };
      }
    } catch (e: any) {
      console.error('API Key validation failed:', e);
      // The error from Genkit/Google AI will likely contain the reason for failure.
      let errorMessage = 'An unknown error occurred.';
      if (e.message) {
         // Extract a more user-friendly error message
         if (e.message.includes('API key not valid')) {
            errorMessage = 'The provided API key is not valid. Please check the key and try again.';
         } else if (e.message.includes('permission')) {
            errorMessage = 'The API key is missing required permissions for the Gemini API.';
         } else {
            errorMessage = e.message;
         }
      }
      return { success: false, error: errorMessage };
    }
  }
);

export async function validateApiKey(apiKey: string): Promise<z.infer<typeof ValidationOutputSchema>> {
    return validateApiKeyFlow({ apiKey });
}
