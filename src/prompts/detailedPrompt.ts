// Prompt: "Take a string input and return a structured app state with subject, original prompt, sub topics, context, and questions"

import { AppStateSchema } from '../types';
import type { AppStateType } from '../types';
import { executeStructuredPrompt } from '../utils/langchain';

const PROMPT_TEMPLATE = `
You are a helpful study assistant. Take the following input and create a structured study plan.

Input: {input}

{format_instructions}

Return a JSON object with the following structure:
- subject: A clear, concise subject/topic for the study session
- originalPrompt: The original input text
- subTopics: An array of 3-5 relevant subtopics to explore
- context: An array of 3-5 important context points or background information
- questions: An array of 3-5 thoughtful questions to guide learning

Focus on creating a comprehensive and educational structure that will help someone learn effectively.
`;

export async function detailedPrompt(input: string): Promise<AppStateType> {
  return executeStructuredPrompt<AppStateType>(
    PROMPT_TEMPLATE,
    input,
    AppStateSchema
  );
}
