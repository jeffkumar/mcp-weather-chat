/**
 * Real MCP Weather Server
 * 
 * A proper MCP server using the official @modelcontextprotocol/sdk
 * with Claude AI integration for intelligent weather analysis.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const WeatherService = require('./weather-service');
const ClaudeService = require('./claude-service');
require('dotenv').config();

class RealMCPWeatherServer {
  constructor() {
    // Initialize services
    this.weatherService = new WeatherService();

    // Initialize Claude service
    try {
      this.claudeService = new ClaudeService();
      console.log('🤖 Claude AI service initialized');
    } catch (error) {
      console.warn('⚠️  Claude service not available:', error.message);
      this.claudeService = null;
    }

    // Create real MCP server
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
        description: 'Intelligent weather data and forecasting MCP server powered by Claude AI and Open-Meteo APIs'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools (MCP protocol)
    this.server.setRequestHandler(
      { method: 'tools/list' },
      async () => {
        return {
          tools: [
            {
              name: 'get_weather',
              description: 'Get current weather data with AI-powered analysis and recommendations',
              inputSchema: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'The city name to get weather for',
                  },
                },
                required: ['city'],
              },
            },
            {
              name: 'get_forecast',
              description: 'Get weather forecast with intelligent insights and planning advice',
              inputSchema: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'The city name to get forecast for',
                  },
                  days: {
                    type: 'number',
                    description: 'Number of days to forecast (1-7)',
                    default: 7,
                  },
                },
                required: ['city'],
              },
            },
            {
              name: 'get_weather_by_coords',
              description: 'Get weather data using geographic coordinates with location-specific analysis',
              inputSchema: {
                type: 'object',
                properties: {
                  latitude: {
                    type: 'number',
                    description: 'Latitude coordinate',
                  },
                  longitude: {
                    type: 'number',
                    description: 'Longitude coordinate',
                  },
                  days: {
                    type: 'number',
                    description: 'Number of days to forecast (1-7)',
                    default: 1,
                  },
                },
                required: ['latitude', 'longitude'],
              },
            },
            {
              name: 'geocode_city',
              description: 'Get geographic coordinates and detailed information for a city name',
              inputSchema: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'The city name to geocode',
                  },
                  count: {
                    type: 'number',
                    description: 'Maximum number of results',
                    default: 1,
                  },
                },
                required: ['city'],
              },
            },
            {
              name: 'ask_weather_question',
              description: 'Ask any weather-related question and get an AI-powered answer',
              inputSchema: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    description: 'Your weather question (e.g., "Is it good hiking weather?", "Should I bring an umbrella?")',
                  },
                  city: {
                    type: 'string',
                    description: 'Optional: City name for context',
                  },
                },
                required: ['question'],
              },
            },
          ],
        };
      }
    );

    // Handle tool calls (MCP protocol)
    this.server.setRequestHandler(
      { method: 'tools/call' },
      async (request) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            case 'get_weather':
              return await this.handleGetWeather(args.city);

            case 'get_forecast':
              return await this.handleGetForecast(args.city, args.days);

            case 'get_weather_by_coords':
              return await this.handleGetWeatherByCoords(args.latitude, args.longitude, args.days);

            case 'geocode_city':
              return await this.handleGeocodeCity(args.city, args.count);

            case 'ask_weather_question':
              return await this.handleWeatherQuestion(args.question, args.city);

            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error calling tool ${name}: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Handle get_weather tool call with Claude analysis
   */
  async handleGetWeather(city) {
    const result = await this.weatherService.getWeatherForChat(city, false);

    if (result.error) {
      throw new Error(result.message);
    }

    // Get AI-powered analysis
    let intelligentResponse;
    if (this.claudeService) {
      try {
        intelligentResponse = await this.claudeService.analyzeCurrentWeather(result.weatherData, city);
      } catch (error) {
        console.error('Claude analysis failed:', error);
        intelligentResponse = result.response; // Fallback to basic response
      }
    } else {
      intelligentResponse = result.response; // No Claude available
    }

    return {
      content: [
        {
          type: 'text',
          text: intelligentResponse,
        }
      ],
      weatherData: result.weatherData,
      type: result.type,
      aiAnalyzed: !!this.claudeService
    };
  }

  /**
   * Handle get_forecast tool call with Claude analysis
   */
  async handleGetForecast(city, days = 7) {
    const result = await this.weatherService.getWeatherForChat(city, true);

    if (result.error) {
      throw new Error(result.message);
    }

    // Get AI-powered forecast analysis
    let intelligentResponse;
    if (this.claudeService) {
      try {
        intelligentResponse = await this.claudeService.analyzeWeatherForecast(result.weatherData, city);
      } catch (error) {
        console.error('Claude analysis failed:', error);
        intelligentResponse = result.response; // Fallback to basic response
      }
    } else {
      intelligentResponse = result.response; // No Claude available
    }

    return {
      content: [
        {
          type: 'text',
          text: intelligentResponse,
        }
      ],
      weatherData: result.weatherData,
      type: result.type,
      aiAnalyzed: !!this.claudeService
    };
  }

  /**
   * Handle get_weather_by_coords tool call with Claude analysis
   */
  async handleGetWeatherByCoords(latitude, longitude, days = 1) {
    const weatherData = await this.weatherService.getWeatherForecast(latitude, longitude, days);

    // Add mock location data for consistency
    weatherData.location = {
      name: `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      latitude,
      longitude
    };

    // Get AI-powered analysis
    let intelligentResponse;
    if (this.claudeService) {
      try {
        intelligentResponse = await this.claudeService.analyzeLocationWeather(weatherData, latitude, longitude, days);
      } catch (error) {
        console.error('Claude analysis failed:', error);
        // Fallback to basic formatting
        if (days === 1) {
          intelligentResponse = this.weatherService.formatCurrentWeatherForChat(weatherData).response;
        } else {
          intelligentResponse = this.weatherService.formatForecastForChat(weatherData).response;
        }
      }
    } else {
      // Fallback to basic formatting
      if (days === 1) {
        intelligentResponse = this.weatherService.formatCurrentWeatherForChat(weatherData).response;
      } else {
        intelligentResponse = this.weatherService.formatForecastForChat(weatherData).response;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: intelligentResponse,
        }
      ],
      weatherData,
      type: days === 1 ? 'current' : 'forecast',
      aiAnalyzed: !!this.claudeService
    };
  }

  /**
   * Handle weather question with Claude
   */
  async handleWeatherQuestion(question, city = null) {
    if (!this.claudeService) {
      return {
        content: [
          {
            type: 'text',
            text: "I'd be happy to help with weather questions! However, AI analysis is not available right now. Try asking about specific weather data for a city.",
          }
        ],
        aiAnalyzed: false
      };
    }

    let weatherData = null;

    // If city is provided, get current weather for context
    if (city) {
      try {
        const result = await this.weatherService.getWeatherForChat(city, false);
        if (!result.error) {
          weatherData = result.weatherData;
        }
      } catch (error) {
        console.warn('Could not get weather context for question:', error);
      }
    }

    // Get AI-powered answer
    try {
      const intelligentResponse = await this.claudeService.answerWeatherQuestion(question, weatherData, city);

      return {
        content: [
          {
            type: 'text',
            text: intelligentResponse,
          }
        ],
        weatherData,
        type: 'question',
        aiAnalyzed: true
      };
    } catch (error) {
      console.error('Claude question analysis failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: "I'm having trouble analyzing that weather question right now. Could you try asking about specific weather data for a city?",
          }
        ],
        aiAnalyzed: false,
        isError: true
      };
    }
  }

  /**
   * Handle geocode_city tool call
   */
  async handleGeocodeCity(city, count = 1) {
    const locations = await this.weatherService.geocodeCity(city, count);

    let response = `**Geocoding results for "${city}":**\n\n`;

    if (locations.length === 0) {
      response += 'No locations found.';
    } else {
      locations.forEach((location, index) => {
        response += `${index + 1}. **${location.name}`;
        if (location.admin1) response += `, ${location.admin1}`;
        response += `, ${location.country}**\n`;
        response += `   📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n`;
        if (location.population) {
          response += `   👥 Population: ${location.population.toLocaleString()}\n`;
        }
        if (location.elevation) {
          response += `   ⛰️ Elevation: ${Math.round(location.elevation)}m\n`;
        }
        response += `   🕰️ Timezone: ${location.timezone}\n\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        }
      ],
      locations,
      count: locations.length
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[Real MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      await this.server.close();
      process.exit(0);
    });
  }

  async connect(transport) {
    await this.server.connect(transport);
    console.log('🌤️  Real MCP Weather Server is ready!');

    // Test tools list
    try {
      const handler = this.server.getRequestHandler({ method: 'tools/list' });
      if (handler) {
        const tools = await handler({});
        console.log('📋 Available tools:', tools.tools.map(t => t.name).join(', '));
      }
    } catch (error) {
      console.warn('Could not list tools:', error.message);
    }

    return this.server;
  }

  getServer() {
    return this.server;
  }
}

module.exports = RealMCPWeatherServer; 