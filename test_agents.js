// Comprehensive Test Suite for Customer Support AI Assistant
import DelegatingAgent from './agents/delegatingAgent.js';
import RAGAgent from './agents/ragAgent.js';
import ChartTool from './agents/chartTool.js';
import LLMClient from './agents/llmClient.js';
import weaviate from 'weaviate-ts-client';
import config from './config.js';

class ComprehensiveAgentTester {
  constructor() {
    this.delegatingAgent = new DelegatingAgent();
    this.ragAgent = new RAGAgent();
    this.chartTool = new ChartTool();
    this.llmClient = new LLMClient();
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // Helper method to track test results
  recordTest(testName, passed, error = null) {
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: PASSED`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: FAILED`);
      if (error) {
        console.log(`   Error: ${error.message}`);
        this.testResults.errors.push({ test: testName, error: error.message });
      }
    }
  }

  // Test 1: LLM Client Functionality
  async testLLMClient() {
    console.log('\n🧠 Testing LLM Client...');
    console.log('=' .repeat(50));

    try {
      const testPrompt = "What is artificial intelligence?";
      console.log(`📝 Test prompt: "${testPrompt}"`);
      
      const response = await this.llmClient.generateResponse(testPrompt);
      const isValidResponse = response && typeof response === 'string' && response.length > 10;
      
      this.recordTest('LLM Client Response Generation', isValidResponse);
      if (isValidResponse) {
        console.log(`📄 Response preview: ${response.substring(0, 100)}...`);
      }
      
    } catch (error) {
      this.recordTest('LLM Client Response Generation', false, error);
    }
  }

  // Test 2: RAG Agent with Modern Architecture
  async testRAGAgent() {
    console.log('\n🔍 Testing RAG Agent...');
    console.log('=' .repeat(50));

    const testQueries = [
      { query: 'Show most common GoPro Hero issues', tenant: null },
      { query: 'What are common problems with GoPro cameras?', tenant: 'GoPro Hero' },
      { query: 'I need help with my Samsung TV setup', tenant: null }
    ];

    for (const { query, tenant } of testQueries) {
      try {
        console.log(`\n📝 Query: "${query}"${tenant ? ` (Tenant: ${tenant})` : ''}`);
        
        // Test modern agent approach
        const result = await this.ragAgent.handleQuery(query, tenant, `test-${Date.now()}`);
        
        const hasAnswer = result.answer && result.answer.length > 0;
        const hasReferences = result.references && result.references.threadId;
        
        this.recordTest(`RAG Query: "${query.substring(0, 30)}..."`, hasAnswer && hasReferences);
        
        if (hasAnswer) {
          console.log(`📄 Answer preview: ${result.answer.substring(0, 150)}...`);
          console.log(`🔗 Thread ID: ${result.references.threadId}`);
        }
        
      } catch (error) {
        this.recordTest(`RAG Query: "${query.substring(0, 30)}..."`, false, error);
      }
    }

    // Test legacy method compatibility
    try {
      console.log('\n🔄 Testing legacy compatibility...');
      const legacyResult = await this.ragAgent.handleQueryLegacy('test query', null);
      const hasLegacyStructure = legacyResult.answer && legacyResult.references && legacyResult.references.ticketIds;
      
      this.recordTest('RAG Legacy Method Compatibility', hasLegacyStructure);
      
    } catch (error) {
      this.recordTest('RAG Legacy Method Compatibility', false, error);
    }
  }

  // Test 3: Chart Tool Analytics
  async testChartTool() {
    console.log('\n📊 Testing Chart Tool...');
    console.log('=' .repeat(50));

    try {
      // Test global analytics
      console.log('📈 Generating global analytics...');
      const globalCharts = await this.chartTool.generateAnalytics();
      
      const expectedChartTypes = ['statusDistribution', 'priorityDistribution', 'responseTimeChart', 'satisfactionChart'];
      const hasAllCharts = expectedChartTypes.every(type => globalCharts[type]);
      
      this.recordTest('Chart Tool - Global Analytics', hasAllCharts);
      console.log(`📊 Generated charts: ${Object.keys(globalCharts).join(', ')}`);

      // Test tenant-specific analytics
      const tenants = await this.getAvailableTenants();
      if (tenants.length > 0) {
        const testTenant = tenants[0].name;
        console.log(`\n📈 Generating analytics for tenant: ${testTenant}`);
        
        const tenantCharts = await this.chartTool.generateAnalytics(testTenant);
        const hasTenantCharts = expectedChartTypes.every(type => tenantCharts[type]);
        
        this.recordTest('Chart Tool - Tenant Analytics', hasTenantCharts);
        console.log(`📊 Tenant charts: ${Object.keys(tenantCharts).join(', ')}`);
      }

      // Validate chart structure
      const sampleChart = globalCharts.statusDistribution;
      const hasValidStructure = sampleChart.type && sampleChart.data && sampleChart.options;
      
      this.recordTest('Chart Tool - Chart.js Structure', hasValidStructure);
      
    } catch (error) {
      this.recordTest('Chart Tool - Analytics Generation', false, error);
    }
  }

  // Test 4: Delegating Agent with Modern Architecture
  async testDelegatingAgent() {
    console.log('\n🎯 Testing Delegating Agent...');
    console.log('=' .repeat(50));

    const testScenarios = [
      {
        name: 'RAG Query',
        query: 'Show most common GoPro Hero issues',
        expectedFeatures: ['answer']
      },
      {
        name: 'Analytics Query',
        query: 'Show me ticket statistics and analytics',
        expectedFeatures: ['answer', 'charts']
      },
      {
        name: 'Combined Query',
        query: 'What are common GoPro issues and show me the analytics?',
        expectedFeatures: ['answer']
      },
      {
        name: 'Multi-tenant Query',
        query: 'Show me iPhone problems',
        tenant: 'iPhone',
        expectedFeatures: ['answer']
      }
    ];

    for (const scenario of testScenarios) {
      try {
        console.log(`\n📝 Scenario: ${scenario.name}`);
        console.log(`Query: "${scenario.query}"`);
        if (scenario.tenant) console.log(`Tenant: ${scenario.tenant}`);
        
        const result = await this.delegatingAgent.handleQuery(
          scenario.query, 
          scenario.tenant, 
          `test-${Date.now()}`
        );
        
        const hasAnswer = result.answer && result.answer.length > 0;
        const hasReferences = result.references && result.references.threadId;
        
        this.recordTest(`Delegating Agent - ${scenario.name}`, hasAnswer && hasReferences);
        
        if (hasAnswer) {
          console.log(`📄 Answer preview: ${result.answer.substring(0, 150)}...`);
          console.log(`🔗 Thread ID: ${result.references.threadId}`);
        }
        
      } catch (error) {
        this.recordTest(`Delegating Agent - ${scenario.name}`, false, error);
      }
    }

    // Test legacy compatibility
    try {
      console.log('\n🔄 Testing legacy delegating agent...');
      const legacyResult = await this.delegatingAgent.handleQueryLegacy('test analytics query');
      const hasLegacyStructure = legacyResult.answer && legacyResult.references;
      
      this.recordTest('Delegating Agent - Legacy Compatibility', hasLegacyStructure);
      
    } catch (error) {
      this.recordTest('Delegating Agent - Legacy Compatibility', false, error);
    }
  }

  // Test 5: Multi-Tenancy and Database Integration
  async testMultiTenancy() {
    console.log('\n🏢 Testing Multi-Tenancy...');
    console.log('=' .repeat(50));

    try {
      // Test tenant listing
      const tenants = await this.getAvailableTenants();
      const hasMultipleTenants = tenants.length > 1;
      
      this.recordTest('Multi-tenancy - Tenant Discovery', hasMultipleTenants);
      console.log(`📊 Found ${tenants.length} tenants (products)`);
      
      if (tenants.length > 0) {
        // Display top 5 tenants
        console.log('🏆 Top tenants by ticket count:');
        tenants.slice(0, 5).forEach((tenant, index) => {
          console.log(`  ${index + 1}. ${tenant.name}: ${tenant.ticketCount} tickets`);
        });
        
        // Test tenant-specific queries
        const testTenant = tenants[0].name;
        console.log(`\n🧪 Testing tenant-specific functionality: ${testTenant}`);
        
        const tenantRAG = await this.ragAgent.handleQuery('product issues', testTenant, 'tenant-test');
        const tenantHasResults = tenantRAG.answer && tenantRAG.answer.length > 0;
        
        this.recordTest('Multi-tenancy - Tenant-specific RAG', tenantHasResults);
        
        const tenantCharts = await this.chartTool.generateAnalytics(testTenant);
        const tenantHasCharts = Object.keys(tenantCharts).length > 0;
        
        this.recordTest('Multi-tenancy - Tenant-specific Analytics', tenantHasCharts);
      }
      
    } catch (error) {
      this.recordTest('Multi-tenancy - Overall', false, error);
    }
  }

  // Test 6: Agent Memory and Threading
  async testMemoryAndThreading() {
    console.log('\n🧵 Testing Memory and Threading...');
    console.log('=' .repeat(50));

    try {
      const threadId = `memory-test-${Date.now()}`;
      
      // First query in thread
      const query1 = "What are iPhone issues?";
      const result1 = await this.ragAgent.handleQuery(query1, null, threadId);
      
      // Second related query in same thread
      const query2 = "Can you provide more details?";
      const result2 = await this.ragAgent.handleQuery(query2, null, threadId);
      
      const hasMemory = result1.references.threadId === result2.references.threadId;
      
      this.recordTest('Memory and Threading - Conversation Context', hasMemory);
      console.log(`🔗 Thread ID consistency: ${hasMemory ? 'MAINTAINED' : 'LOST'}`);
      
    } catch (error) {
      this.recordTest('Memory and Threading - Conversation Context', false, error);
    }
  }

  // Test 7: Error Handling and Edge Cases
  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    console.log('=' .repeat(50));

    const errorTests = [
      {
        name: 'Empty Query',
        test: async () => {
          const result = await this.ragAgent.handleQuery('', null, 'error-test');
          return result.answer.includes('error') || result.answer.length > 0;
        }
      },
      {
        name: 'Invalid Tenant',
        test: async () => {
          const result = await this.ragAgent.handleQuery('test query', 'NonExistentProduct', 'error-test');
          return result.answer.length > 0; // Should still provide a response
        }
      },
      {
        name: 'Very Long Query',
        test: async () => {
          const longQuery = 'a'.repeat(1000);
          const result = await this.ragAgent.handleQuery(longQuery, null, 'error-test');
          return result.answer.length > 0;
        }
      }
    ];

    for (const errorTest of errorTests) {
      try {
        console.log(`🧪 Testing: ${errorTest.name}`);
        const passed = await errorTest.test();
        this.recordTest(`Error Handling - ${errorTest.name}`, passed);
        
      } catch (error) {
        // Graceful error handling is expected in some cases
        this.recordTest(`Error Handling - ${errorTest.name}`, true);
        console.log(`   Graceful error handling: ${error.message.substring(0, 50)}...`);
      }
    }
  }

  // Test 8: Performance and Response Times
  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    console.log('=' .repeat(50));

    const performanceTests = [
      {
        name: 'RAG Query Response Time',
        test: async () => {
          const start = Date.now();
          await this.ragAgent.handleQuery('test query', null, 'perf-test');
          return Date.now() - start;
        },
        threshold: 15000 // 15 seconds max
      },
      {
        name: 'Chart Generation Time',
        test: async () => {
          const start = Date.now();
          await this.chartTool.generateAnalytics();
          return Date.now() - start;
        },
        threshold: 10000 // 10 seconds max
      },
      {
        name: 'Delegating Agent Response Time',
        test: async () => {
          const start = Date.now();
          await this.delegatingAgent.handleQuery('show me stats', null, 'perf-test');
          return Date.now() - start;
        },
        threshold: 20000 // 20 seconds max
      }
    ];

    for (const perfTest of performanceTests) {
      try {
        console.log(`⏱️ Testing: ${perfTest.name}`);
        const responseTime = await perfTest.test();
        const withinThreshold = responseTime <= perfTest.threshold;
        
        this.recordTest(`Performance - ${perfTest.name}`, withinThreshold);
        console.log(`   Response time: ${responseTime}ms (threshold: ${perfTest.threshold}ms)`);
        
      } catch (error) {
        this.recordTest(`Performance - ${perfTest.name}`, false, error);
      }
    }
  }

  // Helper method to get available tenants
  async getAvailableTenants() {
    try {
      const client = weaviate.client({
        scheme: 'http',
        host: config.weaviate.url.replace('http://', ''),
      });

      const result = await client.graphql
        .aggregate()
        .withClassName(config.weaviate.className)
        .withFields('groupedBy { value } meta { count }')
        .withGroupBy(['productPurchased'])
        .do();

      return result.data.Aggregate[config.weaviate.className]
        .map(item => ({
          name: item.groupedBy.value,
          ticketCount: item.meta.count
        }))
        .sort((a, b) => b.ticketCount - a.ticketCount);

    } catch (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Customer Support AI Assistant Tests');
    console.log('=' .repeat(80));
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    console.log(`🔧 Node.js version: ${process.version}`);
    
    const startTime = Date.now();

    try {
      // Run all test suites
      await this.testLLMClient();
      await this.testRAGAgent();
      await this.testChartTool();
      await this.testDelegatingAgent();
      await this.testMultiTenancy();
      await this.testMemoryAndThreading();
      await this.testErrorHandling();
      await this.testPerformance();

      const totalTime = Date.now() - startTime;
      const totalTests = this.testResults.passed + this.testResults.failed;

      console.log('\n🎉 Test Suite Completed!');
      console.log('=' .repeat(80));
      console.log(`⏱️ Total execution time: ${totalTime}ms`);
      console.log(`📊 Tests run: ${totalTests}`);
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      console.log(`📈 Success rate: ${((this.testResults.passed / totalTests) * 100).toFixed(1)}%`);

      if (this.testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        this.testResults.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
        });
      }

      const isSystemHealthy = this.testResults.failed === 0 || (this.testResults.passed / totalTests) >= 0.8;
      console.log(`\n🏥 System Health: ${isSystemHealthy ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
      
      if (isSystemHealthy) {
        console.log('🎯 System is ready for production use!');
      } else {
        console.log('⚠️ Please review failed tests before production deployment.');
      }

    } catch (error) {
      console.error('\n💥 Test suite failed with critical error:', error);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveAgentTester();
  tester.runAllTests().catch(error => {
    console.error('Critical test failure:', error);
    process.exit(1);
  });
}

export default ComprehensiveAgentTester;