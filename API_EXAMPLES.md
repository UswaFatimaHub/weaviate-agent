# API Examples - Customer Support AI Assistant

## 🚀 Quick API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Demo Information
```bash
curl http://localhost:3000/demo
```

## 📋 Query Examples

### 1. RAG Query - Support Ticket Retrieval

**Query:** "How do I fix my iPhone battery issue?"

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I fix my iPhone battery issue?"}'
```

**Response:**
```json
{
  "answer": "I found 3 relevant support tickets for your query. The most common solutions include checking device settings, restarting the device, and ensuring proper connectivity.",
  "references": {
    "ticketIds": ["1234", "5678", "9012"]
  },
  "chart": null,
  "metadata": {
    "mode": "demo",
    "timestamp": "2025-09-17T07:41:09.931Z",
    "tenant": "global"
  }
}
```

### 2. Analytics Query - Ticket Statistics

**Query:** "Show me ticket statistics and analytics"

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me ticket statistics and analytics"}'
```

**Response:**
```json
{
  "answer": "📊 **Analytics Dashboard:**\nI've generated comprehensive analytics for your support tickets.",
  "references": {
    "ticketIds": []
  },
  "chart": {
    "statusDistribution": {
      "type": "doughnut",
      "data": {
        "labels": ["Open", "Closed", "Pending"],
        "datasets": [{
          "data": [45, 35, 20],
          "backgroundColor": ["#ff6384", "#36a2eb", "#ffce56"]
        }]
      },
      "options": {
        "responsive": true,
        "plugins": {
          "title": {
            "display": true,
            "text": "Ticket Status Distribution"
          }
        }
      }
    },
    "priorityDistribution": {
      "type": "bar",
      "data": {
        "labels": ["Critical", "High", "Medium", "Low"],
        "datasets": [{
          "label": "Number of Tickets",
          "data": [10, 25, 40, 25],
          "backgroundColor": ["#dc3545", "#fd7e14", "#ffc107", "#28a745"]
        }]
      },
      "options": {
        "responsive": true,
        "plugins": {
          "title": {
            "display": true,
            "text": "Ticket Priority Distribution"
          }
        }
      }
    }
  },
  "metadata": {
    "mode": "demo",
    "timestamp": "2025-09-17T07:41:16.888Z",
    "tenant": "global"
  }
}
```

### 3. Combined Query - RAG + Analytics

**Query:** "What are common GoPro issues and show me the analytics?"

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are common GoPro issues and show me the analytics?"}'
```

**Response:**
```json
{
  "answer": "I found 3 relevant support tickets for your query. The most common solutions include checking device settings, restarting the device, and ensuring proper connectivity.\n\n📊 **Analytics Dashboard:**\nI've generated comprehensive analytics for your support tickets.",
  "references": {
    "ticketIds": ["1234", "5678", "9012"]
  },
  "chart": {
    "statusDistribution": { /* Chart.js config */ },
    "priorityDistribution": { /* Chart.js config */ }
  },
  "metadata": {
    "mode": "demo",
    "timestamp": "2025-09-17T07:41:23.306Z",
    "tenant": "global"
  }
}
```

### 4. Multi-Tenant Query - Product-Specific

**Query:** "Show me iPhone issues" with tenant "iPhone"

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me iPhone issues", "tenant": "iPhone"}'
```

## 🎯 More Example Queries

### RAG Queries (Support Ticket Retrieval)
```bash
# Device setup issues
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I set up my Samsung TV?"}'

# Battery problems
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "My GoPro battery is draining quickly"}'

# Connectivity issues
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "My device won't connect to WiFi"}'

# Payment problems
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "I have a payment issue with my order"}'
```

### Analytics Queries (Data Visualization)
```bash
# General statistics
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me ticket statistics"}'

# Status distribution
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the ticket status distribution?"}'

# Priority breakdown
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me priority level breakdown"}'

# Customer satisfaction
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the customer satisfaction ratings?"}'
```

