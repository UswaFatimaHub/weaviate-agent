# Swagger API Documentation - Customer Support AI Assistant

## 📚 Overview

The Customer Support AI Assistant now includes comprehensive Swagger/OpenAPI documentation that provides interactive API exploration, detailed schemas, and example requests/responses.

## 🚀 Accessing the Documentation

### Development/Production Mode
```bash
# Start the server
npm start

# Access Interactive Swagger UI
http://localhost:3000/api-docs
```

The Swagger UI provides:
- **Interactive testing** - Try all endpoints directly in the browser
- **Real-time responses** - See actual AI-generated responses
- **Comprehensive schemas** - Detailed request/response formats
- **Example data** - Pre-populated example queries for each endpoint

## 📋 API Endpoints Documented

### 1. Query Endpoint (`POST /query`)
**Main endpoint for AI-powered customer support queries**

**Features:**
- Interactive request/response examples
- Multiple query type examples (RAG, Analytics, Combined)
- Detailed response schemas
- Error handling documentation

**Example Requests:**
```json
// RAG Query
{
  "query": "How do I fix my iPhone battery issue?"
}

// Analytics Query
{
  "query": "Show me ticket statistics and analytics"
}

// Combined Query
{
  "query": "What are common GoPro issues and show me the analytics?"
}

// Multi-tenant Query
{
  "query": "Show me iPhone issues",
  "tenant": "iPhone"
}
```

### 2. Health Check (`GET /health`)
**System health monitoring endpoint**

**Response:**
```json
{
  "status": "healthy",
  "mode": "demo",
  "timestamp": "2025-09-17T07:50:29.789Z"
}
```

### 3. Demo Information (`GET /demo`)
**Demo mode information and example queries**

**Response:**
```json
{
  "message": "Customer Support AI Assistant - DEMO MODE",
  "note": "This is a demonstration version with mock responses",
  "exampleQueries": {
    "rag": ["How do I fix my iPhone battery issue?"],
    "analytics": ["Show me ticket statistics"],
    "combined": ["What are common iPhone issues and show analytics?"]
  },
  "endpoints": {
    "query": "POST /query - Main query endpoint (demo mode)",
    "health": "GET /health - Health check",
    "demo": "GET /demo - This demo information"
  }
}
```

### 4. Tenants (`GET /tenants`) - Production Only
**Available products/tenants in the system**

### 5. Statistics (`GET /stats`) - Production Only
**System statistics and metrics**

## 🎯 Swagger Features

### Interactive API Explorer
- **Try it out** functionality for all endpoints
- **Real-time testing** with live server responses
- **Request/response examples** for all scenarios
- **Schema validation** with detailed error messages

### Comprehensive Schemas
- **QueryRequest**: Input validation and examples
- **QueryResponse**: Complete response structure
- **ErrorResponse**: Standardized error handling
- **HealthResponse**: System status information
- **TenantsResponse**: Multi-tenant data structure
- **StatsResponse**: System analytics
- **DemoResponse**: Demo mode information

### Multiple Examples
Each endpoint includes multiple example scenarios:
- **RAG Queries**: Support ticket retrieval
- **Analytics Queries**: Data visualization requests
- **Combined Queries**: Both RAG and analytics
- **Multi-tenant Queries**: Product-specific requests
- **Error Scenarios**: Invalid requests and server errors

## 🔧 Swagger Configuration

### Custom Styling
```javascript
swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Customer Support AI Assistant API'
});
```

### OpenAPI 3.0 Specification
- **Complete API description** with all endpoints
- **Detailed request/response schemas**
- **Comprehensive examples** for all scenarios
- **Error handling documentation**
- **Multi-server configuration** (dev/prod)

## 📊 Schema Definitions

### QueryRequest Schema
```yaml
QueryRequest:
  type: object
  required: [query]
  properties:
    query:
      type: string
      description: User query for support assistance or analytics
      example: "How do I fix my iPhone battery issue?"
      minLength: 1
      maxLength: 1000
    tenant:
      type: string
      description: Product/tenant identifier for multi-tenant queries
      example: "iPhone"
      maxLength: 100
```

### QueryResponse Schema
```yaml
QueryResponse:
  type: object
  properties:
    answer:
      type: string
      description: AI-generated response to the user query
    references:
      type: object
      properties:
        ticketIds:
          type: array
          items:
            type: string
          description: Array of ticket IDs referenced in the response
    chart:
      type: object
      description: Chart.js configuration objects for analytics visualization
      nullable: true
    metadata:
      type: object
      properties:
        processingTimeMs:
          type: integer
          description: Time taken to process the query in milliseconds
        timestamp:
          type: string
          format: date-time
          description: ISO timestamp of the response
        tenant:
          type: string
          description: Tenant used for the query
        mode:
          type: string
          description: Server mode (demo or production)
```

