/**
 * REST Transport Adapter for MCP Server
 * 
 * Provides RESTful HTTP endpoints that map to MCP method calls.
 * This allows the MCP server to be used via standard HTTP requests.
 */

const express = require('express');

class RESTTransportAdapter {
  constructor(mcpServer, options = {}) {
    this.mcpServer = mcpServer;
    this.app = express();
    this.port = options.port || 3001;
    this.basePath = options.basePath || '/mcp';

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      // Add CORS headers
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
      console.log(`[REST] ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    const router = express.Router();

    // Server info endpoint
    router.get('/info', async (req, res) => {
      try {
        const info = this.mcpServer.getServerInfo();
        res.json(info);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Initialize endpoint (MCP handshake)
    router.post('/initialize', async (req, res) => {
      try {
        const result = await this.mcpServer.processRequest('initialize', req.body);
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // List tools endpoint
    router.get('/tools', async (req, res) => {
      try {
        const result = await this.mcpServer.processRequest('tools/list', {});
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Call tool endpoint
    router.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const args = req.body;

        const result = await this.mcpServer.processRequest('tools/call', {
          name: toolName,
          arguments: args
        });

        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Generic MCP method endpoint
    router.post('/call', async (req, res) => {
      try {
        const { method, params } = req.body;
        const result = await this.mcpServer.processRequest(method, params);
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Convenience weather endpoints (RESTful style)
    router.get('/weather/:city', async (req, res) => {
      try {
        const { city } = req.params;
        const result = await this.mcpServer.callTool('get_weather', { city });
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/forecast/:city', async (req, res) => {
      try {
        const { city } = req.params;
        const { days = 7 } = req.query;
        const result = await this.mcpServer.callTool('get_forecast', {
          city,
          days: parseInt(days)
        });
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/geocode/:city', async (req, res) => {
      try {
        const { city } = req.params;
        const { count = 1 } = req.query;
        const result = await this.mcpServer.callTool('geocode_city', {
          city,
          count: parseInt(count)
        });
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/weather/coords/:lat/:lon', async (req, res) => {
      try {
        const { lat, lon } = req.params;
        const { days = 1 } = req.query;
        const result = await this.mcpServer.callTool('get_weather_by_coords', {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          days: parseInt(days)
        });
        res.json(result);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Health check
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: this.mcpServer.getServerInfo()
      });
    });

    // Mount router
    this.app.use(this.basePath, router);

    // API documentation endpoint
    this.app.get('/', (req, res) => {
      const info = this.mcpServer.getServerInfo();
      res.json({
        message: 'Weather MCP Server REST API',
        server: info,
        endpoints: {
          'GET /mcp/info': 'Get server information',
          'POST /mcp/initialize': 'Initialize MCP connection',
          'GET /mcp/tools': 'List available tools',
          'POST /mcp/tools/:toolName': 'Call a specific tool',
          'POST /mcp/call': 'Generic MCP method call',
          'GET /mcp/weather/:city': 'Get current weather for city',
          'GET /mcp/forecast/:city?days=N': 'Get forecast for city',
          'GET /mcp/geocode/:city?count=N': 'Geocode city name',
          'GET /mcp/weather/coords/:lat/:lon?days=N': 'Get weather by coordinates',
          'GET /mcp/health': 'Health check'
        },
        examples: {
          weather: `${req.protocol}://${req.get('host')}/mcp/weather/London`,
          forecast: `${req.protocol}://${req.get('host')}/mcp/forecast/Paris?days=5`,
          geocode: `${req.protocol}://${req.get('host')}/mcp/geocode/Tokyo`,
          coordinates: `${req.protocol}://${req.get('host')}/mcp/weather/coords/40.7128/-74.0060`
        }
      });
    });
  }

  handleError(res, error) {
    console.error('[REST] Error:', error);
    res.status(500).json({
      error: error.message,
      type: 'server_error',
      timestamp: new Date().toISOString()
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`[REST] Weather MCP Server running on http://localhost:${this.port}`);
        console.log(`[REST] API Documentation: http://localhost:${this.port}/`);
        console.log(`[REST] MCP Base Path: http://localhost:${this.port}${this.basePath}`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('[REST] Server stopped');
          resolve();
        });
      });
    }
  }
}

module.exports = RESTTransportAdapter; 