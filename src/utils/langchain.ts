import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

// Performance optimization: Cache model instances and parsers
const modelCache = new Map<string, any>();
const parserCache = new Map<string, StructuredOutputParser<any>>();
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;

// Performance optimization: Connection pooling configuration
const MAX_CONCURRENT_REQUESTS = 5;
const activeRequests = new Set<Promise<any>>();

// Performance optimization: Request timeout and retry configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Execute a function with timeout and retry logic
 */
async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeout: number = REQUEST_TIMEOUT,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });
      
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        debugLog(`Attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY}ms`, { error: lastError.message });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Execute a function with connection pooling to limit concurrent requests
 */
async function withConnectionPooling<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for available slot if at capacity
  while (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    await Promise.race(activeRequests);
  }
  
  const requestPromise = fn().finally(() => {
    activeRequests.delete(requestPromise);
  });
  
  activeRequests.add(requestPromise);
  return requestPromise;
}

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
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    }

    // Performance optimization: Cache parser instances
    // Create a unique cache key based on schema structure and name
    const schemaName = schema._def?.typeName || 'Unknown';
    const schemaShape = schema._def?.shape || {};
    const schemaKey = `${schemaName}-${JSON.stringify(schemaShape)}`;
    debugLog('Schema cache key:', schemaKey);
    debugLog('Schema shape:', schemaShape);
    let parser = parserCache.get(schemaKey);
    if (!parser) {
      debugLog('Creating new parser for schema key:', schemaKey);
      parser = StructuredOutputParser.fromZodSchema(schema);
      parserCache.set(schemaKey, parser);
    } else {
      debugLog('Using cached parser for schema key:', schemaKey);
    }

    // Performance optimization: Cache model instances
    const modelKey = `${modelName}-${temperature}`;
    let model = modelCache.get(modelKey);
    if (!model) {
      model = await initChatModel(modelName, {
        modelProvider: "openai",
        apiKey: apiKey,
        temperature,
      });
      modelCache.set(modelKey, model);
    }

    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    const formattedPrompt = await prompt.format({
      input,
      format_instructions: parser.getFormatInstructions(),
    });

    const response = await withConnectionPooling(async () => {
      return await withTimeoutAndRetry(async () => {
        return await model.invoke(formattedPrompt);
      });
    });
    
    debugLog('Raw model response:', { content: response.content });
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
  // Performance optimization: Use cached parser
  const schemaName = schema._def?.typeName || 'Unknown';
  const schemaShape = schema._def?.shape || {};
  const schemaKey = `${schemaName}-${JSON.stringify(schemaShape)}`;
  let parser = parserCache.get(schemaKey);
  if (!parser) {
    parser = StructuredOutputParser.fromZodSchema(schema);
    parserCache.set(schemaKey, parser);
  }
  return template.replace('{format_instructions}', parser.getFormatInstructions());
}
