#!/usr/bin/env node

/**
 * Start Weather MCP Server with REST Transport
 * 
 * This is the entry point that creates and starts the MCP server
 * with the REST transport adapter.
 */

const WeatherMCPServer = require('./weather-mcp-server');
const RESTTransportAdapter = require('./rest-transport');

async function startServer() {
  try {
    // Create the core MCP server
    const mcpServer = new WeatherMCPServer();

    // Create REST transport adapter
    const restTransport = new RESTTransportAdapter(mcpServer, {
      port: 3001,  // MCP server on port 3001
      basePath: '/mcp'
    });

    // Start the server
    await restTransport.start();

    console.log('🌤️  Weather MCP Server is ready!');
    console.log('📋 Available tools:', (await mcpServer.listTools()).tools.map(t => t.name).join(', '));
    console.log('');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down MCP server...');
      await restTransport.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Shutting down MCP server...');
      await restTransport.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer }; 