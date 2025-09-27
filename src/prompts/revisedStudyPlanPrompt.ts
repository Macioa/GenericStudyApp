// Prompt: "Create a revised study plan based on study results, focusing on areas that need improvement"

import { StudyModalStateSchema } from '../types';
import type { StudyModalStateType } from '../types';
import { AppStateSchema } from '../types';
import type { AppStateType } from '../types';
import { executeStructuredPrompt, executeStructuredPromptStream, executeStructuredPromptsBatch } from '../utils/langchain';
import { debugLog, debugError } from '../utils/logger';

const PROMPT_TEMPLATE = `
You are an intelligent study assistant. Analyze the study session results and create a revised study plan that focuses on areas where the student needs improvement.

Study Session Data:
{input}

{format_instructions}

Return a JSON object with the following structure:
- subject: The main subject/topic being studied
- originalPrompt: A summary of the study session context and focus areas
- subTopics: Focus areas identified from the study results that need more attention
- context: Study guidance based on performance patterns (e.g., "focus on conceptual understanding", "practice application problems", "review foundational concepts")
- questions: New targeted questions that address the identified weak areas

Guidelines for creating the revised plan:
1. Analyze completed question scores to identify weak areas (scores below 0.7)
2. Look for patterns in feedback to understand common mistakes or knowledge gaps
3. Create subtopics that directly address these improvement areas
4. Generate context that provides specific study direction based on performance
5. Design questions that progressively build understanding in weak areas
6. Balance between addressing weaknesses and maintaining overall subject coverage
7. Consider the original study context when creating the revision

Focus on creating a targeted learning plan that will help the student overcome their identified challenges and improve their understanding.
`;

export async function revisedStudyPlanPrompt(studyModalState: StudyModalStateType): Promise<AppStateType> {
  const validatedStudyModalState = StudyModalStateSchema.parse(studyModalState);
  
  try {
    debugLog('Creating revised study plan from study results:', validatedStudyModalState);

    // Prepare the input for the prompt
    const completedQuestionsText = validatedStudyModalState.completedQuestions
      .map(q => `Question: ${q.question}\nAnswer: ${q.answer}\nScore: ${q.score}\nFeedback: ${q.feedback}`)
      .join('\n\n');

    const revisedPlanInput = `Context: ${validatedStudyModalState.context}
Completed Questions:
${completedQuestionsText}

Remaining Questions:
${validatedStudyModalState.remainingQuestions.join('\n')}`;

    const revisedPlanResult = await executeStructuredPrompt<AppStateType>(
      PROMPT_TEMPLATE,
      revisedPlanInput,
      AppStateSchema
    );

    debugLog('Revised study plan created successfully:', revisedPlanResult);
    return revisedPlanResult;
  } catch (error) {
    debugError('Failed to create revised study plan:', error);
    throw error;
  }
}

/**
 * Create a revised study plan with streaming support for real-time feedback
 */
export async function revisedStudyPlanPromptStream(
  studyModalState: StudyModalStateType,
  onToken?: (token: string) => void
): Promise<AppStateType> {
  const validatedStudyModalState = StudyModalStateSchema.parse(studyModalState);
  
  try {
    debugLog('Creating revised study plan from study results with streaming:', validatedStudyModalState);

    // Prepare the input for the prompt
    const completedQuestionsText = validatedStudyModalState.completedQuestions
      .map(q => `Question: ${q.question}\nAnswer: ${q.answer}\nScore: ${q.score}\nFeedback: ${q.feedback}`)
      .join('\n\n');

    const revisedPlanInput = `Context: ${validatedStudyModalState.context}
Completed Questions:
${completedQuestionsText}

Remaining Questions:
${validatedStudyModalState.remainingQuestions.join('\n')}`;

    const revisedPlanResult = await executeStructuredPromptStream<AppStateType>(
      PROMPT_TEMPLATE,
      revisedPlanInput,
      AppStateSchema,
      "gpt-4o-mini",
      0.7,
      onToken
    );

    debugLog('Revised study plan with streaming created successfully:', revisedPlanResult);
    return revisedPlanResult;
  } catch (error) {
    debugError('Failed to create revised study plan with streaming:', error);
    throw error;
  }
}

/**
 * Create multiple revised study plans in batch for improved performance
 */
export async function revisedStudyPlanPromptsBatch(
  studyModalStates: StudyModalStateType[]
): Promise<AppStateType[]> {
  try {
    debugLog('Creating batch revised study plans:', { count: studyModalStates.length });

    const prompts = studyModalStates.map(studyModalState => {
      const validatedStudyModalState = StudyModalStateSchema.parse(studyModalState);
      
      // Prepare the input for the prompt
      const completedQuestionsText = validatedStudyModalState.completedQuestions
        .map(q => `Question: ${q.question}\nAnswer: ${q.answer}\nScore: ${q.score}\nFeedback: ${q.feedback}`)
        .join('\n\n');

      const revisedPlanInput = `Context: ${validatedStudyModalState.context}
Completed Questions:
${completedQuestionsText}

Remaining Questions:
${validatedStudyModalState.remainingQuestions.join('\n')}`;

      return {
        template: PROMPT_TEMPLATE,
        input: revisedPlanInput,
        schema: AppStateSchema
      };
    });

    const revisedPlanResults = await executeStructuredPromptsBatch<AppStateType>(prompts);

    debugLog('Batch revised study plans created successfully:', { resultCount: revisedPlanResults.length });
    return revisedPlanResults;
  } catch (error) {
    debugError('Failed to create batch revised study plans:', error);
    throw error;
  }
}
