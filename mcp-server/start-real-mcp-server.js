#!/usr/bin/env node

/**
 * Start Real MCP Weather Server with HTTP Transport
 * 
 * This creates a proper MCP server using the official SDK
 * with our custom HTTP transport for web compatibility.
 */

const RealMCPWeatherServer = require('./real-mcp-server');
const HTTPServerTransport = require('./http-transport');

async function startRealMCPServer() {
  try {
    console.log('🚀 Starting Real MCP Weather Server...');

    // Create the real MCP server
    const mcpServer = new RealMCPWeatherServer();

    // Create HTTP transport
    const httpTransport = new HTTPServerTransport({
      port: 3001,
      basePath: '/mcp'
    });

    // Start HTTP server
    await httpTransport.start();

    // Connect MCP server to HTTP transport
    await mcpServer.connect(httpTransport);

    console.log('✅ Real MCP Server with HTTP transport is ready!');
    console.log('🌍 Web apps can access via HTTP');
    console.log('🖥️  Desktop apps can access via stdio');
    console.log('');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      await httpTransport.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      await httpTransport.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Real MCP server:', error);
    process.exit(1);
  }
}

// For stdio transport (Claude Desktop compatibility)
async function startStdioMCPServer() {
  try {
    const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

    console.error('🖥️  Starting MCP server with stdio transport for Claude Desktop...');

    const mcpServer = new RealMCPWeatherServer();
    const stdioTransport = new StdioServerTransport();

    await mcpServer.connect(stdioTransport);
    console.error('✅ Real MCP Server with stdio transport is ready!');

  } catch (error) {
    console.error('❌ Failed to start stdio MCP server:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--stdio')) {
  // Start with stdio transport for Claude Desktop
  startStdioMCPServer();
} else {
  // Start with HTTP transport for web apps (default)
  startRealMCPServer();
}

module.exports = { startRealMCPServer, startStdioMCPServer }; 