// Swagger configuration for Customer Support AI Assistant API
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Customer Support AI Assistant API',
      version: '1.0.0',
      description: `
        AI-powered Customer Support Assistant with Analytics
        
        This API provides intelligent customer support capabilities using:
        - **RAG (Retrieval-Augmented Generation)** for ticket retrieval
        - **Chart.js** for analytics visualization  
        - **Agent Orchestration** for intelligent query routing
        - **Multi-tenancy** for product-specific queries
        
        ## Features
        - Retrieve relevant support tickets from Weaviate vector database
        - Generate comprehensive analytics and visualizations
        - Intelligent query analysis and tool selection
        - Multi-tenant support with product isolation
        - Real-time response generation with structured JSON output
        
        ## Authentication
        Currently no authentication required for demo purposes.
        
        ## Rate Limiting
        No rate limiting implemented in demo mode.
      `,
      contact: {
        name: 'Customer Support AI Assistant',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        QueryRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: {
              type: 'string',
              description: 'User query for support assistance or analytics',
              example: 'Show me MacBook Pro issues?',
              minLength: 1,
              maxLength: 1000
            },
            tenant: {
              type: 'string',
              description: 'Product/tenant identifier for multi-tenant queries',
              example: 'iPhone',
              maxLength: 100
            }
          }
        },
        QueryResponse: {
          type: 'object',
          properties: {
            answer: {
              type: 'string',
              description: 'AI-generated response to the user query',
              example: 'I found 3 relevant support tickets for your query. The most common solutions include checking device settings, restarting the device, and ensuring proper connectivity.'
            },
            references: {
              type: 'object',
              properties: {
                ticketIds: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Array of ticket IDs referenced in the response',
                  example: ['1234', '5678', '9012']
                }
              }
            },
            chart: {
              type: 'object',
              description: 'Chart.js configuration objects for analytics visualization',
              nullable: true,
              properties: {
                statusDistribution: {
                  type: 'object',
                  description: 'Doughnut chart showing ticket status distribution'
                },
                priorityDistribution: {
                  type: 'object', 
                  description: 'Bar chart showing ticket priority distribution'
                },
                responseTimeChart: {
                  type: 'object',
                  description: 'Bar chart showing response time statistics'
                },
                satisfactionChart: {
                  type: 'object',
                  description: 'Bar chart showing customer satisfaction ratings'
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                processingTimeMs: {
                  type: 'integer',
                  description: 'Time taken to process the query in milliseconds',
                  example: 1250
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'ISO timestamp of the response',
                  example: '2025-09-17T07:41:09.931Z'
                },
                tenant: {
                  type: 'string',
                  description: 'Tenant used for the query',
                  example: 'global'
                },
                mode: {
                  type: 'string',
                  description: 'Server mode (demo or production)',
                  example: 'demo'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid query. Please provide a non-empty string.'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling',
              example: 'INVALID_QUERY'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp of the error',
              example: '2025-09-17T07:41:09.931Z'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Health status',
              example: 'healthy'
            },
            mode: {
              type: 'string',
              description: 'Server mode',
              example: 'demo'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp',
              example: '2025-09-17T07:41:09.931Z'
            }
          }
        },
        Tenant: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Product/tenant name',
              example: 'iPhone'
            },
            ticketCount: {
              type: 'integer',
              description: 'Number of tickets for this tenant',
              example: 1250
            }
          }
        },
        TenantsResponse: {
          type: 'object',
          properties: {
            tenants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Tenant'
              }
            },
            count: {
              type: 'integer',
              description: 'Total number of tenants',
              example: 15
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp',
              example: '2025-09-17T07:41:09.931Z'
            }
          }
        },
        StatsResponse: {
          type: 'object',
          properties: {
            totalTickets: {
              type: 'integer',
              description: 'Total number of support tickets',
              example: 8469
            },
            statusDistribution: {
              type: 'object',
              description: 'Distribution of ticket statuses',
              example: {
                'Open': 1250,
                'Closed': 6500,
                'Pending Customer Response': 719
              }
            },
            availableTenants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Tenant'
              }
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 3600
            },
            memoryUsage: {
              type: 'object',
              description: 'Memory usage statistics',
              properties: {
                rss: { type: 'integer', example: 45678912 },
                heapTotal: { type: 'integer', example: 20971520 },
                heapUsed: { type: 'integer', example: 15728640 }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp',
              example: '2025-09-17T07:41:09.931Z'
            }
          }
        },
        DemoResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Demo information message',
              example: 'Customer Support AI Assistant - DEMO MODE'
            },
            note: {
              type: 'string',
              description: 'Additional demo information',
              example: 'This is a demonstration version with mock responses'
            },
            exampleQueries: {
              type: 'object',
              properties: {
                rag: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Example RAG queries',
                  example: [
                    'Show me MacBook Pro issues?',
                    'What are common problems with GoPro cameras?'
                  ]
                },
                analytics: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Example analytics queries',
                  example: [
                    'Show me ticket statistics',
                    'What is the ticket status distribution?'
                  ]
                },
                combined: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Example combined queries',
                  example: [
                    'What are the common iPhone issues and show me the analytics?',
                    'Tell me about GoPro problems and generate charts'
                  ]
                }
              }
            },
            endpoints: {
              type: 'object',
              description: 'Available API endpoints',
              properties: {
                query: { type: 'string', example: 'POST /query - Main query endpoint' },
                tenants: { type: 'string', example: 'GET /tenants - Get available products' },
                stats: { type: 'string', example: 'GET /stats - Get system statistics' },
                health: { type: 'string', example: 'GET /health - Health check' }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Query',
        description: 'Main query endpoint for AI-powered support assistance'
      },
      {
        name: 'System',
        description: 'System information and health endpoints'
      },
      {
        name: 'Analytics',
        description: 'Analytics and statistics endpoints'
      }
    ]
  },
  apis: ['./server.js', './demo.js'] // Path to the API files
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
