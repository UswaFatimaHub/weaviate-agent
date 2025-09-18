// RAG Agent for ticket retrieval from Weaviate - UPDATED VERSION
import weaviate from 'weaviate-ts-client';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { DynamicTool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import config from '../config.js';

class RAGAgent {
  constructor() {
    this.client = weaviate.client({
      scheme: 'http',
      host: config.weaviate.url.replace('http://', ''),
    });
    
    // Initialize the LLM
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      temperature: 0,
      apiKey: process.env.GOOGLE_API_KEY,
    });
    
    // Initialize memory
    this.memory = new MemorySaver();
    
    // Create tools
    this.tools = this.createTools();
    
    // Create the agent
    this.agent = createReactAgent({
      llm: this.llm,
      tools: this.tools,
      checkpointSaver: this.memory,
    });
  }

  createTools() {
    const searchTicketsTool = new DynamicTool({
      name: "searchTickets",
      description: "Search for support tickets by query and optional tenant/product filter. Input should be a JSON string with 'query' and optional 'tenant' and 'limit' fields.",
      func: async (input) => {
        try {
          console.log("🔍 RAG Tool called with input:", input);
          
          // Parse input
          let params;
          try {
            params = typeof input === 'string' ? JSON.parse(input) : input;
          } catch {
            params = { query: String(input) };
          }
          
          const { query, tenant = null, limit = 5 } = params;
          const tickets = await this.searchTickets(query, tenant, limit);
          
          return JSON.stringify({
            success: true,
            tickets: tickets,
            count: tickets.length
          });
        } catch (error) {
          console.error('Search tickets tool error:', error);
          return JSON.stringify({
            success: false,
            error: error.message,
            tickets: []
          });
        }
      },
    });

    return [searchTicketsTool];
  }

  // FR-3: Query Weaviate for relevant tickets based on ticketSubject, ticketDescription, and Tenant
  async searchTickets(query, tenant = null, limit = 5) {
    try {
      console.log(`🔍 RAG Agent searching for: "${query}"${tenant ? ` in tenant: ${tenant}` : ''}`);

      let searchQuery;
      
      if (tenant) {
        // Multi-tenant search with product filter
        searchQuery = this.client.graphql
          .get()
          .withClassName(config.weaviate.className)
          .withFields('ticketId ticketSubject ticketDescription resolution ticketStatus ticketPriority productPurchased')
          .withNearText({ concepts: [query] })
          .withWhere({
            path: ['productPurchased'],
            operator: 'Equal',
            valueText: tenant
          })
          .withLimit(limit);
      } else {
        // Global search across all tenants
        searchQuery = this.client.graphql
          .get()
          .withClassName(config.weaviate.className)
          .withFields('ticketId ticketSubject ticketDescription resolution ticketStatus ticketPriority productPurchased')
          .withNearText({ concepts: [query] })
          .withLimit(limit);
      }

      const result = await searchQuery.do();
      
      // Check for GraphQL errors (like transformer service unavailable)
      if (result.errors && result.errors.length > 0) {
        const errorMessage = result.errors[0].message;
        console.error('GraphQL error detected:', errorMessage);
        
        // Check if it's a transformer service error
        if (errorMessage.includes('t2v-transformers') || 
            errorMessage.includes('vectorize') || 
            errorMessage.includes('no such host') ||
            errorMessage.includes('dial tcp: lookup t2v-transformers')) {
          console.log('🚨 Transformer embedding service unavailable - falling back to GraphQL search');
          return this.fallbackSearch(query, tenant, limit);
        }
        
        // For other GraphQL errors, throw to trigger catch block
        throw new Error(`GraphQL error: ${errorMessage}`);
      }
      
      const tickets = result.data.Get[config.weaviate.className] || [];

      console.log(`📊 Found ${tickets.length} relevant tickets`);
      return tickets;

    } catch (error) {
      console.error('RAG Agent search error:', error);

      // Check if it's a connection error (Weaviate down)
      const isConnectionError = error.message && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed') ||
        error.message.includes('Connection refused') ||
        error.code === 'ECONNREFUSED'
      );

      // Check if it's a transformer service error (embedding model unavailable)
      const isTransformerError = error.message && (
        error.message.includes('t2v-transformers') ||
        error.message.includes('vectorize') ||
        error.message.includes('no such host') ||
        error.message.includes('dial tcp: lookup t2v-transformers')
      );

      if (isConnectionError) {
        console.log('🚨 Weaviate connection failed - returning empty result');
        return [];
      }

      if (isTransformerError) {
        console.log('🚨 Transformer embedding service unavailable - falling back to GraphQL search');
        return this.fallbackSearch(query, tenant, limit);
      }

      // FR-5: Fallback to fetchObjects API for other errors
      console.log('🔄 Falling back to fetchObjects API...');
      return this.fallbackSearch(query, tenant, limit);
    }
  }

  // FR-5: Fallback method using fetchObjects API when GraphQL fails
  async fallbackSearch(query, tenant = null, limit = 5) {
    try {
      console.log('🔄 Attempting GraphQL fallback search...');
      
      const whereClause = tenant ? {
        operator: 'And',
        operands: [
          {
            path: ['productPurchased'],
            operator: 'Equal',
            valueText: tenant
          },
          {
            operator: 'Or',
            operands: [
              {
                path: ['ticketSubject'],
                operator: 'Like',
                valueText: `*${query}*`
              },
              {
                path: ['ticketDescription'],
                operator: 'Like',
                valueText: `*${query}*`
              }
            ]
          }
        ]
      } : {
        operator: 'Or',
        operands: [
          {
            path: ['ticketSubject'],
            operator: 'Like',
            valueText: `*${query}*`
          },
          {
            path: ['ticketDescription'],
            operator: 'Like',
            valueText: `*${query}*`
          }
        ]
      };

      const result = await this.client.graphql
        .get()
        .withClassName(config.weaviate.className)
        .withFields('ticketId ticketSubject ticketDescription resolution ticketStatus ticketPriority productPurchased')
        .withWhere(whereClause)
        .withLimit(limit)
        .do();

      const tickets = result.data.Get[config.weaviate.className] || [];
      console.log(`📊 GraphQL fallback search found ${tickets.length} tickets`);
      return tickets;

    } catch (error) {
      console.error('GraphQL fallback search error:', error);
      
      // Check for connection errors
      const isConnectionError = error.message && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed') ||
        error.message.includes('Connection refused') ||
        error.code === 'ECONNREFUSED'
      );

      if (isConnectionError) {
        console.log('🚨 Weaviate connection failed in fallback - returning empty result');
        return [];
      }
      
      console.log('🔄 Attempting fetchObjects API as final fallback...');
      
      // Final fallback: Use fetchObjects API directly
      return this.fetchObjectsFallback(query, tenant, limit);
    }
  }

  // Ultimate fallback: Use fetchObjects API when all GraphQL methods fail
  async fetchObjectsFallback(query, tenant = null, limit = 5) {
    try {
      console.log('🛡️ Using fetchObjects API as ultimate fallback...');
      
      // Use the raw REST API instead of GraphQL
      const whereFilter = tenant ? {
        operator: 'And',
        operands: [
          {
            path: ['productPurchased'],
            operator: 'Equal',
            valueText: tenant
          },
          {
            operator: 'Or',
            operands: [
              {
                path: ['ticketSubject'],
                operator: 'Like',
                valueText: `*${query}*`
              },
              {
                path: ['ticketDescription'],
                operator: 'Like',
                valueText: `*${query}*`
              }
            ]
          }
        ]
      } : {
        operator: 'Or',
        operands: [
          {
            path: ['ticketSubject'],
            operator: 'Like',
            valueText: `*${query}*`
          },
          {
            path: ['ticketDescription'],
            operator: 'Like',
            valueText: `*${query}*`
          }
        ]
      };

      // Use the data.getter API which uses fetchObjects under the hood
      const result = await this.client.data
        .getter()
        .withClassName(config.weaviate.className)
        .withWhere(whereFilter)
        .withLimit(limit)
        .do();

      const tickets = result || [];
      console.log(`📊 fetchObjects API found ${tickets.length} tickets`);
      return tickets;

    } catch (error) {
      console.error('fetchObjects API error:', error);
      console.log('🚨 All Weaviate APIs failed - returning empty result');
      
      // Return empty result when all Weaviate APIs fail
      return [];
    }
  }


  // FR-4: Generate response with ticket information and references (used by legacy method)
  async generateResponse(userQuery, tickets) {
    if (!tickets || tickets.length === 0) {
      return {
        answer: "I couldn't find any relevant support tickets for your query. Please try rephrasing your question or check if the product name is correct.",
        references: { ticketIds: [] }
      };
    }

    // Prepare context from tickets for direct LLM call
    const context = tickets.map(ticket => `
Ticket ID: ${ticket.ticketId}
Subject: ${ticket.ticketSubject}
Description: ${ticket.ticketDescription}
Resolution: ${ticket.resolution || 'No resolution provided'}
Status: ${ticket.ticketStatus}
Priority: ${ticket.ticketPriority}
Product: ${ticket.productPurchased}
`).join('\n---\n');

    const prompt = `You are a helpful customer support assistant. Based on the following support tickets, provide a comprehensive answer to the user's query.

User Query: "${userQuery}"

Relevant Support Tickets:
${context}

Instructions:
1. Provide a clear, helpful answer based on the ticket information
2. If multiple tickets are relevant, synthesize the information
3. Mention specific ticket IDs when referencing solutions
4. If no direct solution exists, suggest next steps
5. Keep the response concise but informative

Answer:`;

    try {
      const response = await this.llm.invoke(prompt);

      return {
        answer: response.content.trim(),
        references: {
          ticketIds: tickets.map(ticket => ticket.ticketId)
        }
      };
    } catch (error) {
      console.error('Error generating RAG response:', error);
      
      // Enhanced fallback when LLM fails (Google API quota, network issues, etc.)
      console.log('🔄 Using template-based response fallback...');
      return this.generateFallbackResponse(userQuery, tickets, error);
    }
  }

  // Template-based response generation when LLM fails
  generateFallbackResponse(userQuery, tickets, error) {
    if (!tickets || tickets.length === 0) {
      return {
        answer: "I couldn't find any relevant support tickets for your query. This may be due to system limitations. Please try rephrasing your question or contact support directly.",
        references: { ticketIds: [], fallbackUsed: true, error: 'No tickets found' }
      };
    }

    // Generate a structured response without LLM
    let answer = `Based on your query "${userQuery}", I found ${tickets.length} relevant support ticket(s):\n\n`;
    
    for (let index = 0; index < tickets.length; index++) {
      const ticket = tickets[index];
      answer += `**Ticket #${ticket.ticketId}** (${ticket.ticketPriority || 'Unknown'} Priority)\n`;
      answer += `**Subject:** ${ticket.ticketSubject}\n`;
      answer += `**Product:** ${ticket.productPurchased}\n`;
      answer += `**Status:** ${ticket.ticketStatus}\n`;
      
      if (ticket.ticketDescription) {
        answer += `**Issue:** ${ticket.ticketDescription.substring(0, 150)}${ticket.ticketDescription.length > 150 ? '...' : ''}\n`;
      }
      
      if (ticket.resolution) {
        answer += `**Resolution:** ${ticket.resolution.substring(0, 200)}${ticket.resolution.length > 200 ? '...' : ''}\n`;
      }
      
      answer += '\n';
      
      // Limit to first 3 tickets to keep response manageable
      if (index >= 2) {
        const remaining = tickets.length - 3;
        if (remaining > 0) {
          answer += `... and ${remaining} more similar ticket(s).\n`;
        }
        break;
      }
    }

    // Add general guidance based on query keywords
    const queryLower = userQuery.toLowerCase();
    if (queryLower.includes('battery')) {
      answer += '\n**General Battery Tips:**\n- Check for iOS/firmware updates\n- Review battery usage in settings\n- Consider battery replacement if device is old\n';
    } else if (queryLower.includes('camera') || queryLower.includes('recording')) {
      answer += '\n**General Camera Tips:**\n- Ensure sufficient storage space\n- Check SD card compatibility\n- Update device firmware\n';
    } else if (queryLower.includes('setup') || queryLower.includes('install')) {
      answer += '\n**General Setup Tips:**\n- Follow the quick start guide\n- Ensure stable internet connection\n- Check device compatibility\n';
    }

    answer += '\n*Note: This response was generated using fallback mode due to temporary service limitations.*';

    return {
      answer: answer.trim(),
      references: {
        ticketIds: tickets.map(ticket => ticket.ticketId),
        fallbackUsed: true,
        fallbackReason: error.message || 'LLM service unavailable'
      }
    };
  }

  // Main method to handle RAG queries using the agent
  async handleQuery(userQuery, tenant = null, threadId = "default") {
    try {
      console.log(`🎯 RAG Agent handling query: "${userQuery}"`);
      
      // Create prompt with context about available tools
      const prompt = `You are a helpful customer support assistant. You have access to a search tool to find relevant support tickets.

User Query: "${userQuery}"
${tenant ? `Product/Tenant Filter: ${tenant}` : 'Search across all products'}

Please use the searchTickets tool to find relevant support tickets and provide a comprehensive answer based on the ticket information. Always include ticket IDs when referencing specific solutions.`;

      // Run the agent
      const result = await this.agent.invoke(
        { messages: [new HumanMessage(prompt)] },
        { configurable: { thread_id: threadId } }
      );
      
      const finalMessage = result.messages.at(-1);
      
      console.log(`✅ RAG Agent completed successfully`);
      return {
        answer: finalMessage.content,
        references: { threadId }
      };
      
    } catch (error) {
      console.error('RAG Agent error:', error);
      return {
        answer: "I encountered an error while searching for support tickets. Please try again.",
        references: { threadId, error: error.message }
      };
    }
  }

  // Legacy method to handle RAG queries (for backward compatibility)
  async handleQueryLegacy(userQuery, tenant = null, limit = 10) {
    try {
      console.log(`🎯 RAG Agent handling query (legacy): "${userQuery}"`);
      
      // Search for relevant tickets
      const tickets = await this.searchTickets(userQuery, tenant, limit);
      
      // Generate response
      const response = await this.generateResponse(userQuery, tickets);
      
      console.log(`✅ RAG Agent completed successfully`);
      return response;
      
    } catch (error) {
      console.error('RAG Agent error:', error);
      return {
        answer: "I encountered an error while searching for support tickets. Please try again.",
        references: { ticketIds: [] }
      };
    }
  }
}

export default RAGAgent;
