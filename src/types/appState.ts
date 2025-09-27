import { z } from 'zod';

// Zod schema for AppState validation
export const AppStateSchema = z.object({
  subject: z.string(),
  originalPrompt: z.string(),
  subTopics: z.array(z.string()),
  context: z.array(z.string()),
  questions: z.array(z.string()),
});

// Type inference from Zod schema
export type AppStateType = z.infer<typeof AppStateSchema>;
