#!/usr/bin/env node

/**
 * HTTP Server for Real MCP Weather Server
 * 
 * Uses the official StreamableHTTPServerTransport from @modelcontextprotocol/sdk
 * to expose the MCP server over HTTP for web applications.
 */

const express = require('express');
const { randomUUID } = require('node:crypto');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const RealMCPWeatherServer = require('./real-mcp-weather-server');

class RealMCPHTTPServer {
  constructor() {
    this.app = express();
    this.transports = {}; // Map to store transports by session ID
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());

    // CORS middleware for browser compatibility
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-session-id');
      res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path} ${req.headers['mcp-session-id'] ? `(session: ${req.headers['mcp-session-id']})` : ''}`);
      next();
    });
  }

  setupRoutes() {
    // Main MCP endpoint - handles all MCP protocol communication
    this.app.post('/mcp', async (req, res) => {
      try {
        await this.handleMCPRequest(req, res);
      } catch (error) {
        console.error('[HTTP] Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // Handle GET requests for server-to-client notifications via SSE
    this.app.get('/mcp', async (req, res) => {
      await this.handleSessionRequest(req, res);
    });

    // Handle DELETE requests for session termination
    this.app.delete('/mcp', async (req, res) => {
      await this.handleSessionRequest(req, res);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'streamable-http',
        protocol: 'MCP',
        timestamp: new Date().toISOString(),
        sessions: Object.keys(this.transports).length
      });
    });

    // Root documentation
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Real MCP Weather Server with Streamable HTTP Transport',
        protocol: 'Model Context Protocol (MCP)',
        transport: 'Streamable HTTP',
        claude_integration: true,
        endpoints: {
          'POST /mcp': 'Send MCP requests (initialize, tools/list, tools/call, etc.)',
          'GET /mcp': 'Open SSE stream for server-to-client notifications',
          'DELETE /mcp': 'Terminate MCP session',
          'GET /health': 'Health check'
        },
        tools: [
          'get_weather - Get current weather with AI analysis',
          'get_forecast - Get weather forecast with insights',
          'get_weather_by_coords - Get weather by coordinates',
          'geocode_city - Get geographic coordinates for a city',
          'ask_weather_question - Ask AI-powered weather questions'
        ],
        examples: {
          'Initialize': `POST ${req.protocol}://${req.get('host')}/mcp`,
          'Get Weather': 'Use tools/call with name: get_weather',
          'Ask Question': 'Use tools/call with name: ask_weather_question'
        }
      });
    });
  }

  async handleMCPRequest(req, res) {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && this.transports[sessionId]) {
      // Reuse existing transport
      transport = this.transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          this.transports[sessionId] = transport;
          console.log(`[HTTP] New MCP session initialized: ${sessionId}`);
        },
        // Enable DNS rebinding protection for security but allow localhost variants
        enableDnsRebindingProtection: true,
        allowedHosts: ['127.0.0.1', 'localhost', '127.0.0.1:3001', 'localhost:3001'],
        allowedOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://localhost:3001']
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`[HTTP] Session closed: ${transport.sessionId}`);
          delete this.transports[transport.sessionId];
        }
      };

      // Create a new MCP server instance for this session
      const mcpServer = new RealMCPWeatherServer();

      // Connect to the MCP server
      await mcpServer.getServer().connect(transport);
      console.log(`[HTTP] MCP server connected to transport`);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided or not an initialize request',
        },
        id: null,
      });
      return;
    }

    // Handle the request using the transport
    await transport.handleRequest(req, res, req.body);
  }

  async handleSessionRequest(req, res) {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
  }

  async start(port = 3001) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`[HTTP] Real MCP Server with Streamable HTTP transport running on http://localhost:${port}`);
        console.log(`[HTTP] Protocol: Model Context Protocol (MCP)`);
        console.log(`[HTTP] Transport: Streamable HTTP`);
        console.log(`[HTTP] Claude Integration: Enabled`);
        console.log(`[HTTP] API Documentation: http://localhost:${port}/`);
        console.log(`[HTTP] Health Check: http://localhost:${port}/health`);
        console.log('🌍 Web apps can now connect to this MCP server!');
        console.log('🖥️  For Claude Desktop, use: node mcp-server/real-mcp-weather-server.js --stdio');
        resolve();
      });
    });
  }

  async close() {
    if (this.server) {
      return new Promise((resolve) => {
        // Close all transports
        Object.values(this.transports).forEach(transport => {
          try {
            transport.close();
          } catch (error) {
            console.warn('Error closing transport:', error);
          }
        });
        this.transports = {};

        this.server.close(() => {
          console.log('[HTTP] Server stopped');
          resolve();
        });
      });
    }
  }
}

// If this file is run directly, start the HTTP server
if (require.main === module) {
  async function main() {
    try {
      const httpServer = new RealMCPHTTPServer();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n⏹️  Shutting down Real MCP HTTP server...');
        await httpServer.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n⏹️  Shutting down Real MCP HTTP server...');
        await httpServer.close();
        process.exit(0);
      });

      const port = process.env.MCP_SERVER_PORT || 3001;
      await httpServer.start(port);

    } catch (error) {
      console.error('❌ Failed to start Real MCP HTTP server:', error);
      process.exit(1);
    }
  }

  main();
}

module.exports = RealMCPHTTPServer; 