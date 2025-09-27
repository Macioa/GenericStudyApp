// Test file that uses the prompt tester functionality
import { describe, it, expect } from 'vitest';
import { genericPrompt, detailedPrompt, gradeSubmission } from '../src/prompts';
import { debugLog } from '../src/utils/logger';

describe('Prompt Tester Integration Tests', () => {
  it('should generate a generic prompt successfully', async () => {
    const testInput = "JavaScript basics: variables and functions";
    
    try {
      const result = await genericPrompt(testInput);
      
      debugLog('Generic prompt result:', result);
      
      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.originalPrompt).toBe(testInput);
      expect(result.subTopics).toBeInstanceOf(Array);
      expect(result.questions).toBeInstanceOf(Array);
      expect(result.context).toBeInstanceOf(Array);
      
      // Verify the structure
      expect(result.subTopics.length).toBeGreaterThan(0);
      expect(result.questions.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('Generic prompt test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for API calls

  it('should generate a detailed prompt successfully', async () => {
    const testInput = "React hooks: useState and useEffect";
    
    try {
      const result = await detailedPrompt(testInput);
      
      debugLog('Detailed prompt result:', result);
      
      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.originalPrompt).toBe(testInput);
      expect(result.subTopics).toBeInstanceOf(Array);
      expect(result.questions).toBeInstanceOf(Array);
      expect(result.context).toBeInstanceOf(Array);
      
    } catch (error) {
      console.error('Detailed prompt test failed:', error);
      throw error;
    }
  }, 30000);

  it('should grade a submission successfully', async () => {
    const testSubmission = {
      context: ["JavaScript basics", "Programming fundamentals"],
      question: "What is a variable in JavaScript?",
      answer: "A variable is a container that stores data values."
    };
    
    try {
      const result = await gradeSubmission(testSubmission);
      
      debugLog('Grading result:', result);
      
      expect(result).toBeDefined();
      expect(result.question).toBe(testSubmission.question);
      expect(result.answer).toBe(testSubmission.answer);
      expect(result.score).toBeDefined();
      expect(result.feedback).toBeDefined();
      
      // Verify score is within valid range
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      
      // Verify feedback is a non-empty string
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('Grading test failed:', error);
      throw error;
    }
  }, 30000);

  it('should handle multiple prompt types in sequence', async () => {
    // Test that we can run multiple prompt types without cache conflicts
    const testInput = "Python programming: loops and conditionals";
    
    try {
      // Run generic prompt
      const genericResult = await genericPrompt(testInput);
      
      // Run detailed prompt
      const detailedResult = await detailedPrompt(testInput);
      
      // Run grading
      const gradingResult = await gradeSubmission({
        context: genericResult.context,
        question: genericResult.questions[0] || "What is Python?",
        answer: "Python is a programming language."
      });
      
      debugLog('Multi-prompt test results:', {
        generic: genericResult,
        detailed: detailedResult,
        grading: gradingResult
      });
      
      // All should succeed
      expect(genericResult).toBeDefined();
      expect(detailedResult).toBeDefined();
      expect(gradingResult).toBeDefined();
      
    } catch (error) {
      console.error('Multi-prompt test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout for multiple API calls
});
