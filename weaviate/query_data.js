import weaviate from 'weaviate-ts-client';

// Weaviate client configuration
const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

// Function to get basic statistics
async function getStatistics() {
  try {
    console.log('📊 Getting dataset statistics...\n');

    // Total count
    const countResult = await client.graphql
      .aggregate()
      .withClassName('SupportTicket')
      .withFields('meta { count }')
      .do();

    const totalCount = countResult.data.Aggregate.SupportTicket[0].meta.count;
    console.log(`Total support tickets: ${totalCount}`);

    // Status distribution
    const statusResult = await client.graphql
      .aggregate()
      .withClassName('SupportTicket')
      .withFields('groupedBy { value count }')
      .withGroupBy(['ticketStatus'])
      .do();

    console.log('\n📈 Ticket Status Distribution:');
    statusResult.data.Aggregate.SupportTicket.forEach(item => {
      console.log(`  ${item.groupedBy.value}: ${item.groupedBy.count}`);
    });

    // Priority distribution
    const priorityResult = await client.graphql
      .aggregate()
      .withClassName('SupportTicket')
      .withFields('groupedBy { value count }')
      .withGroupBy(['ticketPriority'])
      .do();

    console.log('\n🎯 Priority Distribution:');
    priorityResult.data.Aggregate.SupportTicket.forEach(item => {
      console.log(`  ${item.groupedBy.value}: ${item.groupedBy.count}`);
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
  }
}

// Function to search for tickets by description
async function searchTickets(searchTerm, limit = 5) {
  try {
    console.log(`\n🔍 Searching for tickets related to: "${searchTerm}"\n`);

    const result = await client.graphql
      .get()
      .withClassName('SupportTicket')
      .withFields('ticketId customerName ticketSubject ticketDescription ticketStatus ticketPriority productPurchased')
      .withNearText({ concepts: [searchTerm] })
      .withLimit(limit)
      .do();

    if (result.data.Get.SupportTicket.length === 0) {
      console.log('No tickets found for this search term.');
      return;
    }

    result.data.Get.SupportTicket.forEach((ticket, index) => {
      console.log(`${index + 1}. Ticket #${ticket.ticketId}`);
      console.log(`   Customer: ${ticket.customerName}`);
      console.log(`   Subject: ${ticket.ticketSubject}`);
      console.log(`   Product: ${ticket.productPurchased}`);
      console.log(`   Status: ${ticket.ticketStatus}`);
      console.log(`   Priority: ${ticket.ticketPriority}`);
      console.log(`   Description: ${ticket.ticketDescription.substring(0, 100)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error searching tickets:', error);
  }
}

// Function to get tickets by status
async function getTicketsByStatus(status, limit = 10) {
  try {
    console.log(`\n📋 Tickets with status: "${status}"\n`);

    const result = await client.graphql
      .get()
      .withClassName('SupportTicket')
      .withFields('ticketId customerName ticketSubject productPurchased ticketPriority')
      .withWhere({
        path: ['ticketStatus'],
        operator: 'Equal',
        valueText: status
      })
      .withLimit(limit)
      .do();

    if (result.data.Get.SupportTicket.length === 0) {
      console.log(`No tickets found with status: ${status}`);
      return;
    }

    result.data.Get.SupportTicket.forEach((ticket, index) => {
      console.log(`${index + 1}. Ticket #${ticket.ticketId} - ${ticket.customerName}`);
      console.log(`   Subject: ${ticket.ticketSubject}`);
      console.log(`   Product: ${ticket.productPurchased}`);
      console.log(`   Priority: ${ticket.ticketPriority}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error getting tickets by status:', error);
  }
}

// Function to get high priority tickets
async function getHighPriorityTickets(limit = 10) {
  try {
    console.log(`\n🚨 High Priority and Critical Tickets\n`);

    const result = await client.graphql
      .get()
      .withClassName('SupportTicket')
      .withFields('ticketId customerName ticketSubject productPurchased ticketStatus ticketPriority')
      .withWhere({
        operator: 'Or',
        operands: [
          {
            path: ['ticketPriority'],
            operator: 'Equal',
            valueText: 'High'
          },
          {
            path: ['ticketPriority'],
            operator: 'Equal',
            valueText: 'Critical'
          }
        ]
      })
      .withLimit(limit)
      .do();

    if (result.data.Get.SupportTicket.length === 0) {
      console.log('No high priority or critical tickets found.');
      return;
    }

    result.data.Get.SupportTicket.forEach((ticket, index) => {
      console.log(`${index + 1}. [${ticket.ticketPriority}] Ticket #${ticket.ticketId}`);
      console.log(`   Customer: ${ticket.customerName}`);
      console.log(`   Subject: ${ticket.ticketSubject}`);
      console.log(`   Product: ${ticket.productPurchased}`);
      console.log(`   Status: ${ticket.ticketStatus}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error getting high priority tickets:', error);
  }
}

// Main function to demonstrate various queries
async function main() {
  try {
    console.log('🎯 Weaviate Support Ticket Query Demo\n');
    console.log('=' .repeat(50));

    // Test connection
    const result = await client.misc.liveChecker().do();
    console.log('✅ Connected to Weaviate\n');

    // Get basic statistics
    await getStatistics();

    console.log('\n' + '=' .repeat(50));
    
    // Search for specific issues
    await searchTickets('product not working');
    
    console.log('=' .repeat(50));
    
    // Get open tickets
    await getTicketsByStatus('Open');
    
    console.log('=' .repeat(50));
    
    // Get high priority tickets
    await getHighPriorityTickets();

    console.log('=' .repeat(50));
    console.log('\n✨ Demo completed! You can now run semantic searches and complex queries on your support ticket data.');
    
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Export functions for use in other modules
export {
  getStatistics,
  searchTickets,
  getTicketsByStatus,
  getHighPriorityTickets
};

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
