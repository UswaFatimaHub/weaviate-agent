// Node.js Express server for Customer Support AI Assistant - UPDATED VERSION
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import weaviate from 'weaviate-ts-client';
import config from './config.js';
import DelegatingAgent from './agents/delegatingAgent.js';
import { specs, swaggerUi } from './swagger.js';

class SupportAssistantServer {
  constructor() {
    this.app = express();
    this.delegatingAgent = new DelegatingAgent();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Customer Support AI Assistant API'
    }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check endpoint
     *     description: Returns the health status of the API server
     *     tags: [System]
     *     responses:
     *       200:
     *         description: Server is healthy
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/HealthResponse'
     *             example:
     *               status: "healthy"
     *               timestamp: "2025-09-17T07:41:09.931Z"
     *               version: "1.0.0"
     */
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // FR-13: Main query endpoint
    /**
     * @swagger
     * /query:
     *   post:
     *     summary: Process user query with AI assistance
     *     description: |
     *       Main endpoint for processing user queries. The system intelligently determines whether to:
     *       - Use RAG Agent for support ticket retrieval
     *       - Use Chart Tool for analytics generation
     *       - Use both tools for combined responses
     *       
     *       The Delegating Agent analyzes the query and routes it to appropriate tools.
     *     tags: [Query]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/QueryRequest'
     *           examples:
     *             rag_query:
     *               summary: RAG Query Example
     *               value:
     *                 query: "How do I fix my iPhone battery issue?"
     *             analytics_query:
     *               summary: Analytics Query Example
     *               value:
     *                 query: "Show me ticket statistics and analytics"
     *             combined_query:
     *               summary: Combined Query Example
     *               value:
     *                 query: "What are common GoPro issues and show me the analytics?"
     *             tenant_query:
     *               summary: Multi-tenant Query Example
     *               value:
     *                 query: "Show me iPhone issues"
     *                 tenant: "iPhone"
     *     responses:
     *       200:
     *         description: Query processed successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/QueryResponse'
     *             examples:
     *               rag_response:
     *                 summary: RAG Response
     *                 value:
     *                   answer: "I found 3 relevant support tickets for your query. The most common solutions include checking device settings, restarting the device, and ensuring proper connectivity."
     *                   references:
     *                     ticketIds: ["1234", "5678", "9012"]
     *                   chart: null
     *                   metadata:
     *                     processingTimeMs: 1250
     *                     timestamp: "2025-09-17T07:41:09.931Z"
     *                     tenant: "global"
     *               analytics_response:
     *                 summary: Analytics Response
     *                 value:
     *                   answer: "📊 **Analytics Dashboard:**\nI've generated comprehensive analytics for your support tickets."
     *                   references:
     *                     ticketIds: []
     *                   chart:
     *                     statusDistribution:
     *                       type: "doughnut"
     *                       data:
     *                         labels: ["Open", "Closed", "Pending"]
     *                         datasets: [{"data": [45, 35, 20], "backgroundColor": ["#ff6384", "#36a2eb", "#ffce56"]}]
     *                   metadata:
     *                     processingTimeMs: 2100
     *                     timestamp: "2025-09-17T07:41:16.888Z"
     *                     tenant: "global"
     *       400:
     *         description: Invalid request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: "Invalid query. Please provide a non-empty string."
     *               code: "INVALID_QUERY"
     *               timestamp: "2025-09-17T07:41:09.931Z"
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: "Internal server error while processing your query."
     *               code: "PROCESSING_ERROR"
     *               timestamp: "2025-09-17T07:41:09.931Z"
     */
    this.app.post('/query', async (req, res) => {
      try {
        const startTime = Date.now();
        
        // Validate request
        const { query, tenant } = req.body;
        
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return res.status(400).json({
            error: 'Invalid query. Please provide a non-empty string.',
            code: 'INVALID_QUERY'
          });
        }

        console.log(`📨 Received query: "${query}"${tenant ? ` for tenant: ${tenant}` : ''}`);

        // FR-14: Handle query independently (single-turn)
        const result = await this.delegatingAgent.handleQuery(query.trim(), tenant);

        const processingTime = Date.now() - startTime;
        
        // FR-15: Return JSON formatted response
        const response = {
          answer: result.answer,
          references: result.references,
          chart: result.chart,
          metadata: {
            processingTimeMs: processingTime,
            timestamp: new Date().toISOString(),
            tenant: tenant || 'global'
          }
        };

        // NFR-1: Check if response time is within 5 seconds
        if (processingTime > 5000) {
          console.warn(`⚠️ Response time exceeded 5 seconds: ${processingTime}ms`);
        }

        console.log(`✅ Query processed in ${processingTime}ms`);
        res.json(response);

      } catch (error) {
        console.error('Query processing error:', error);
        
        res.status(500).json({
          error: 'Internal server error while processing your query.',
          code: 'PROCESSING_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get available tenants (products)
    /**
     * @swagger
     * /tenants:
     *   get:
     *     summary: Get available tenants (products)
     *     description: Returns a list of available tenants (products) in the system with their ticket counts
     *     tags: [Analytics]
     *     responses:
     *       200:
     *         description: List of available tenants
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TenantsResponse'
     *             example:
     *               tenants:
     *                 - name: "iPhone"
     *                   ticketCount: 1250
     *                 - name: "Samsung TV"
     *                   ticketCount: 890
     *                 - name: "GoPro Hero"
     *                   ticketCount: 650
     *               count: 3
     *               timestamp: "2025-09-17T07:41:09.931Z"
     *       500:
     *         description: Error fetching tenants
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/tenants', async (req, res) => {
      try {
        const tenants = await this.getAvailableTenants();
        res.json({
          tenants,
          count: tenants.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({
          error: 'Failed to fetch available tenants',
          code: 'TENANTS_ERROR'
        });
      }
    });

    // Get system statistics
    /**
     * @swagger
     * /stats:
     *   get:
     *     summary: Get system statistics
     *     description: Returns comprehensive system statistics including ticket counts, status distribution, and server metrics
     *     tags: [Analytics]
     *     responses:
     *       200:
     *         description: System statistics
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/StatsResponse'
     *             example:
     *               totalTickets: 8469
     *               statusDistribution:
     *                 Open: 1250
     *                 Closed: 6500
     *                 "Pending Customer Response": 719
     *               availableTenants:
     *                 - name: "iPhone"
     *                   ticketCount: 1250
     *                 - name: "Samsung TV"
     *                   ticketCount: 890
     *               uptime: 3600
     *               memoryUsage:
     *                 rss: 45678912
     *                 heapTotal: 20971520
     *                 heapUsed: 15728640
     *               timestamp: "2025-09-17T07:41:09.931Z"
     *       500:
     *         description: Error fetching statistics
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.getSystemStats();
        res.json({
          ...stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
          error: 'Failed to fetch system statistics',
          code: 'STATS_ERROR'
        });
      }
    });

    // Note: Demo functionality is provided through Swagger UI at /api-docs
    // Interactive examples and documentation are available there

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        availableEndpoints: [
          'POST /query',
          'GET /tenants',
          'GET /stats',
          'GET /health',
          'GET /api-docs (Swagger UI with examples)'
        ]
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  // Helper method to get available tenants (products)
  async getAvailableTenants() {
    try {
      const client = weaviate.client({
        scheme: 'http',
        host: config.weaviate.url.replace('http://', ''),
      });

      // FIXED: Correct GraphQL query with meta.count
      const result = await client.graphql
        .aggregate()
        .withClassName(config.weaviate.className)
        .withFields('groupedBy { value } meta { count }')
        .withGroupBy(['productPurchased'])
        .do();

      // FIXED: Use meta.count instead of groupedBy.count
      return result.data.Aggregate[config.weaviate.className].map(item => ({
        name: item.groupedBy.value,
        ticketCount: item.meta.count
      }));

    } catch (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
  }

  // Helper method to get system statistics
  async getSystemStats() {
    try {
      const client = weaviate.client({
        scheme: 'http',
        host: config.weaviate.url.replace('http://', ''),
      });

      // Get total ticket count
      const countResult = await client.graphql
        .aggregate()
        .withClassName(config.weaviate.className)
        .withFields('meta { count }')
        .do();

      const totalTickets = countResult.data.Aggregate[config.weaviate.className][0].meta.count;

      // Get status distribution
      const statusResult = await client.graphql
        .aggregate()
        .withClassName(config.weaviate.className)
        .withFields('groupedBy { value } meta { count }')
        .withGroupBy(['ticketStatus'])
        .do();

      const statusDistribution = statusResult.data.Aggregate[config.weaviate.className].reduce((acc, item) => {
        acc[item.groupedBy.value] = item.meta.count;
        return acc;
      }, {});

      return {
        totalTickets,
        statusDistribution,
        availableTenants: await this.getAvailableTenants(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      };

    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        totalTickets: 0,
        statusDistribution: {},
        availableTenants: [],
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      };
    }
  }

  // Start the server
  start() {
    const port = config.server.port;
    
    this.app.listen(port, () => {
      console.log('🚀 Customer Support AI Assistant Server Started');
      console.log('=' .repeat(50));
      console.log(`📡 Server running on: http://localhost:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`🔍 Query endpoint: POST http://localhost:${port}/query`);
      console.log(`🏢 Tenants endpoint: http://localhost:${port}/tenants`);
      console.log(`📈 Stats endpoint: http://localhost:${port}/stats`);
      console.log('=' .repeat(50));
      console.log('🎯 Ready to handle customer support queries!');
    });
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SupportAssistantServer();
  server.start();
}

export default SupportAssistantServer;
