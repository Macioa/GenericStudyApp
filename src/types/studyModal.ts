import { z } from 'zod';

// Zod schema for completed question validation
export const CompletedQuestionSchema = z.object({
  question: z.string(),
  score: z.number().min(0).max(1),
  feedback: z.string(),
});

// Zod schema for StudyModal state validation
export const StudyModalStateSchema = z.object({
  context: z.string(),
  remainingQuestions: z.array(z.string()),
  completedQuestions: z.array(CompletedQuestionSchema),
});

// Type inference from Zod schemas
export type CompletedQuestionType = z.infer<typeof CompletedQuestionSchema>;
export type StudyModalStateType = z.infer<typeof StudyModalStateSchema>;
