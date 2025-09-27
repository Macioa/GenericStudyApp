// Prompt: "Grade a student's answer and provide feedback with a score"

import { z } from 'zod';
import { SubmissionInputSchema, CompletedQuestionSchema } from '../types';
import { executeStructuredPrompt, executeStructuredPromptStream, executeStructuredPromptsBatch } from '../utils/langchain';
import { debugLog, debugError } from '../utils/logger';

const PROMPT_TEMPLATE = `
You are a helpful study assistant. Grade the student's answer and provide feedback.

{input}

{format_instructions}

IMPORTANT: You must return ONLY a valid JSON object with exactly these two fields:
- "score": a number from 0.0 to 1.0 (0.0 = incorrect, 1.0 = perfect)
- "feedback": a string with constructive feedback to help the student learn

Do not include any other fields or text outside the JSON object.
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
    debugLog('Grading result type:', typeof gradingResult);
    debugLog('Grading result keys:', Object.keys(gradingResult || {}));

    // Validate that we have the required fields
    if (!gradingResult || typeof gradingResult !== 'object' || 
        gradingResult.score === undefined || gradingResult.feedback === undefined) {
      debugError('Grading result missing required fields:', gradingResult);
      debugError('Grading result structure:', {
        hasScore: 'score' in (gradingResult || {}),
        hasFeedback: 'feedback' in (gradingResult || {}),
        scoreValue: gradingResult?.score,
        feedbackValue: gradingResult?.feedback
      });
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
    debugError('Grading failed:', error);
    throw error;
  }
}

/**
 * Grade a submission with streaming support for real-time feedback
 */
export async function gradeSubmissionStream(
  submission: z.infer<typeof SubmissionInputSchema>,
  onToken?: (token: string) => void
): Promise<z.infer<typeof CompletedQuestionSchema>> {
  const validatedSubmission = SubmissionInputSchema.parse(submission);
  
  const gradingInput = `Context: ${validatedSubmission.context.join('\n')}
Question: ${validatedSubmission.question}
Student's Answer: ${validatedSubmission.answer}`;

  try {
    debugLog('Starting streaming grade submission');
    
    const gradingResult = await executeStructuredPromptStream<z.infer<typeof GradingResultSchema>>(
      PROMPT_TEMPLATE,
      gradingInput,
      GradingResultSchema,
      "gpt-4o-mini",
      0.7,
      onToken
    );

    debugLog('Raw streaming grading result:', gradingResult);

    // Validate that we have the required fields
    if (!gradingResult || typeof gradingResult !== 'object' || 
        gradingResult.score === undefined || gradingResult.feedback === undefined) {
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
    debugError('Streaming grading failed:', error);
    throw error;
  }
}

/**
 * Grade multiple submissions in batch for improved performance
 */
export async function gradeSubmissionsBatch(
  submissions: z.infer<typeof SubmissionInputSchema>[]
): Promise<z.infer<typeof CompletedQuestionSchema>[]> {
  try {
    debugLog('Starting batch grading', { count: submissions.length });
    
    // Prepare prompts for batch processing
    const prompts = submissions.map(submission => {
      const validatedSubmission = SubmissionInputSchema.parse(submission);
      const gradingInput = `Context: ${validatedSubmission.context.join('\n')}
Question: ${validatedSubmission.question}
Student's Answer: ${validatedSubmission.answer}`;

      return {
        template: PROMPT_TEMPLATE,
        input: gradingInput,
        schema: GradingResultSchema,
        originalSubmission: validatedSubmission
      };
    });

    // Execute batch grading
    const gradingResults = await executeStructuredPromptsBatch<z.infer<typeof GradingResultSchema>>(
      prompts.map(({ template, input, schema }) => ({ template, input, schema }))
    );

    // Process results and combine with original submissions
    const completedQuestions = gradingResults.map((gradingResult, index) => {
      const originalSubmission = prompts[index].originalSubmission;
      
      // Validate that we have the required fields
      if (!gradingResult || typeof gradingResult !== 'object' || 
          gradingResult.score === undefined || gradingResult.feedback === undefined) {
        debugError('Batch grading result missing required fields:', gradingResult);
        throw new Error(`Invalid grading result for submission ${index}: missing score or feedback`);
      }

      const result = {
        question: originalSubmission.question,
        answer: originalSubmission.answer,
        score: gradingResult.score,
        feedback: gradingResult.feedback
      };

      return CompletedQuestionSchema.parse(result);
    });

    debugLog('Batch grading completed successfully', { resultCount: completedQuestions.length });
    return completedQuestions;
  } catch (error) {
    debugError('Batch grading failed:', error);
    throw error;
  }
}
