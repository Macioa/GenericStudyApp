// Prompt: "Take a string input and return a structured app state with subject, original prompt, sub topics, context, and questions"

import { AppStateSchema } from '../types';
import type { AppStateType } from '../types';
import { executeStructuredPrompt, executeStructuredPromptStream, executeStructuredPromptsBatch } from '../utils/langchain';

const PROMPT_TEMPLATE = `
You are a helpful study assistant. Take the following input and create a structured study plan.

Input: {input}

{{DO NOT REWRITE, EMBELLISH OR EXAGERATE. JUST STRUCTURE THE INPUT AS BEST AS POSSIBLE.}}

{format_instructions}

Return a JSON object with the following structure:
- subject: GENERATE: A clear, concise summary topic of the input
- originalPrompt: The original input text
- subTopics: Subtopics listed in the input. Leave empty if no subtopics are listed in the input.
- context: Only include if explicitly stated in the input
- questions: GENERATE: One question per subtopic, with consideration from context. Leave empty if no subtopics are listed in the input.

Focus on creating a comprehensive and educational structure that will help someone learn effectively.
`;

export async function detailedPrompt(input: string): Promise<AppStateType> {
  return executeStructuredPrompt<AppStateType>(
    PROMPT_TEMPLATE,
    input,
    AppStateSchema
  );
}

/**
 * Create a detailed study plan with streaming support for real-time feedback
 */
export async function detailedPromptStream(
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
 * Create multiple detailed study plans in batch for improved performance
 */
export async function detailedPromptsBatch(inputs: string[]): Promise<AppStateType[]> {
  const prompts = inputs.map(input => ({
    template: PROMPT_TEMPLATE,
    input,
    schema: AppStateSchema
  }));

  return executeStructuredPromptsBatch<AppStateType>(prompts);
}
