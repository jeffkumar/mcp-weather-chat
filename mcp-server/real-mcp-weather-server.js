#!/usr/bin/env node

/**
 * Real MCP Weather Server using official SDK
 * 
 * A proper MCP server using the official @modelcontextprotocol/sdk
 * with Claude AI integration for intelligent weather analysis.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const WeatherService = require('./weather-service');
const ClaudeService = require('./claude-service');
require('dotenv').config();

class RealMCPWeatherServer {
  constructor() {
    console.log('🚀 Initializing Real MCP Weather Server...');

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

    // Create real MCP server using official SDK
    this.server = new McpServer(
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

    this.setupTools();
    this.setupErrorHandling();
  }

  setupTools() {
    // Register get_weather tool
    this.server.registerTool(
      'get_weather',
      {
        title: 'Get Weather',
        description: 'Get current weather data with AI-powered analysis and recommendations',
        inputSchema: {
          city: z.string().describe('The city name to get weather for')
        }
      },
      async ({ city }) => {
        return await this.handleGetWeather(city);
      }
    );

    // Register get_forecast tool
    this.server.registerTool(
      'get_forecast',
      {
        title: 'Get Weather Forecast',
        description: 'Get weather forecast with intelligent insights and planning advice',
        inputSchema: {
          city: z.string().describe('The city name to get forecast for'),
          days: z.number().optional().default(7).describe('Number of days to forecast (1-7)')
        }
      },
      async ({ city, days }) => {
        return await this.handleGetForecast(city, days);
      }
    );

    // Register get_weather_by_coords tool
    this.server.registerTool(
      'get_weather_by_coords',
      {
        title: 'Get Weather by Coordinates',
        description: 'Get weather data using geographic coordinates with location-specific analysis',
        inputSchema: {
          latitude: z.number().describe('Latitude coordinate'),
          longitude: z.number().describe('Longitude coordinate'),
          days: z.number().optional().default(1).describe('Number of days to forecast (1-7)')
        }
      },
      async ({ latitude, longitude, days }) => {
        return await this.handleGetWeatherByCoords(latitude, longitude, days);
      }
    );

    // Register geocode_city tool
    this.server.registerTool(
      'geocode_city',
      {
        title: 'Geocode City',
        description: 'Get geographic coordinates and detailed information for a city name',
        inputSchema: {
          city: z.string().describe('The city name to geocode'),
          count: z.number().optional().default(1).describe('Maximum number of results')
        }
      },
      async ({ city, count }) => {
        return await this.handleGeocodeCity(city, count);
      }
    );

    // Register ask_weather_question tool
    this.server.registerTool(
      'ask_weather_question',
      {
        title: 'Ask Weather Question',
        description: 'Ask any weather-related question and get an AI-powered answer',
        inputSchema: {
          question: z.string().describe('Your weather question (e.g., "Is it good hiking weather?", "Should I bring an umbrella?")'),
          city: z.string().optional().describe('Optional: City name for context')
        }
      },
      async ({ question, city }) => {
        return await this.handleWeatherQuestion(question, city);
      }
    );

    // Register get_weather_fahrenheit tool
    this.server.registerTool(
      'get_weather_fahrenheit',
      {
        title: 'Get Weather in Fahrenheit',
        description: 'Get current weather data in Fahrenheit with AI-powered analysis',
        inputSchema: {
          city: z.string().describe('The city name to get weather for')
        }
      },
      async ({ city }) => {
        return await this.handleGetWeather(city, true);
      }
    );

    // Register get_forecast_fahrenheit tool
    this.server.registerTool(
      'get_forecast_fahrenheit',
      {
        title: 'Get Weather Forecast in Fahrenheit',
        description: 'Get weather forecast in Fahrenheit with intelligent insights',
        inputSchema: {
          city: z.string().describe('The city name to get forecast for'),
          days: z.number().optional().default(7).describe('Number of days to forecast (1-7)')
        }
      },
      async ({ city, days }) => {
        return await this.handleGetForecast(city, days, true);
      }
    );

    console.log('📋 Registered MCP tools: get_weather, get_forecast, get_weather_by_coords, geocode_city, ask_weather_question, get_weather_fahrenheit, get_forecast_fahrenheit');
  }

  /**
   * Handle get_weather tool call with Claude analysis
   */
  async handleGetWeather(city, useFahrenheit = false) {
    try {
      const result = await this.weatherService.getWeatherForChat(city, false, useFahrenheit);

      if (result.error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting weather for ${city}: ${result.message}`
            }
          ],
          isError: true
        };
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
            text: intelligentResponse
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle get_forecast tool call with Claude analysis
   */
  async handleGetForecast(city, days = 7, useFahrenheit = false) {
    try {
      const result = await this.weatherService.getWeatherForChat(city, true, useFahrenheit);

      if (result.error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting forecast for ${city}: ${result.message}`
            }
          ],
          isError: true
        };
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
            text: intelligentResponse
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle get_weather_by_coords tool call with Claude analysis
   */
  async handleGetWeatherByCoords(latitude, longitude, days = 1) {
    try {
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
            text: intelligentResponse
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle weather question with Claude
   */
  async handleWeatherQuestion(question, city = null) {
    // Check if user wants Fahrenheit
    const wantsFahrenheit = this.detectFahrenheitPreference(question);

    // Extract city name from question if not provided
    let targetCity = city;
    if (!targetCity) {
      // Simple city extraction - look for common patterns
      const cityPatterns = [
        /weather in (\w+)/i,
        /forecast for (\w+)/i,
        /(\w+) weather/i,
        /(\w+) forecast/i
      ];

      for (const pattern of cityPatterns) {
        const match = question.match(pattern);
        if (match) {
          targetCity = match[1];
          break;
        }
      }
    }

    // If we have a city and want Fahrenheit, use the appropriate tool
    if (targetCity && wantsFahrenheit) {
      // Check if it's a forecast request
      const isForecastRequest = /forecast|week|days|this week|next week/i.test(question);

      if (isForecastRequest) {
        return await this.handleGetForecast(targetCity, 7, true);
      } else {
        return await this.handleGetWeather(targetCity, true);
      }
    }

    // If we have a city but no Fahrenheit preference, use regular tools
    if (targetCity && !wantsFahrenheit) {
      const isForecastRequest = /forecast|week|days|this week|next week/i.test(question);

      if (isForecastRequest) {
        return await this.handleGetForecast(targetCity, 7, false);
      } else {
        return await this.handleGetWeather(targetCity, false);
      }
    }

    // Fall back to Claude analysis for complex questions
    if (!this.claudeService) {
      return {
        content: [
          {
            type: 'text',
            text: "I'd be happy to help with weather questions! However, AI analysis is not available right now. Try asking about specific weather data for a city."
          }
        ]
      };
    }

    let weatherData = null;

    // If city is provided, get current weather for context
    if (targetCity) {
      try {
        const result = await this.weatherService.getWeatherForChat(targetCity, false, wantsFahrenheit);
        if (!result.error) {
          weatherData = result.weatherData;
        }
      } catch (error) {
        console.warn('Could not get weather context for question:', error);
      }
    }

    // Get AI-powered answer
    try {
      const intelligentResponse = await this.claudeService.answerWeatherQuestion(question, weatherData, targetCity);

      return {
        content: [
          {
            type: 'text',
            text: intelligentResponse
          }
        ]
      };
    } catch (error) {
      console.error('Claude question analysis failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: "I'm having trouble analyzing that weather question right now. Could you try asking about specific weather data for a city?"
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle geocode_city tool call
   */
  async handleGeocodeCity(city, count = 1) {
    try {
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
            text: response
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error geocoding ${city}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
 * Detect if user wants Fahrenheit temperatures
 */
  detectFahrenheitPreference(userMessage) {
    if (!userMessage) return false;

    const fahrenheitKeywords = [
      'fahrenheit', 'farenheit', 'f', '°f', 'degrees fahrenheit',
      'in fahrenheit', 'convert to fahrenheit', 'show fahrenheit',
      'f instead of c', 'fahrenheit instead of celsius',
      'in f', 'in f instead of c', 'f instead of celsius',
      'fahrenheit instead of c', 'f instead of c'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return fahrenheitKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  setupErrorHandling() {
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Shutting down Real MCP server...');
      process.exit(0);
    });
  }

  /**
   * Connect with stdio transport (for Claude Desktop)
   */
  async connectStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🌤️  Real MCP Weather Server connected via stdio transport!');
    console.log('✅ Ready for Claude Desktop integration');
    return this.server;
  }

  /**
   * Get the server instance for HTTP transport
   */
  getServer() {
    return this.server;
  }
}

// If this file is run directly, start with stdio transport
if (require.main === module) {
  const args = process.argv.slice(2);

  async function main() {
    try {
      const mcpServer = new RealMCPWeatherServer();

      if (args.includes('--stdio') || args.length === 0) {
        // Default to stdio transport
        await mcpServer.connectStdio();
      } else {
        console.log('💡 Use --stdio for Claude Desktop integration');
        console.log('💡 For HTTP transport, use the HTTP server wrapper');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to start Real MCP server:', error);
      process.exit(1);
    }
  }

  main();
}

module.exports = RealMCPWeatherServer; 