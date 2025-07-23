/**
 * HTTP Transport for MCP Server
 * 
 * Custom transport that implements the MCP transport interface
 * to allow HTTP/REST access to a real MCP server.
 */

const express = require('express');
const { EventEmitter } = require('events');

class HTTPServerTransport extends EventEmitter {
  constructor(options = {}) {
    super();

    this.app = express();
    this.port = options.port || 3001;
    this.basePath = options.basePath || '/mcp';
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[HTTP Transport] ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    const router = express.Router();

    // MCP initialization endpoint
    router.post('/initialize', async (req, res) => {
      try {
        const request = {
          method: 'initialize',
          params: req.body
        };

        const response = await this.sendRequest(request);
        res.json(response);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // List tools endpoint  
    router.get('/tools', async (req, res) => {
      try {
        const request = {
          method: 'tools/list',
          params: {}
        };

        const response = await this.sendRequest(request);
        res.json(response);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Call tool endpoint
    router.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const request = {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: req.body
          }
        };

        const response = await this.sendRequest(request);
        res.json(response);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Generic MCP method endpoint
    router.post('/call', async (req, res) => {
      try {
        const { method, params } = req.body;
        const request = { method, params };

        const response = await this.sendRequest(request);
        res.json(response);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Server info endpoint
    router.get('/info', async (req, res) => {
      try {
        const request = {
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'http-transport-client',
              version: '1.0.0'
            }
          }
        };

        const response = await this.sendRequest(request);
        res.json(response.serverInfo || response);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Health check
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'http',
        timestamp: new Date().toISOString()
      });
    });

    // Mount router
    this.app.use(this.basePath, router);

    // Root documentation
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Real MCP Server with HTTP Transport',
        transport: 'HTTP',
        protocol: 'Model Context Protocol (MCP)',
        endpoints: {
          'POST /mcp/initialize': 'Initialize MCP connection',
          'GET /mcp/tools': 'List available tools',
          'POST /mcp/tools/:toolName': 'Call a specific tool',
          'POST /mcp/call': 'Generic MCP method call',
          'GET /mcp/info': 'Get server information',
          'GET /mcp/health': 'Health check'
        },
        examples: {
          'List Tools': `GET ${req.protocol}://${req.get('host')}/mcp/tools`,
          'Get Weather': `POST ${req.protocol}://${req.get('host')}/mcp/tools/get_weather`,
          'Ask Question': `POST ${req.protocol}://${req.get('host')}/mcp/tools/ask_weather_question`
        }
      });
    });
  }

  // MCP Transport Interface Implementation
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`[HTTP Transport] MCP Server running on http://localhost:${this.port}`);
        console.log(`[HTTP Transport] API Documentation: http://localhost:${this.port}/`);
        console.log(`[HTTP Transport] MCP Base Path: http://localhost:${this.port}${this.basePath}`);
        resolve();
      });
    });
  }

  async close() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('[HTTP Transport] Server stopped');
          resolve();
        });
      });
    }
  }

  // Send request to MCP server (this will be called by the MCP server)
  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      // Create a unique request ID
      const requestId = Date.now().toString();

      // Set up one-time response listener
      const responseHandler = (response) => {
        if (response.id === requestId) {
          this.off('response', responseHandler);
          resolve(response.result);
        }
      };

      const errorHandler = (error) => {
        if (error.id === requestId) {
          this.off('error', errorHandler);
          reject(new Error(error.error.message));
        }
      };

      this.on('response', responseHandler);
      this.on('error', errorHandler);

      // Emit the request (MCP server will handle it)
      this.emit('message', {
        ...request,
        id: requestId
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.off('response', responseHandler);
        this.off('error', errorHandler);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }

  // Send response back (called by MCP server)
  sendResponse(response) {
    this.emit('response', response);
  }

  sendError(error) {
    this.emit('error', error);
  }

  handleError(res, error) {
    console.error('[HTTP Transport] Error:', error);
    res.status(500).json({
      error: error.message,
      type: 'transport_error',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = HTTPServerTransport; 