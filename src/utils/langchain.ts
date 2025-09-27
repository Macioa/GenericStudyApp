import { initChatModel } from "langchain/chat_models/universal";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { debugLog, debugError } from './logger';

// Environment variables for model configuration
const PREFERRED_LLM = import.meta.env.VITE_PREFERRED_LLM || 'openai';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const OPENAI_PREFERRED_MODEL = import.meta.env.VITE_OPENAI_PREFERRED_MODEL || 'gpt-4o-mini';
const PERPLEXITY_PREFERRED_MODEL = import.meta.env.VITE_PERPLEXITY_PREFERRED_MODEL || 'sonar';

// Get the appropriate API key based on preferred LLM
function getApiKey(): string {
  switch (PREFERRED_LLM) {
    case 'perplexity':
      if (!PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY environment variable is missing. Please set VITE_PERPLEXITY_API_KEY in your .env file.');
      }
      return PERPLEXITY_API_KEY;
    case 'openai':
    default:
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
      }
      return OPENAI_API_KEY;
  }
}

// Get the appropriate model name based on preferred LLM
function getPreferredModel(): string {
  switch (PREFERRED_LLM) {
    case 'perplexity':
      return PERPLEXITY_PREFERRED_MODEL;
    case 'openai':
    default:
      return OPENAI_PREFERRED_MODEL;
  }
}

// Get the appropriate model provider based on preferred LLM
function getModelProvider(): string {
  switch (PREFERRED_LLM) {
    case 'perplexity':
      return 'perplexity';
    case 'openai':
    default:
      return 'openai';
  }
}

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
async function getCachedModel(modelName?: string, temperature: number = 0.7) {
  // Use preferred model if no specific model is provided
  const finalModelName = modelName || getPreferredModel();
  const cacheKey = `${PREFERRED_LLM}-${finalModelName}-${temperature}`;
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
  debugLog('Creating new model instance', { 
    preferredLLM: PREFERRED_LLM, 
    modelName: finalModelName, 
    temperature 
  });
  
  const apiKey = getApiKey();
  let model;
  
  if (PREFERRED_LLM === 'perplexity') {
    // Use universal chat model with custom Perplexity configuration
    model = await initChatModel(finalModelName, {
      modelProvider: "openai",
      apiKey,
      temperature,
      baseURL: "https://api.perplexity.ai",
      dangerouslyAllowBrowser: true,
      // Override the client configuration to use Perplexity endpoint
      configuration: {
        baseURL: "https://api.perplexity.ai",
        dangerouslyAllowBrowser: true,
      },
    });
  } else {
    // Use universal chat model for other providers
    const modelProvider = getModelProvider();
    model = await initChatModel(finalModelName, {
      modelProvider,
      apiKey,
      temperature,
    });
  }

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
  modelName?: string,
  temperature: number = 0.7
): Promise<T> {
  try {
    const finalModelName = modelName || getPreferredModel();
    debugLog('Starting structured prompt execution', { 
      input, 
      preferredLLM: PREFERRED_LLM,
      modelName: finalModelName, 
      temperature 
    });
    
    // Validate API key
    getApiKey(); // This will throw if missing

    // Use cached instances
    const parser = getCachedParser(schema);
    const model = await getCachedModel(finalModelName, temperature);
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
  modelName?: string,
  temperature: number = 0.7,
  onToken?: (token: string) => void
): Promise<T> {
  try {
    const finalModelName = modelName || getPreferredModel();
    debugLog('Starting structured prompt execution with streaming', { 
      input, 
      preferredLLM: PREFERRED_LLM,
      modelName: finalModelName, 
      temperature 
    });
    
    // Validate API key
    getApiKey(); // This will throw if missing

    // Use cached instances
    const parser = getCachedParser(schema);
    const model = await getCachedModel(finalModelName, temperature);
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
  modelName?: string,
  temperature: number = 0.7
): Promise<T[]> {
  try {
    const finalModelName = modelName || getPreferredModel();
    debugLog('Starting batch prompt execution', { 
      count: prompts.length, 
      preferredLLM: PREFERRED_LLM,
      modelName: finalModelName, 
      temperature 
    });
    
    // Validate API key
    getApiKey(); // This will throw if missing

    // Use cached model for all prompts
    const model = await getCachedModel(finalModelName, temperature);

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

