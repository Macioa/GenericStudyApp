import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;

/**
 * Generic function to execute a LangChain prompt with structured output
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
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    }

    const parser = StructuredOutputParser.fromZodSchema(schema);
    const model = await initChatModel(modelName, {
      modelProvider: "openai",
      apiKey: apiKey,
      temperature,
    });

    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    const formattedPrompt = await prompt.format({
      input,
      format_instructions: parser.getFormatInstructions(),
    });

    const response = await model.invoke(formattedPrompt);
    
    debugLog('Raw model response:', { content: response.content });
    const parsedResult = await parser.parse(response.content as string);
    
    debugLog('Structured prompt completed successfully', { result: parsedResult });
    return parsedResult as T;
  } catch (error) {
    debugError('Structured prompt execution failed', error);
    throw error;
  }
}

