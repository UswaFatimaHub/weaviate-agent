// Chart.js Tool for generating analytics visualizations
import weaviate from 'weaviate-ts-client';
import config from '../config.js';

class ChartTool {
  constructor() {
    this.client = weaviate.client({
      scheme: 'http',
      host: config.weaviate.url.replace('http://', ''),
    });
  }

  // FR-6: Generate visualizations for ticket analytics
  async generateAnalytics(tenant = null) {
    try {
      console.log(`📊 Chart Tool generating analytics${tenant ? ` for tenant: ${tenant}` : ' (global)'}`);

      const analytics = await this.getAnalyticsData(tenant);
      
      const charts = {
        statusDistribution: this.createStatusChart(analytics.statusDistribution),
        priorityDistribution: this.createPriorityChart(analytics.priorityDistribution),
        responseTimeChart: this.createResponseTimeChart(analytics.responseTimeStats),
        satisfactionChart: this.createSatisfactionChart(analytics.satisfactionStats)
      };

      console.log(`✅ Chart Tool generated ${Object.keys(charts).length} charts`);
      return charts;

    } catch (error) {
      console.error('Chart Tool error:', error);
      return this.getErrorChart('Failed to generate analytics');
    }
  }

  // Get analytics data from Weaviate
  async getAnalyticsData(tenant = null) {
    const baseQuery = this.client.graphql
      .get()
      .withClassName(config.weaviate.className)
      .withFields('ticketStatus ticketPriority firstResponseTime timeToResolution customerSatisfactionRating');

    let query = baseQuery;
    
    if (tenant) {
      query = baseQuery.withWhere({
        path: ['productPurchased'],
        operator: 'Equal',
        valueText: tenant
      });
    }

    // Get all tickets for analytics
    const result = await query.withLimit(10000).do();
    const tickets = result.data.Get[config.weaviate.className] || [];

    return this.processAnalyticsData(tickets);
  }

  // Process raw ticket data into analytics
  processAnalyticsData(tickets) {
    const statusDistribution = {};
    const priorityDistribution = {};
    const responseTimes = [];
    const resolutionTimes = [];
    const satisfactionRatings = [];

    tickets.forEach(ticket => {
      // Status distribution
      const status = ticket.ticketStatus || 'Unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      // Priority distribution
      const priority = ticket.ticketPriority || 'Unknown';
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;

      // Response times (if available)
      if (ticket.firstResponseTime) {
        const responseTime = this.parseTimeToHours(ticket.firstResponseTime);
        if (responseTime !== null) {
          responseTimes.push(responseTime);
        }
      }

      // Resolution times
      if (ticket.timeToResolution) {
        resolutionTimes.push(parseFloat(ticket.timeToResolution));
      }

      // Satisfaction ratings
      if (ticket.customerSatisfactionRating) {
        satisfactionRatings.push(parseFloat(ticket.customerSatisfactionRating));
      }
    });

    return {
      statusDistribution,
      priorityDistribution,
      responseTimeStats: this.calculateTimeStats(responseTimes),
      resolutionTimeStats: this.calculateTimeStats(resolutionTimes),
      satisfactionStats: this.calculateSatisfactionStats(satisfactionRatings)
    };
  }

  // Helper to parse time strings to hours
  parseTimeToHours(timeString) {
    try {
      // Handle various time formats
      if (typeof timeString === 'string') {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.getHours() + (date.getMinutes() / 60);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Calculate time statistics
  calculateTimeStats(times) {
    if (times.length === 0) return { average: 0, min: 0, max: 0, count: 0 };
    
    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((acc, time) => acc + time, 0);
    
    return {
      average: Math.round((sum / times.length) * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: times.length
    };
  }

  // Calculate satisfaction statistics
  calculateSatisfactionStats(ratings) {
    if (ratings.length === 0) return { average: 0, distribution: {}, count: 0 };
    
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    const distribution = {};
    
    ratings.forEach(rating => {
      const bucket = Math.floor(rating);
      distribution[bucket] = (distribution[bucket] || 0) + 1;
    });

    return {
      average: Math.round((sum / ratings.length) * 100) / 100,
      distribution,
      count: ratings.length
    };
  }

  // FR-7: Create Chart.js configuration objects
  createStatusChart(statusData) {
    const labels = Object.keys(statusData);
    const data = Object.values(statusData);
    const colors = this.getStatusColors(labels);

    return {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Ticket Status Distribution',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  createPriorityChart(priorityData) {
    const labels = Object.keys(priorityData);
    const data = Object.values(priorityData);
    const colors = this.getPriorityColors(labels);

    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Tickets',
          data: data,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Ticket Priority Distribution',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };
  }

  createResponseTimeChart(timeStats) {
    return {
      type: 'bar',
      data: {
        labels: ['Average', 'Minimum', 'Maximum'],
        datasets: [{
          label: 'Response Time (hours)',
          data: [timeStats.average, timeStats.min, timeStats.max],
          backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
          borderColor: ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Response Time Statistics (${timeStats.count} tickets)`,
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    };
  }

  createSatisfactionChart(satisfactionStats) {
    const labels = Object.keys(satisfactionStats.distribution).sort((a, b) => a - b);
    const data = labels.map(label => satisfactionStats.distribution[label]);
    const colors = labels.map(label => this.getSatisfactionColor(parseInt(label)));

    return {
      type: 'bar',
      data: {
        labels: labels.map(label => `${label} Star${label !== '1' ? 's' : ''}`),
        datasets: [{
          label: 'Number of Ratings',
          data: data,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Customer Satisfaction Distribution (Avg: ${satisfactionStats.average}/5)`,
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };
  }

  // Helper methods for colors
  getStatusColors(labels) {
    const colorMap = {
      'Open': 'rgba(255, 99, 132, 0.8)',
      'Closed': 'rgba(75, 192, 192, 0.8)',
      'Pending Customer Response': 'rgba(255, 205, 86, 0.8)',
      'In Progress': 'rgba(54, 162, 235, 0.8)',
      'Unknown': 'rgba(153, 102, 255, 0.8)'
    };
    return labels.map(label => colorMap[label] || 'rgba(201, 203, 207, 0.8)');
  }

  getPriorityColors(labels) {
    const colorMap = {
      'Critical': 'rgba(220, 53, 69, 0.8)',
      'High': 'rgba(255, 193, 7, 0.8)',
      'Medium': 'rgba(40, 167, 69, 0.8)',
      'Low': 'rgba(23, 162, 184, 0.8)',
      'Unknown': 'rgba(108, 117, 125, 0.8)'
    };
    return labels.map(label => colorMap[label] || 'rgba(201, 203, 207, 0.8)');
  }

  getSatisfactionColor(rating) {
    if (rating >= 4) return 'rgba(40, 167, 69, 0.8)'; // Green
    if (rating >= 3) return 'rgba(255, 193, 7, 0.8)'; // Yellow
    return 'rgba(220, 53, 69, 0.8)'; // Red
  }

  getErrorChart(message) {
    return {
      type: 'doughnut',
      data: {
        labels: ['Error'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(220, 53, 69, 0.8)'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: message,
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    };
  }
}

export default ChartTool;