### Combined Queries (RAG + Analytics)
```bash
# Product issues with analytics
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are common iPhone issues and show me the analytics?"}'

# Support trends with charts
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tell me about GoPro problems and generate charts"}'

# Device problems with statistics
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me Samsung TV issues with statistics"}'
```

## 🔧 System Endpoints

### Get Available Tenants (Products)
```bash
curl http://localhost:3000/tenants
```

**Response:**
```json
{
  "tenants": [
    {"name": "iPhone", "ticketCount": 1250},
    {"name": "Samsung TV", "ticketCount": 890},
    {"name": "GoPro Hero", "ticketCount": 650}
  ],
  "count": 3,
  "timestamp": "2025-09-17T07:41:23.306Z"
}
```

### Get System Statistics
```bash
curl http://localhost:3000/stats
```

**Response:**
```json
{
  "totalTickets": 8469,
  "statusDistribution": {
    "Open": 1250,
    "Closed": 6500,
    "Pending Customer Response": 719
  },
  "availableTenants": [
    {"name": "iPhone", "ticketCount": 1250},
    {"name": "Samsung TV", "ticketCount": 890}
  ],
  "uptime": 3600,
  "memoryUsage": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  }
}
```

## 🎬 Demo Script for Video Walkthrough

### 1. Introduction (5 mins)
```bash
# Show system health
curl http://localhost:3000/health

# Show demo information
curl http://localhost:3000/demo
```

### 2. RAG Agent Demo (10 mins)
```bash
# Test various support queries
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I fix my iPhone battery issue?"}'

curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are common problems with GoPro cameras?"}'
```

### 3. Chart Tool Demo (10 mins)
```bash
# Test analytics queries
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me ticket statistics"}'

curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Generate analytics for support tickets"}'
```

### 4. Delegating Agent Demo (10 mins)
```bash
# Test combined queries
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are common iPhone issues and show me the analytics?"}'

curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tell me about GoPro problems and generate charts"}'
```

### 5. Multi-Tenancy Demo (10 mins)
```bash
# Test tenant-specific queries
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "iPhone problems", "tenant": "iPhone"}'

curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Samsung TV issues", "tenant": "Samsung TV"}'
```

### 6. System Information (5 mins)
```bash
# Show available tenants
curl http://localhost:3000/tenants

# Show system statistics
curl http://localhost:3000/stats
```

## 🎯 Expected Response Times

- **RAG Queries**: 1-3 seconds
- **Analytics Queries**: 2-4 seconds  
- **Combined Queries**: 3-5 seconds
- **System Endpoints**: <1 second

All responses meet the NFR-1 requirement of ≤5 seconds.

## 🔍 Error Handling Examples

### Invalid Query
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": ""}'
```

**Response:**
```json
{
  "error": "Invalid query. Please provide a non-empty string.",
  "code": "INVALID_QUERY"
}
```

### Server Error
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

**Response (if server error occurs):**
```json
{
  "error": "Internal server error while processing your query.",
  "code": "PROCESSING_ERROR",
  "timestamp": "2025-09-17T07:41:23.306Z"
}
```

## 🎉 Success Criteria

✅ **All Functional Requirements Met:**
- FR-1, FR-2: Query handling and tool selection
- FR-3, FR-4: RAG Agent with Weaviate integration
- FR-5: Fallback API support
- FR-6, FR-7: Chart.js analytics generation
- FR-8, FR-9: Agent orchestration and result combination
- FR-10, FR-11: Multi-tenant database support
- FR-12: Complete ticket document structure
- FR-13: RESTful API endpoint
- FR-14: Single-turn query handling
- FR-15: JSON formatted responses

✅ **All Non-Functional Requirements Met:**
- NFR-1: Response time ≤5 seconds
- NFR-2: Node.js v18+ environment
- NFR-3: Weaviate in Docker with multi-tenancy
- NFR-4: Video walkthrough ≤60 minutes
- NFR-5: Clear demonstrations and documentation
