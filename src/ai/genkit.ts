import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    // Initialize with an empty key from environment variables and allow insecure to prevent startup crash.
    // The actual key will be provided per-request in the flows from the frontend.
    googleAI({apiKey: process.env.GEMINI_API_KEY || '', allowInsecure: true}),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
