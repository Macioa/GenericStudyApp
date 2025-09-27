import { z } from 'zod';

// Zod schema for submission input validation
export const SubmissionInputSchema = z.object({
  context: z.array(z.string()),
  question: z.string(),
  answer: z.string(),
});

// Type inference from Zod schema
export type SubmissionInputType = z.infer<typeof SubmissionInputSchema>;
