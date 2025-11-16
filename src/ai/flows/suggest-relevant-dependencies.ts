'use server';

/**
 * @fileOverview Provides suggestions for relevant HTML, JavaScript, and CSS libraries based on the user's code.
 *
 * - suggestRelevantDependencies - A function that suggests dependencies based on code.
 * - SuggestRelevantDependenciesInput - The input type for the suggestRelevantDependencies function.
 * - SuggestRelevantDependenciesOutput - The return type for the suggestRelevantDependencies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelevantDependenciesInputSchema = z.object({
  code: z.string().describe('The HTML, CSS, and JavaScript code to analyze.'),
});
export type SuggestRelevantDependenciesInput = z.infer<typeof SuggestRelevantDependenciesInputSchema>;

const SuggestRelevantDependenciesOutputSchema = z.object({
  dependencies: z.array(z.string()).describe('A list of suggested library dependencies.'),
});
export type SuggestRelevantDependenciesOutput = z.infer<typeof SuggestRelevantDependenciesOutputSchema>;

export async function suggestRelevantDependencies(input: SuggestRelevantDependenciesInput): Promise<SuggestRelevantDependenciesOutput> {
  return suggestRelevantDependenciesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelevantDependenciesPrompt',
  input: {schema: SuggestRelevantDependenciesInputSchema},
  output: {schema: SuggestRelevantDependenciesOutputSchema},
  prompt: `You are an expert web development assistant. Analyze the following code and suggest relevant HTML, JavaScript, and CSS libraries that could be useful to the developer. Only suggest libraries that are highly relevant to the code provided. Return a list of library names, do not provide any other explanation.

Code:
{{code}}`,
});

const suggestRelevantDependenciesFlow = ai.defineFlow(
  {
    name: 'suggestRelevantDependenciesFlow',
    inputSchema: SuggestRelevantDependenciesInputSchema,
    outputSchema: SuggestRelevantDependenciesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
