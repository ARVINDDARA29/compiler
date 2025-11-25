
/**
 * @fileoverview This file initializes the Genkit AI plugin.
 *
 * It is marked with 'use server' to indicate that it can be used in
 * server-side code.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiVersion: 'v1'})],
});
