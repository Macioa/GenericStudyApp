import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;

// Connection pool to reuse model instances
interface ModelPoolEntry {
  model: any;
  lastUsed: number;
  usageCount: number;
}

const modelPool = new Map<string, ModelPoolEntry>();
const PROMPT_TEMPLATE_CACHE = new Map<string, PromptTemplate>();
const PARSER_CACHE = new Map<any, StructuredOutputParser<any>>();

// Configuration for connection pooling
const POOL_CONFIG = {
  MAX_IDLE_TIME: 5 * 60 * 1000, // 5 minutes
  MAX_USAGE_COUNT: 100, // Recreate after 100 uses
  CLEANUP_INTERVAL: 2 * 60 * 1000, // 2 minutes
};

// Cleanup function to remove stale connections
function cleanupModelPool() {
  const now = Date.now();
  for (const [key, entry] of modelPool.entries()) {
    if (now - entry.lastUsed > POOL_CONFIG.MAX_IDLE_TIME || 
        entry.usageCount > POOL_CONFIG.MAX_USAGE_COUNT) {
      debugLog('Removing stale model from pool', { key, lastUsed: entry.lastUsed, usageCount: entry.usageCount });
      modelPool.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupModelPool, POOL_CONFIG.CLEANUP_INTERVAL);

/**
 * Get or create a cached model instance
 */
async function getCachedModel(modelName: string, temperature: number) {
  const cacheKey = `${modelName}-${temperature}`;
  const now = Date.now();
  
  // Check if we have a cached model
  const cached = modelPool.get(cacheKey);
  if (cached && 
      now - cached.lastUsed < POOL_CONFIG.MAX_IDLE_TIME && 
      cached.usageCount < POOL_CONFIG.MAX_USAGE_COUNT) {
    cached.lastUsed = now;
    cached.usageCount++;
    debugLog('Reusing cached model', { cacheKey, usageCount: cached.usageCount });
    return cached.model;
  }

  // Create new model
  debugLog('Creating new model instance', { modelName, temperature });
  const model = await initChatModel(modelName, {
    modelProvider: "openai",
    apiKey: apiKey,
    temperature,
  });

  // Cache the model
  modelPool.set(cacheKey, {
    model,
    lastUsed: now,
    usageCount: 1,
  });

  return model;
}

/**
 * Get or create a cached prompt template
 */
function getCachedPromptTemplate(template: string): PromptTemplate {
  if (PROMPT_TEMPLATE_CACHE.has(template)) {
    debugLog('Reusing cached prompt template');
    return PROMPT_TEMPLATE_CACHE.get(template)!;
  }

  debugLog('Creating new prompt template');
  const prompt = PromptTemplate.fromTemplate(template);
  PROMPT_TEMPLATE_CACHE.set(template, prompt);
  return prompt;
}

/**
 * Get or create a cached parser
 */
function getCachedParser(schema: any): StructuredOutputParser<any> {
  // Create a more specific cache key based on schema properties
  // This prevents different schemas from colliding in cache
  let schemaKey: string;
  
  try {
    // Create a more detailed cache key that includes field names, types, and constraints
    const schemaInfo = {
      typeName: schema._def?.typeName || 'unknown',
      shapeKeys: schema.shape ? Object.keys(schema.shape).sort() : [],
      // Include field types and constraints for better uniqueness
      fieldDetails: schema.shape ? Object.entries(schema.shape).map(([key, field]: [string, any]) => ({
        name: key,
        type: field._def?.typeName || 'unknown',
        checks: field._def?.checks?.map((check: any) => ({
          kind: check.kind,
          value: check.value
        })) || [],
        description: field._def?.description || ''
      })) : [],
      description: schema.description || '',
      checks: schema._def?.checks?.length || 0
    };
    
    schemaKey = JSON.stringify(schemaInfo);
  } catch (error) {
    // Fallback: use a simple hash of the schema object with timestamp for uniqueness
    schemaKey = `schema_${schema.toString().slice(0, 50)}_${Date.now()}_${Math.random()}`;
  }
  
  if (PARSER_CACHE.has(schemaKey)) {
    debugLog('Reusing cached parser', { schemaKey });
    return PARSER_CACHE.get(schemaKey)!;
  }

  debugLog('Creating new parser', { schemaKey });
  const parser = StructuredOutputParser.fromZodSchema(schema);
  PARSER_CACHE.set(schemaKey, parser);
  return parser;
}

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

    // Use cached instances
    const parser = getCachedParser(schema);
    const model = await getCachedModel(modelName, temperature);
    const prompt = getCachedPromptTemplate(promptTemplate);

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

/**
 * Execute a structured prompt with streaming support
 */
export async function executeStructuredPromptStream<T>(
  promptTemplate: string,
  input: string,
  schema: any,
  modelName: string = "gpt-4o-mini",
  temperature: number = 0.7,
  onToken?: (token: string) => void
): Promise<T> {
  try {
    debugLog('Starting structured prompt execution with streaming', { input, modelName, temperature });
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    }

    // Use cached instances
    const parser = getCachedParser(schema);
    const model = await getCachedModel(modelName, temperature);
    const prompt = getCachedPromptTemplate(promptTemplate);

    const formattedPrompt = await prompt.format({
      input,
      format_instructions: parser.getFormatInstructions(),
    });

    let fullResponse = '';
    
    // Stream the response
    const stream = await model.stream(formattedPrompt);
    
    for await (const chunk of stream) {
      const token = chunk.content as string;
      fullResponse += token;
      
      if (onToken) {
        onToken(token);
      }
    }
    
    debugLog('Raw model response:', { content: fullResponse });
    const parsedResult = await parser.parse(fullResponse);
    
    debugLog('Structured prompt with streaming completed successfully', { result: parsedResult });
    return parsedResult as T;
  } catch (error) {
    debugError('Structured prompt execution with streaming failed', error);
    throw error;
  }
}

/**
 * Execute multiple prompts in batch for better performance
 */
export async function executeStructuredPromptsBatch<T>(
  prompts: Array<{
    template: string;
    input: string;
    schema: any;
    modelName?: string;
    temperature?: number;
  }>,
  modelName: string = "gpt-4o-mini",
  temperature: number = 0.7
): Promise<T[]> {
  try {
    debugLog('Starting batch prompt execution', { count: prompts.length, modelName, temperature });
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    }

    // Use cached model for all prompts
    const model = await getCachedModel(modelName, temperature);

    // Prepare all prompts
    const preparedPrompts = await Promise.all(
      prompts.map(async (promptData) => {
        const parser = getCachedParser(promptData.schema);
        const prompt = getCachedPromptTemplate(promptData.template);
        
        const formattedPrompt = await prompt.format({
          input: promptData.input,
          format_instructions: parser.getFormatInstructions(),
        });

        return {
          formattedPrompt,
          parser,
          schema: promptData.schema
        };
      })
    );

    // Execute all prompts in parallel
    const responses = await Promise.all(
      preparedPrompts.map(async ({ formattedPrompt }) => {
        return await model.invoke(formattedPrompt);
      })
    );

    // Parse all results
    const parsedResults = await Promise.all(
      responses.map(async (response, index) => {
        const { parser } = preparedPrompts[index];
        return await parser.parse(response.content as string);
      })
    );
    
    debugLog('Batch prompt execution completed successfully', { resultCount: parsedResults.length });
    return parsedResults as T[];
  } catch (error) {
    debugError('Batch prompt execution failed', error);
    throw error;
  }
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearCaches() {
  modelPool.clear();
  PROMPT_TEMPLATE_CACHE.clear();
  PARSER_CACHE.clear();
  debugLog('All caches cleared');
}

/**
 * Clear only the parser cache (useful for schema changes)
 */
export function clearParserCache() {
  PARSER_CACHE.clear();
  debugLog('Parser cache cleared');
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    modelPoolSize: modelPool.size,
    promptTemplateCacheSize: PROMPT_TEMPLATE_CACHE.size,
    parserCacheSize: PARSER_CACHE.size,
    modelPoolEntries: Array.from(modelPool.entries()).map(([key, entry]) => ({
      key,
      lastUsed: entry.lastUsed,
      usageCount: entry.usageCount
    }))
  };
}

