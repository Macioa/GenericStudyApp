// Prompt: "Grade a student's answer and provide feedback with a score"

import { z } from 'zod';
import { SubmissionInputSchema, CompletedQuestionSchema } from '../types';
import { executeStructuredPrompt } from '../utils/langchain';
import { debugLog, debugError } from '../utils/logger';

const PROMPT_TEMPLATE = `
You are a helpful study assistant. Grade the student's answer and provide feedback.

{input}

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

  try {
    const gradingResult = await executeStructuredPrompt<z.infer<typeof GradingResultSchema>>(
      PROMPT_TEMPLATE,
      gradingInput,
      GradingResultSchema
    );

    debugLog('Raw grading result:', gradingResult);

    // Validate that we have the required fields
    if (gradingResult.score === undefined || gradingResult.feedback === undefined) {
      debugError('Grading result missing required fields:', gradingResult);
      throw new Error('Invalid grading result: missing score or feedback');
    }

    const result = {
      question: validatedSubmission.question,
      answer: validatedSubmission.answer,
      score: gradingResult.score,
      feedback: gradingResult.feedback
    };

    return CompletedQuestionSchema.parse(result);
  } catch (error) {
    debugError('Grading failed, using fallback:', error);
    
    // Fallback result when grading fails
    const fallbackResult = {
      question: validatedSubmission.question,
      answer: validatedSubmission.answer,
      score: 0.5, // Default middle score
      feedback: 'Unable to grade answer automatically. Please review your response.'
    };

    return CompletedQuestionSchema.parse(fallbackResult);
  }
}
