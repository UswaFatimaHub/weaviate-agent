// Delegating Agent for orchestrating RAG and Chart tools - UPDATED VERSION
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { DynamicTool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import RAGAgent from './ragAgent.js';
import ChartTool from './chartTool.js';
import config from '../config.js';

class DelegatingAgent {
  constructor() {
    this.ragAgent = new RAGAgent();
    this.chartTool = new ChartTool();
    
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
    const ragTool = new DynamicTool({
      name: "searchSupportTickets",
      description: "Search for support tickets to answer customer questions. Input should be a JSON string with 'query' and optional 'tenant' fields.",
      func: async (input) => {
        try {
          console.log("🔍 RAG Tool called with input:", input);
          
          let params;
          try {
            params = typeof input === 'string' ? JSON.parse(input) : input;
          } catch {
            params = { query: String(input) };
          }
          
          const { query, tenant = null } = params;
          const result = await this.ragAgent.handleQueryLegacy(query, tenant);
          
          return JSON.stringify({
            success: true,
            answer: result.answer,
            ticketIds: result.references?.ticketIds || []
          });
        } catch (error) {
          console.error('RAG tool error:', error);
          return JSON.stringify({
            success: false,
            error: error.message,
            answer: "Error searching support tickets"
          });
        }
      },
    });

    const chartTool = new DynamicTool({
      name: "generateAnalytics",
      description: "Generate analytics and charts for support tickets. Input should be a JSON string with optional 'tenant' field for filtering.",
      func: async (input) => {
        try {
          console.log("📊 Chart Tool called with input:", input);
          
          let params;
          try {
            params = typeof input === 'string' ? JSON.parse(input) : input;
          } catch {
            params = {};
          }
          
          const { tenant = null } = params;
          const charts = await this.chartTool.generateAnalytics(tenant);
          
          return JSON.stringify({
            success: true,
            charts: charts,
            description: "Generated analytics charts for ticket status, priority, response times, and satisfaction ratings"
          });
        } catch (error) {
          console.error('Chart tool error:', error);
          return JSON.stringify({
            success: false,
            error: error.message,
            charts: null
          });
        }
      },
    });

    return [ragTool, chartTool];
  }

  // FR-2: Analyze query to determine which tools to invoke
  async analyzeQuery(state) {
    try {
      console.log(`🧠 Delegating Agent analyzing query: "${state.query}"`);

      const analysisPrompt = `
Analyze the following user query and determine which tools should be invoked:

User Query: "${state.query}"

Available Tools:
1. RAG Agent - For finding relevant support tickets and solutions
2. Chart Tool - For generating analytics and visualizations

Determine if the query needs:
- RAG Agent: If the user is asking about specific support issues, solutions, or ticket information
- Chart Tool: If the user is asking for analytics, statistics, charts, or data visualization
- Both: If the query requires both ticket information and analytics

Respond with a JSON object:
{
  "needsRAG": true/false,
  "needsChart": true/false,
  "reasoning": "brief explanation"
}

Examples:
- "How do I fix my iPhone battery issue?" → needsRAG: true, needsChart: false
- "Show me ticket statistics" → needsRAG: false, needsChart: true  
- "What are the common issues with GoPro and show me the analytics" → needsRAG: true, needsChart: true
`;

      const response = await this.llm.invoke(analysisPrompt);
      
      // Parse JSON response
      const analysis = this.parseJSONResponse(response.content);
      
      console.log(`📋 Analysis result:`, analysis);
      
      return {
        ...state,
        needsRAG: analysis.needsRAG || false,
        needsChart: analysis.needsChart || false
      };

    } catch (error) {
      console.error('Query analysis error:', error);
      // Default to RAG if analysis fails
      return {
        ...state,
        needsRAG: true,
        needsChart: false
      };
    }
  }

  // Execute RAG Agent
  async executeRAG(state) {
    try {
      console.log(`🔍 Executing RAG Agent for query: "${state.query}"`);
      
      const ragResult = await this.ragAgent.handleQuery(state.query, state.tenant);
      
      console.log(`✅ RAG Agent completed`);
      
      return ragResult;

    } catch (error) {
      console.error('RAG execution error:', error);
      return {
        answer: "I encountered an error while searching for support tickets.",
        references: { ticketIds: [] }
      };
    }
  }

  // Execute Chart Tool
  async executeChart(state) {
    try {
      console.log(`📊 Executing Chart Tool for query: "${state.query}"`);
      
      const chartResult = await this.chartTool.generateAnalytics(state.tenant);
      
      console.log(`✅ Chart Tool completed`);
      
      return chartResult;

    } catch (error) {
      console.error('Chart execution error:', error);
      return this.chartTool.getErrorChart('Failed to generate analytics');
    }
  }

  // FR-8, FR-9: Combine results from both tools
  async combineResults(state) {
    try {
      console.log(`🔄 Combining results from tools`);

      let answer = '';
      let references = { ticketIds: [] };
      let chart = null;

      // Combine RAG results
      if (state.ragResult) {
        answer += state.ragResult.answer;
        if (state.ragResult.references && state.ragResult.references.ticketIds.length > 0) {
          references.ticketIds = state.ragResult.references.ticketIds;
        }
      }

      // Add chart results
      if (state.chartResult) {
        if (answer) {
          answer += '\n\n📊 **Analytics Dashboard:**\n';
        } else {
          answer = '📊 **Analytics Dashboard:**\n';
        }
        
        answer += 'I\'ve generated comprehensive analytics for your support tickets. The charts below show:\n';
        answer += '- Ticket status distribution\n';
        answer += '- Priority level breakdown\n';
        answer += '- Response time statistics\n';
        answer += '- Customer satisfaction ratings\n';
        
        chart = state.chartResult;
      }

      // If no results from either tool, provide a helpful message
      if (!answer) {
        answer = "I couldn't process your query. Please try asking about support tickets or requesting analytics.";
      }

      const finalResponse = {
        answer: answer.trim(),
        references,
        chart
      };

      console.log(`✅ Delegating Agent completed successfully`);
      
      return finalResponse;

    } catch (error) {
      console.error('Result combination error:', error);
      return {
        answer: "I encountered an error while processing your request. Please try again.",
        references: { ticketIds: [] },
        chart: null
      };
    }
  }

  // Helper method to parse JSON responses from LLM
  parseJSONResponse(response) {
    try {
      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('JSON parsing error:', error);
      // Return default values
      return {
        needsRAG: true,
        needsChart: false,
        reasoning: 'Failed to parse analysis, defaulting to RAG'
      };
    }
  }

  // Main method to handle user queries using hierarchical approach
  async handleQuery(userQuery, tenant = null, threadId = "default") {
    try {
      console.log(`🎯 Delegating Agent handling query: "${userQuery}"${tenant ? ` for tenant: ${tenant}` : ''}`);

      // Step 1: Analyze query to determine which tools to use
      const analysis = await this.analyzeQueryRequirements(userQuery);
      console.log(`📋 Query analysis: RAG=${analysis.needsRAG}, Chart=${analysis.needsChart}`);

      let ragResult = null;
      let chartResult = null;
      let references = { threadId };

      // Step 2: Execute tools based on analysis
      if (analysis.needsRAG) {
        console.log(`🔍 Executing RAG for: "${userQuery}"`);
        ragResult = await this.ragAgent.handleQueryLegacy(userQuery, tenant);
        // Extract ticket references
        if (ragResult.references && ragResult.references.ticketIds) {
          references.ticketIds = ragResult.references.ticketIds;
        }
      }

      if (analysis.needsChart) {
        console.log(`📊 Executing Chart Tool for analytics`);
        chartResult = await this.chartTool.generateAnalytics(tenant);
      }

      // Step 3: Combine results according to requirements
      const finalResponse = await this.combineResults({
        userQuery,
        tenant,
        ragResult,
        chartResult,
        analysis
      });

      console.log(`✅ Delegating Agent completed successfully`);
      return {
        answer: finalResponse.answer,
        references: references,
        chart: chartResult // Return Chart.js config if generated
      };
      
    } catch (error) {
      console.error('Delegating Agent error:', error);
      return {
        answer: "I encountered an error while processing your request. Please try again.",
        references: { threadId, error: error.message },
        chart: null
      };
    }
  }

  // Enhanced query analysis method
  async analyzeQueryRequirements(userQuery) {
    try {
      const analysisPrompt = `Analyze this customer support query and determine which tools are needed:

Query: "${userQuery}"

Available Tools:
1. RAG Agent - For finding specific support tickets, solutions, troubleshooting steps, or product issues
2. Chart Tool - For generating analytics, statistics, charts, or data visualizations

Rules:
- Use RAG if query asks about: specific problems, issues, solutions, troubleshooting, "common problems", "how to fix", product names with issues
- Use Chart if query asks about: statistics, analytics, charts, data, distribution, "show me stats", trends
- Use BOTH if query combines these (e.g., "common issues AND analytics", "problems and show charts")

Respond with ONLY a JSON object:
{
  "needsRAG": boolean,
  "needsChart": boolean,
  "reasoning": "explanation"
}`;

      const response = await this.llm.invoke(analysisPrompt);
      
      // Parse JSON response
      const analysis = this.parseJSONResponse(response.content);
      
      return analysis;

    } catch (error) {
      console.error('Query analysis error:', error);
      // Enhanced fallback logic
      const queryLower = userQuery.toLowerCase();
      const hasIssueKeywords = /issue|problem|fix|trouble|error|common|help|setup|install|battery|camera|tv/.test(queryLower);
      const hasAnalyticsKeywords = /analytics|chart|statistic|data|show.*stat|distribution|trend|visual/.test(queryLower);
      
      return {
        needsRAG: hasIssueKeywords,
        needsChart: hasAnalyticsKeywords,
        reasoning: 'Fallback analysis based on keywords'
      };
    }
  }

  // Enhanced result combination method
  async combineResults({ userQuery, tenant, ragResult, chartResult, analysis }) {
    let answer = '';

    // Add RAG content if available
    if (ragResult && ragResult.answer) {
      answer += ragResult.answer;
    }

    // Add chart content if available
    if (chartResult) {
      if (answer) {
        answer += '\n\n📊 **Analytics Dashboard:**\n';
      } else {
        answer = '📊 **Analytics Dashboard:**\n';
      }
      
      answer += 'I\'ve generated comprehensive analytics for your support tickets:\n\n';
      
      // Generate analytics summary from chart data
      const statusChart = chartResult.statusDistribution;
      const priorityChart = chartResult.priorityDistribution;
      
      if (statusChart && statusChart.data) {
        const statusData = statusChart.data.datasets[0].data;
        const statusLabels = statusChart.data.labels;
        answer += '**Ticket Status Distribution:**\n';
        statusLabels.forEach((label, index) => {
          answer += `- **${label}:** ${statusData[index]} tickets\n`;
        });
        answer += '\n';
      }
      
      if (priorityChart && priorityChart.data) {
        const priorityData = priorityChart.data.datasets[0].data;
        const priorityLabels = priorityChart.data.labels;
        answer += '**Ticket Priority Distribution:**\n';
        priorityLabels.forEach((label, index) => {
          answer += `- **${label}:** ${priorityData[index]} tickets\n`;
        });
        answer += '\n';
      }
      
      // Add response time and satisfaction info
      if (chartResult.responseTimeChart) {
        const responseData = chartResult.responseTimeChart.data.datasets[0].data;
        answer += `**Response Time Statistics:**\n`;
        answer += `- **Average:** ${responseData[0]?.toFixed(2) || 'N/A'} hours\n`;
        answer += `- **Minimum:** ${responseData[1]?.toFixed(2) || 'N/A'} hours\n`;
        answer += `- **Maximum:** ${responseData[2]?.toFixed(2) || 'N/A'} hours\n\n`;
      }
    }

    // If no results from either tool, provide a helpful message
    if (!answer) {
      answer = "I couldn't find specific information for your query. Please try asking about support issues or requesting analytics.";
    }

    return { answer: answer.trim() };
  }

  // Legacy method to handle user queries (for backward compatibility)
  async handleQueryLegacy(userQuery, tenant = null) {
    try {
      console.log(`🎯 Delegating Agent handling query (legacy): "${userQuery}"${tenant ? ` for tenant: ${tenant}` : ''}`);

      // Step 1: Analyze query to determine which tools to use
      const analysis = await this.analyzeQuery({ query: userQuery });
      
      let ragResult = null;
      let chartResult = null;

      // Step 2: Execute RAG if needed
      if (analysis.needsRAG) {
        ragResult = await this.executeRAG({ query: userQuery, tenant });
      }

      // Step 3: Execute Chart tool if needed
      if (analysis.needsChart) {
        chartResult = await this.executeChart({ tenant });
      }

      // Step 4: Combine results
      const finalResponse = await this.combineResults({
        query: userQuery,
        tenant,
        ragResult,
        chartResult
      });
      
      return finalResponse;

    } catch (error) {
      console.error('Delegating Agent error:', error);
      return {
        answer: "I encountered an error while processing your request. Please try again.",
        references: { ticketIds: [] },
        chart: null
      };
    }
  }
}

export default DelegatingAgent;
