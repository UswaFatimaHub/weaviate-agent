import weaviate from 'weaviate-ts-client';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Weaviate client configuration
const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

// CSV file path (now in same directory)
const csvFilePath = path.join(__dirname, 'customer_support_tickets.csv');

// Function to parse date strings
function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  try {
    return new Date(dateString).toISOString();
  } catch (error) {
    console.warn(`Invalid date format: ${dateString}`);
    return null;
  }
}

// Function to parse numeric values
function parseNumber(value) {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

// Function to clean and validate data
function cleanTicketData(row) {
  return {
    ticketId: row['Ticket ID'] || '',
    customerName: row['Customer Name'] || '',
    customerEmail: row['Customer Email'] || '',
    customerAge: parseNumber(row['Customer Age']),
    customerGender: row['Customer Gender'] || '',
    productPurchased: row['Product Purchased'] || '',
    dateOfPurchase: parseDate(row['Date of Purchase']),
    ticketType: row['Ticket Type'] || '',
    ticketSubject: row['Ticket Subject'] || '',
    ticketDescription: row['Ticket Description'] || '',
    ticketStatus: row['Ticket Status'] || '',
    resolution: row['Resolution'] || '',
    ticketPriority: row['Ticket Priority'] || '',
    ticketChannel: row['Ticket Channel'] || '',
    firstResponseTime: parseDate(row['First Response Time']),
    timeToResolution: parseNumber(row['Time to Resolution']),
    customerSatisfactionRating: parseNumber(row['Customer Satisfaction Rating'])
  };
}

// Function to create or verify schema
async function ensureSchema() {
  try {
    // Check if SupportTicket class exists
    const schema = await client.schema.getter().do();
    const existingClass = schema.classes.find(cls => cls.class === 'SupportTicket');
    
    if (existingClass) {
      console.log('SupportTicket class already exists in schema');
      return;
    }

    // Create the schema if it doesn't exist
    const classDefinition = {
      class: 'SupportTicket',
      description: 'Customer support ticket information',
      vectorizer: 'text2vec-transformers',
      moduleConfig: {
        'text2vec-transformers': {
          poolingStrategy: 'masked_mean',
          vectorizeClassName: false
        }
      },
      properties: [
        {
          name: 'ticketId',
          dataType: ['text'],
          description: 'Unique ticket identifier',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'customerName',
          dataType: ['text'],
          description: 'Customer name',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'customerEmail',
          dataType: ['text'],
          description: 'Customer email address',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'customerAge',
          dataType: ['int'],
          description: 'Customer age'
        },
        {
          name: 'customerGender',
          dataType: ['text'],
          description: 'Customer gender',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'productPurchased',
          dataType: ['text'],
          description: 'Product that was purchased',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'dateOfPurchase',
          dataType: ['date'],
          description: 'Date when the product was purchased'
        },
        {
          name: 'ticketType',
          dataType: ['text'],
          description: 'Type of support ticket',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'ticketSubject',
          dataType: ['text'],
          description: 'Subject of the support ticket',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'ticketDescription',
          dataType: ['text'],
          description: 'Detailed description of the issue',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'ticketStatus',
          dataType: ['text'],
          description: 'Current status of the ticket',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'resolution',
          dataType: ['text'],
          description: 'Resolution provided for the ticket',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'ticketPriority',
          dataType: ['text'],
          description: 'Priority level of the ticket',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'ticketChannel',
          dataType: ['text'],
          description: 'Channel through which ticket was created',
          moduleConfig: {
            'text2vec-transformers': {
              skip: false,
              vectorizePropertyName: false
            }
          }
        },
        {
          name: 'firstResponseTime',
          dataType: ['date'],
          description: 'Time of first response to the ticket'
        },
        {
          name: 'timeToResolution',
          dataType: ['number'],
          description: 'Time taken to resolve the ticket (in hours)'
        },
        {
          name: 'customerSatisfactionRating',
          dataType: ['number'],
          description: 'Customer satisfaction rating for the resolution'
        }
      ]
    };

    await client.schema.classCreator().withClass(classDefinition).do();
    console.log('Created SupportTicket class in schema');
  } catch (error) {
    console.error('Error ensuring schema:', error);
    throw error;
  }
}

// Function to import data in batches
async function importData() {
  try {
    console.log('Starting data import...');
    
    // Ensure schema exists
    await ensureSchema();
    
    const batchSize = 50; // Reduced batch size for memory efficiency
    let currentBatch = [];
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    let isPaused = false;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvFilePath)
        .pipe(csv());

      stream.on('data', (row) => {
        try {
          const cleanedData = cleanTicketData(row);
          currentBatch.push(cleanedData);
          
          // Process batch when it reaches the batch size
          if (currentBatch.length >= batchSize) {
            isPaused = true;
            stream.pause(); // Pause the stream to prevent memory buildup
            
            processBatch([...currentBatch]) // Create a copy to avoid reference issues
              .then(() => {
                totalProcessed += currentBatch.length;
                successCount += currentBatch.length;
                console.log(`Processed ${totalProcessed} records...`);
                currentBatch = []; // Clear the batch
                
                // Add a small delay to allow garbage collection
                setTimeout(() => {
                  isPaused = false;
                  stream.resume(); // Resume the stream
                }, 10);
              })
              .catch((error) => {
                console.error('Error processing batch:', error);
                errorCount += currentBatch.length;
                currentBatch = [];
                setTimeout(() => {
                  isPaused = false;
                  stream.resume();
                }, 10);
              });
          }
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      });

      stream.on('end', async () => {
        try {
          // Wait for any pending batch processing
          while (isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Process remaining records in the last batch
          if (currentBatch.length > 0) {
            await processBatch(currentBatch);
            totalProcessed += currentBatch.length;
            successCount += currentBatch.length;
          }
          
          console.log('\n=== Import Summary ===');
          console.log(`Total processed: ${totalProcessed}`);
          console.log(`Successful imports: ${successCount}`);
          console.log(`Errors: ${errorCount}`);
          console.log('Data import completed successfully!');
          resolve();
        } catch (error) {
          console.error('Error processing final batch:', error);
          reject(error);
        }
      });

      stream.on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error in import process:', error);
    throw error;
  }
}

// Function to process a batch of records
async function processBatch(batch) {
  try {
    let batcher = client.batch.objectsBatcher();
    
    for (const record of batch) {
      batcher = batcher.withObject({
        class: 'SupportTicket',
        properties: record
      });
    }
    
    const result = await batcher.do();
    
    // Check for any errors in the batch
    if (result && result.length > 0) {
      for (const item of result) {
        if (item.result && item.result.errors) {
          console.error('Batch error:', item.result.errors);
        }
      }
    }
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
}

// Function to test connection
async function testConnection() {
  try {
    console.log('Testing Weaviate connection...');
    const result = await client.misc.liveChecker().do();
    console.log('✅ Weaviate connection successful');
    return true;
  } catch (error) {
    console.error('❌ Weaviate connection failed:', error.message);
    console.log('Please make sure Weaviate is running with: docker-compose up -d');
    return false;
  }
}

// Main execution function
async function main() {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      process.exit(1);
    }

    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found at: ${csvFilePath}`);
      process.exit(1);
    }

    console.log(`📊 CSV file found: ${csvFilePath}`);
    
    // Start the import process
    await importData();
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { importData, testConnection, ensureSchema };
