import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'sk-I7liW57oWSJBRFaa1yLr0v9nYOh5PZJb9NAInR22LwbYhEon',
      baseURL: 'https://api.chatanywhere.tech',
    }),
  ],
});
