// Prompt: "Grade a student's answer and provide feedback with a score"

import { z } from 'zod';
import { SubmissionInputSchema, CompletedQuestionSchema } from '../types';
import { executeStructuredPrompt } from '../utils/langchain';

const PROMPT_TEMPLATE = `
You are a helpful study assistant. Grade the student's answer and provide feedback.

Context: {context}
Question: {question}
Student's Answer: {answer}

{format_instructions}

Return a JSON object with:
- score: number from 0.0 to 1.0 (0.0 = incorrect, 1.0 = perfect)
- feedback: constructive feedback to help the student learn
`;

const GradingResultSchema = z.object({
  score: z.number().min(0).max(1).describe('Score from 0.0 to 1.0'),
  feedback: z.string().describe('Constructive feedback for the student')
});

export async function gradeSubmission(submission: z.infer<typeof SubmissionInputSchema>): Promise<z.infer<typeof CompletedQuestionSchema>> {
  const validatedSubmission = SubmissionInputSchema.parse(submission);
  
  const gradingInput = `Context: ${validatedSubmission.context.join('\n')}
Question: ${validatedSubmission.question}
Student's Answer: ${validatedSubmission.answer}`;

  const gradingResult = await executeStructuredPrompt<z.infer<typeof GradingResultSchema>>(
    PROMPT_TEMPLATE,
    gradingInput,
    GradingResultSchema
  );

  const result = {
    question: validatedSubmission.question,
    answer: validatedSubmission.answer,
    score: gradingResult.score,
    feedback: gradingResult.feedback
  };

  return CompletedQuestionSchema.parse(result);
}
