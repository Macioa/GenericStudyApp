import { z } from 'zod';
import { CompletedQuestionSchema } from './completedQuestion';

// Zod schema for StudyModal state validation
export const StudyModalStateSchema = z.object({
  context: z.string(),
  remainingQuestions: z.array(z.string()),
  completedQuestions: z.array(CompletedQuestionSchema),
});

// Type inference from Zod schemas
export type StudyModalStateType = z.infer<typeof StudyModalStateSchema>;
