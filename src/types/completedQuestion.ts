import { z } from 'zod';

// Zod schema for completed question validation
export const CompletedQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
  score: z.number().min(0).max(1),
  feedback: z.string(),
});

// Type inference from Zod schema
export type CompletedQuestionType = z.infer<typeof CompletedQuestionSchema>;
