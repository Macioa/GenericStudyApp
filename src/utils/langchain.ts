import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

/**
 * Generic function to execute a LangChain prompt with structured output
 * @param promptTemplate The prompt template to use
 * @param input The input string to process
 * @param schema The Zod schema for structured output parsing
 * @param modelName The model name to use (defaults to gpt-4o-mini)
 * @param temperature The temperature setting (defaults to 0.7)
 * @returns Parsed structured output
 */
export async function executeStructuredPrompt<T>(
  promptTemplate: string,
  input: string,
  schema: any,
  modelName: string = "gpt-4o-mini",
  temperature: number = 0.7
): Promise<T> {
  try {
    debugLog('Starting structured prompt execution', { input, modelName, temperature });
    
    // Debug environment variables
    debugLog('Environment variables debug', {
      'import.meta.env': import.meta.env,
      'VITE_OPENAI_API_KEY': import.meta.env.VITE_OPENAI_API_KEY,
      'OPENAI_API_KEY': import.meta.env.OPENAI_API_KEY,
      'MODE': import.meta.env.MODE,
      'DEV': import.meta.env.DEV,
      'PROD': import.meta.env.PROD
    });
    
    const parser = StructuredOutputParser.fromZodSchema(schema);
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || 
                   import.meta.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    }

    const model = await initChatModel(modelName, {
      modelProvider: "openai",
      apiKey: apiKey,
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
