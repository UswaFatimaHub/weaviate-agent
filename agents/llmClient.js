// LLM Client for different providers (Gemini, OpenAI) - UPDATED VERSION
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import config from '../config.js';

class LLMClient {
  constructor() {
    this.llm = this.initializeLLM();
  }

  initializeLLM() {
    const { provider, googleApiKey, openaiApiKey } = config.llm;

    switch (provider) {
      case 'gemini':
        if (!googleApiKey) {
          throw new Error('GOOGLE_API_KEY is required for Gemini provider');
        }
        return new ChatGoogleGenerativeAI({
          model: 'gemini-1.5-flash',
          apiKey: googleApiKey,
          maxOutputTokens: config.agents.maxTokens,
          temperature: 0
        });

      case 'openai':
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY is required for OpenAI provider');
        }
        return new ChatOpenAI({
          model: 'gpt-3.5-turbo',
          apiKey: openaiApiKey,
          maxTokens: config.agents.maxTokens,
          temperature: 0.1
        });

      default:
        throw new Error(`Unsupported LLM provider: ${provider}. Supported providers: gemini, openai`);
    }
  }

  // FIXED: Changed to accept prompt string directly
  async generateResponse(prompt, options = {}) {
    try {
      const response = await this.llm.invoke(prompt, {
        timeout: config.agents.timeout,
        ...options
      });
      return response.content;
    } catch (error) {
      console.error('LLM generation error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  // FIXED: Simplified to pass prompt directly
  async generateWithPrompt(prompt, options = {}) {
    return this.generateResponse(prompt, options);
  }
}

export default LLMClient;
