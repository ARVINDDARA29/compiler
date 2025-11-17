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
  // The model is now specified in the flow file that uses it.
  // This allows different flows to use different models.
});
