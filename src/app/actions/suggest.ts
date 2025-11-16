'use server';

import { suggestRelevantDependencies } from '@/ai/flows/suggest-relevant-dependencies';

export async function getSuggestions(code: string): Promise<string[]> {
  try {
    if (!code.trim()) {
        return [];
    }
    const result = await suggestRelevantDependencies({ code });
    return result.dependencies;
  } catch (error) {
    console.error("AI suggestion failed:", error);
    return ["Error fetching suggestions."];
  }
}