## 🎬 Demo Scenarios in Swagger

### 1. RAG Query Demo
**Endpoint:** `POST /query`
**Example:** `{"query": "How do I fix my iPhone battery issue?"}`

**Expected Response:**
```json
{
  "answer": "I found 3 relevant support tickets for your query...",
  "references": {"ticketIds": ["1234", "5678", "9012"]},
  "chart": null,
  "metadata": {
    "processingTimeMs": 1250,
    "timestamp": "2025-09-17T07:41:09.931Z",
    "tenant": "global"
  }
}
```

### 2. Analytics Query Demo
**Endpoint:** `POST /query`
**Example:** `{"query": "Show me ticket statistics and analytics"}`

**Expected Response:**
```json
{
  "answer": "📊 **Analytics Dashboard:**\nI've generated comprehensive analytics...",
  "references": {"ticketIds": []},
  "chart": {
    "statusDistribution": {
      "type": "doughnut",
      "data": {
        "labels": ["Open", "Closed", "Pending"],
        "datasets": [{"data": [45, 35, 20], "backgroundColor": ["#ff6384", "#36a2eb", "#ffce56"]}]
      }
    },
    "priorityDistribution": {
      "type": "bar",
      "data": {
        "labels": ["Critical", "High", "Medium", "Low"],
        "datasets": [{"data": [10, 25, 40, 25], "backgroundColor": ["#dc3545", "#fd7e14", "#ffc107", "#28a745"]}]
      }
    }
  },
  "metadata": {
    "processingTimeMs": 2100,
    "timestamp": "2025-09-17T07:41:16.888Z",
    "tenant": "global"
  }
}
```

### 3. Combined Query Demo
**Endpoint:** `POST /query`
**Example:** `{"query": "What are common GoPro issues and show me the analytics?"}`

**Expected Response:**
```json
{
  "answer": "I found 3 relevant support tickets...\n\n📊 **Analytics Dashboard:**...",
  "references": {"ticketIds": ["1234", "5678", "9012"]},
  "chart": {
    "statusDistribution": {...},
    "priorityDistribution": {...}
  },
  "metadata": {
    "processingTimeMs": 3500,
    "timestamp": "2025-09-17T07:41:23.306Z",
    "tenant": "global"
  }
}
```

## 🔍 Testing with Swagger UI

### Interactive Testing
1. **Navigate to** `http://localhost:3000/api-docs`
2. **Expand** the `/query` endpoint
3. **Click** "Try it out"
4. **Enter** a query in the request body
5. **Click** "Execute"
6. **View** the response in real-time

### Example Test Queries
```json
// Test RAG functionality
{"query": "How do I fix my iPhone battery issue?"}

// Test analytics functionality
{"query": "Show me ticket statistics"}

// Test combined functionality
{"query": "What are common GoPro issues and show analytics?"}

// Test multi-tenancy
{"query": "iPhone problems", "tenant": "iPhone"}
```

## 🎯 Benefits of Swagger Integration

### For Developers
- **Interactive API exploration** without external tools
- **Complete schema documentation** with validation
- **Real-time testing** capabilities
- **Standardized error handling** documentation

### For API Consumers
- **Clear request/response examples**
- **Multiple scenario demonstrations**
- **Error handling guidance**
- **Schema validation** for request building

### For Documentation
- **Self-documenting API** with live examples
- **Consistent documentation** across all endpoints
- **Version-controlled** API specifications
- **Professional presentation** for stakeholders

## 🚀 Production Deployment

### Environment Configuration
```bash
# Production server with Swagger
NODE_ENV=production npm start

# Access production Swagger docs
http://localhost:3000/api-docs
```

### Security Considerations
- **No authentication** required in demo mode
- **Rate limiting** can be added for production
- **API key authentication** can be integrated
- **CORS configuration** for cross-origin requests

## 📈 Future Enhancements

### Planned Features
- **Authentication schemas** for production use
- **Rate limiting documentation**
- **Webhook endpoint documentation**
- **Real-time streaming** endpoint specs
- **Batch processing** endpoint documentation

### Integration Options
- **Postman collection** generation
- **API client SDK** generation
- **Testing framework** integration
- **Monitoring dashboard** integration

## 🎉 Summary

The Swagger integration provides:

✅ **Complete API Documentation** with interactive exploration
✅ **Real-time Testing** capabilities for all endpoints  
✅ **Comprehensive Schemas** with validation
✅ **Multiple Examples** for all use cases
✅ **Professional Presentation** for stakeholders
✅ **Developer-Friendly** interface for API consumption
✅ **Self-Documenting** API with live examples
✅ **Standardized Error Handling** documentation

The Customer Support AI Assistant now has enterprise-grade API documentation that makes it easy for developers to understand, test, and integrate with the system! 🚀
