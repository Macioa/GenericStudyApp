// Prompt: "Take a string input and dynamically generate a structured study plan based on the content"

import { AppStateSchema } from '../types';
import type { AppStateType } from '../types';
import { executeStructuredPrompt, executeStructuredPromptStream, executeStructuredPromptsBatch } from '../utils/langchain';

const PROMPT_TEMPLATE = `
You are an intelligent study assistant. Analyze the following input and dynamically create a comprehensive study plan that adapts to the content type and complexity.

Input: {input}

{{ANALYZE THE INPUT AND ADAPT YOUR RESPONSE ACCORDINGLY. DO NOT REWRITE OR EMBELLISH THE ORIGINAL CONTENT.}}

{format_instructions}

Return a JSON object with the following structure:
- subject: DYNAMICALLY GENERATE: A clear, concise topic that best represents the input content
- originalPrompt: The original input text (unchanged)
- subTopics: DYNAMICALLY GENERATE: Extract or create relevant subtopics based on the input content
- context: DYNAMICALLY GENERATE: This contexts should describe the questions that will be asked, like "beginner questions only" or "deep dive"
- questions: DYNAMICALLY GENERATE: Create thoughtful questions that promote learning and understanding of the subject matter

Guidelines for dynamic generation:
1. For simple topics: Create 2-3 focused subtopics with corresponding questions
2. For complex subjects: Break down into 4-6 logical subtopics with comprehensive questions
3. For lists or outlines: Use the existing structure as subtopics and generate questions for each
4. For questions or problems: Treat each as a subtopic and generate follow-up questions
5. For concepts or theories: Create subtopics that cover key aspects, applications, and implications
6. Always consider the learning level and adjust complexity accordingly

Focus on creating an educational structure that maximizes learning effectiveness and comprehension.
`;

export async function genericPrompt(input: string): Promise<AppStateType> {
  return executeStructuredPrompt<AppStateType>(
    PROMPT_TEMPLATE,
    input,
    AppStateSchema
  );
}

/**
 * Generate a study plan with streaming support for real-time feedback
 */
export async function genericPromptStream(
  input: string,
  onToken?: (token: string) => void
): Promise<AppStateType> {
  return executeStructuredPromptStream<AppStateType>(
    PROMPT_TEMPLATE,
    input,
    AppStateSchema,
    "gpt-4o-mini",
    0.7,
    onToken
  );
}

/**
 * Generate multiple study plans in batch for improved performance
 */
export async function genericPromptsBatch(inputs: string[]): Promise<AppStateType[]> {
  const prompts = inputs.map(input => ({
    template: PROMPT_TEMPLATE,
    input,
    schema: AppStateSchema
  }));

  return executeStructuredPromptsBatch<AppStateType>(prompts);
}
