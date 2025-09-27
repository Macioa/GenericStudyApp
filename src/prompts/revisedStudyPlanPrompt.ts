// Prompt: "Create a revised study plan based on study results, focusing on areas that need improvement"

import { StudyModalStateSchema } from '../types';
import type { StudyModalStateType } from '../types';
import { AppStateSchema } from '../types';
import type { AppStateType } from '../types';
import { executeStructuredPrompt } from '../utils/langchain';
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
