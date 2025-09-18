// Delegating Agent for orchestrating RAG and Chart tools - CLEANED VERSION
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
                ragResult = await this.ragAgent.handleQuery(userQuery, tenant);
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
      
      // Check if it's a quota error and handle appropriately
      const isQuotaError = error.message && (
        error.message.includes('429') || 
        error.message.includes('Too Many Requests') ||
        error.message.includes('quota') ||
        error.message.includes('rate limit')
      );
      
      if (isQuotaError) {
        console.log('🚦 Google API quota exceeded, using enhanced keyword analysis...');
      }
      
      // Enhanced fallback logic with more keywords
      const queryLower = userQuery.toLowerCase();
      const hasIssueKeywords = /issue|problem|fix|trouble|error|common|help|setup|install|battery|camera|tv|broken|not working|malfunction|defect/.test(queryLower);
      const hasAnalyticsKeywords = /analytics|chart|statistic|data|show.*stat|distribution|trend|visual|graph|report|dashboard|metrics/.test(queryLower);
      
      return {
        needsRAG: hasIssueKeywords,
        needsChart: hasAnalyticsKeywords,
        reasoning: isQuotaError ? 
          'Fallback analysis due to API quota limits - using keyword detection' : 
          'Fallback analysis based on keywords due to LLM error'
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
}

export default DelegatingAgent;
