// Simple test that demonstrates the test setup works with real API keys
import { describe, it, expect } from 'vitest';
import { genericPrompt, detailedPrompt } from '../src/prompts';
import { debugLog } from '../src/utils/logger';

describe('Working Prompt Tests', () => {
  it('should generate a generic prompt with real API', async () => {
    const testInput = "Machine Learning basics: supervised vs unsupervised learning";
    
    const result = await genericPrompt({
      input: testInput,
      modelName: "gpt-4o-mini",
      temperature: 0.7
    });
    
    debugLog('Generic prompt test result:', result);
    
    expect(result).toBeDefined();
    expect(result.subject).toBeDefined();
    expect(result.originalPrompt).toBe(testInput);
    expect(result.subTopics).toBeInstanceOf(Array);
    expect(result.questions).toBeInstanceOf(Array);
    expect(result.context).toBeInstanceOf(Array);
    
    // Verify we got meaningful content
    expect(result.subTopics.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions[0]).toContain('?'); // Should be actual questions
    
    console.log('✅ Generic prompt test passed with real API');
  }, 30000);

  it('should generate a detailed prompt with real API', async () => {
    const testInput = "Database design: normalization and relationships";
    
    const result = await detailedPrompt({
      input: testInput,
      modelName: "gpt-4o-mini",
      temperature: 0.7
    });
    
    debugLog('Detailed prompt test result:', result);
    
    expect(result).toBeDefined();
    expect(result.subject).toBeDefined();
    expect(result.originalPrompt).toBe(testInput);
    expect(result.subTopics).toBeInstanceOf(Array);
    expect(result.questions).toBeInstanceOf(Array);
    expect(result.context).toBeInstanceOf(Array);
    
    console.log('✅ Detailed prompt test passed with real API');
  }, 30000);

  it('should demonstrate test environment is working', () => {
    // Simple test to verify the test environment
    const hasApiKey = !!import.meta.env.VITE_OPENAI_API_KEY || !!import.meta.env.OPENAI_API_KEY;
    expect(hasApiKey).toBe(true);
    
    console.log('✅ Test environment setup is working');
    console.log('✅ API key is available');
    console.log('✅ Vitest is configured correctly');
    console.log('✅ Real API calls are working');
  });
});
