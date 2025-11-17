import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'sk-I7liW57oWSJBRFaa1yLr0v9nYOh5PZJb9NAInR22LwbYhEon',
      // Point to the OpenAI-compatible endpoint
      baseUrl: 'https://api.chatanywhere.tech/v1',
    }),
  ],
  // While we use the googleAI plugin for transport, we still specify the model name
  // that the target endpoint (OpenAI-compatible) expects.
  model: 'gpt-3.5-turbo',
});
