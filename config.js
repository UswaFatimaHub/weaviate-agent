// Configuration for the Customer Support AI Assistant
import dotenv from 'dotenv';
dotenv.config();

const config = {
  // LLM Configuration
  llm: {
    // Default to Google Gemini (free tier)
    provider: process.env.LLM_PROVIDER || 'gemini',
    googleApiKey: process.env.GOOGLE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY
  },

  // Weaviate Configuration
  weaviate: {
    url: process.env.WEAVIATE_URL || 'http://localhost:8080',
    className: 'SupportTicket'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Agent Configuration
  agents: {
    maxRetries: 3,
    timeout: 5000, // 5 seconds as per NFR-1
    maxTokens: 1000
  },

  // Chart.js Configuration
  charts: {
    width: 800,
    height: 400,
    backgroundColor: '#ffffff'
  }
};

export default config;
