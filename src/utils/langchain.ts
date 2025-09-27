import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

/**
 * Generic function to execute a LangChain prompt with structured output
 * @param promptTemplate The prompt template to use
 * @param input The input string to process
 * @param schema The Zod schema for structured output parsing
 * @param modelName The model name to use (defaults to gpt-3.5-turbo)
 * @param temperature The temperature setting (defaults to 0.7)
 * @returns Parsed structured output
 */
export async function executeStructuredPrompt<T>(
  promptTemplate: string,
  input: string,
  schema: any,
  modelName: string = "gpt-3.5-turbo",
  temperature: number = 0.7
): Promise<T> {
  try {
    debugLog('Starting structured prompt execution', { input, modelName, temperature });
    
    const parser = StructuredOutputParser.fromZodSchema(schema);
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    const model = await initChatModel(modelName, {
      openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      temperature,
    });

    const formattedPrompt = await prompt.format({
      input,
      format_instructions: parser.getFormatInstructions(),
    });

    const response = await model.invoke(formattedPrompt);
    const parsedResult = await parser.parse(response.content as string);
    
    debugLog('Structured prompt completed successfully', { result: parsedResult });
    return parsedResult as T;
  } catch (error) {
    debugError('Structured prompt execution failed', error);
    throw error;
  }
}

/**
 * Create a prompt template with format instructions
 * @param template The prompt template string
 * @param schema The Zod schema for format instructions
 * @returns A formatted prompt template
 */
export function createPromptWithFormatInstructions(template: string, schema: any): string {
  const parser = StructuredOutputParser.fromZodSchema(schema);
  return template.replace('{format_instructions}', parser.getFormatInstructions());
}
