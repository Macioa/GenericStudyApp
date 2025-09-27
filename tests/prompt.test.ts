// Simple prompt test using the prompt tester
import { describe, it, expect } from 'vitest';

describe('Prompt Tests', () => {
  it('should be able to run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have environment variables available', () => {
    // Check if we can access environment variables for the preferred LLM
    const preferredLLM = import.meta.env.VITE_PREFERRED_LLM || 'openai';
    let hasApiKey = false;
    
    if (preferredLLM === 'perplexity') {
      hasApiKey = !!import.meta.env.VITE_PERPLEXITY_API_KEY;
    } else {
      hasApiKey = !!import.meta.env.VITE_OPENAI_API_KEY || !!import.meta.env.OPENAI_API_KEY;
    }
    
    expect(hasApiKey).toBe(true);
  });
});
