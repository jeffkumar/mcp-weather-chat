const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// MCP Server configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

// Middleware
app.use(cors());
app.use(express.json());

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
} else {
  // In development, just serve a simple message
  app.get('/', (req, res) => {
    res.json({
      message: 'Chat API Server running. Start the React client with: cd client && npm start',
      mcpServer: MCP_SERVER_URL
    });
  });
}

// MCP Client helper functions - Using real MCP protocol (JSON-RPC over HTTP)
let mcpSessionId = null;

async function initializeMCPSession() {
  if (mcpSessionId) {
    return mcpSessionId; // Already initialized
  }

  try {
    console.log('🔌 Initializing MCP session...');
    const response = await axios.post(`${MCP_SERVER_URL}/mcp`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'weather-chat-client',
          version: '1.0.0'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json, text/event-stream'
      }
    });

    // Extract session ID from response headers
    mcpSessionId = response.headers['mcp-session-id'];

    // Parse SSE response to verify initialization success
    const responseData = response.data;
    if (typeof responseData === 'string' && responseData.includes('event: message')) {
      // Extract JSON from SSE format
      const lines = responseData.split('\n');
      const dataLine = lines.find(line => line.startsWith('data: '));
      if (dataLine) {
        const jsonData = JSON.parse(dataLine.substring(6));
        if (jsonData.result) {
          console.log('✅ MCP session initialized:', mcpSessionId);
          console.log('📋 Server capabilities:', jsonData.result.capabilities);
          return mcpSessionId;
        }
      }
    }

    throw new Error('Failed to parse initialization response');
  } catch (error) {
    console.error('❌ Failed to initialize MCP session:', error.message);
    throw new Error('Failed to connect to MCP server');
  }
}

async function callMCPTool(toolName, args) {
  try {
    // Ensure we have an active session
    await initializeMCPSession();

    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Accept': 'application/json, text/event-stream'
    };

    if (mcpSessionId) {
      headers['mcp-session-id'] = mcpSessionId;
    }

    // Make proper JSON-RPC call to the MCP server
    const response = await axios.post(`${MCP_SERVER_URL}/mcp`, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }, { headers });

    console.log('🔧 MCP tool response:', response.status, response.headers['content-type']);

    if (!response.data) {
      throw new Error('Empty response from MCP server');
    }

    // Handle SSE format response (both initialization and tool calls use SSE)
    const responseData = response.data;
    if (typeof responseData === 'string' && responseData.includes('event: message')) {
      // Extract JSON from SSE format
      const lines = responseData.split('\n');
      const dataLine = lines.find(line => line.startsWith('data: '));
      if (dataLine) {
        const jsonData = JSON.parse(dataLine.substring(6));

        if (jsonData.error) {
          throw new Error(jsonData.error.message || 'MCP tool call failed');
        }

        if (jsonData.result) {
          return jsonData.result;
        }

        console.error('❌ Unexpected SSE response format:', jsonData);
        throw new Error('Invalid SSE response format from MCP server');
      }

      throw new Error('Could not parse SSE response data');
    }

    // Handle regular JSON response (fallback)
    if (response.data.error) {
      throw new Error(response.data.error.message || 'MCP tool call failed');
    }

    if (!response.data.result) {
      console.error('❌ Unexpected JSON response format:', response.data);
      throw new Error('Invalid JSON response format from MCP server');
    }

    return response.data.result;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Session might be invalid, reset and retry once
      mcpSessionId = null;
      console.log('🔄 Retrying with new MCP session...');
      return await callMCPTool(toolName, args);
    }

    if (error.response) {
      throw new Error(error.response.data.error?.message || 'MCP server error');
    } else if (error.request) {
      throw new Error('MCP server is not responding. Make sure it\'s running on port 3001.');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
}

async function getMCPServerInfo() {
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/health`);
    return response.data;
  } catch (error) {
    return null;
  }
}

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    // Check if the message is asking about weather
    const isWeatherQuery = message.toLowerCase().includes('weather') ||
      message.toLowerCase().includes('forecast') ||
      message.toLowerCase().includes('temp');

    if (isWeatherQuery) {
      // Use LLM for intelligent city extraction
      let cityMatch = null;
      try {
        // Import Claude service for LLM extraction
        const ClaudeService = require('./mcp-server/claude-service');
        const claudeService = new ClaudeService();
        cityMatch = await claudeService.extractCityFromMessage(message);
        console.log('🔍 LLM extracted city:', cityMatch);
      } catch (error) {
        console.error('LLM city extraction failed:', error);
        // Continue with null cityMatch
      }

      if (!cityMatch) {
        return res.json({
          response: "I'd be happy to help you with the weather! Which city would you like to know the weather for?",
          needsCity: true
        });
      }

      try {
        // Determine if user wants forecast or current weather
        const wantsForecast = message.toLowerCase().includes('forecast') ||
          message.toLowerCase().includes('week') ||
          message.toLowerCase().includes('days');

        // Call MCP server using real protocol
        const mcpResult = await callMCPTool(
          wantsForecast ? 'get_forecast' : 'get_weather',
          { city: cityMatch }
        );

        // Handle MCP protocol response format
        if (mcpResult.error) {
          return res.json({
            response: `Sorry, I couldn't get the weather data for ${cityMatch}. ${mcpResult.error.message}`,
            error: true
          });
        }

        // Extract the formatted response from MCP result
        const content = mcpResult.content || mcpResult.result?.content;
        if (!content || !content[0]) {
          return res.json({
            response: `Sorry, I couldn't get the weather data for ${cityMatch}. Invalid response format.`,
            error: true
          });
        }

        const formattedResponse = content[0].text;

        return res.json({
          response: formattedResponse,
          type: 'weather'
        });
      } catch (error) {
        console.error('MCP server error:', error);
        return res.json({
          response: `Sorry, I couldn't get the weather data for ${cityMatch}. ${error.message}`,
          error: true
        });
      }
    }

    // Regular chat response for non-weather queries
    const response = generateChatResponse(message, conversationHistory);
    res.json({ response });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      response: "Sorry, I encountered an error. Please try again.",
      error: true
    });
  }
});

// Proxy endpoints to MCP server
app.get('/api/weather/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const mcpResult = await callMCPTool('get_weather', { city });
    res.json(mcpResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/forecast/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 7 } = req.query;
    const mcpResult = await callMCPTool('get_forecast', { city, days: parseInt(days) });
    res.json(mcpResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/geocode/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const { count = 1 } = req.query;
    const mcpResult = await callMCPTool('geocode_city', { city, count: parseInt(count) });
    res.json(mcpResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/weather/coordinates/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const { days = 1 } = req.query;
    const mcpResult = await callMCPTool('get_weather_by_coords', {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      days: parseInt(days)
    });
    res.json(mcpResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// MCP server info endpoint
app.get('/api/mcp/info', async (req, res) => {
  try {
    const info = await getMCPServerInfo();
    if (info) {
      res.json(info);
    } else {
      res.status(503).json({
        error: 'MCP server is not available',
        suggestion: 'Start the MCP server with: node mcp-server/start-mcp-server.js'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check that includes MCP server status
app.get('/api/health', async (req, res) => {
  const mcpInfo = await getMCPServerInfo();
  res.json({
    status: 'healthy',
    chatServer: 'running',
    mcpServer: mcpInfo ? 'connected' : 'disconnected',
    mcpServerUrl: MCP_SERVER_URL,
    timestamp: new Date().toISOString()
  });
});



function generateChatResponse(message, history) {
  const lowerMessage = message.toLowerCase();

  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm your weather-enabled chat assistant. I can help you with weather forecasts for any city or just have a normal conversation. What would you like to know?";
  }

  // Help responses
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return "I can help you with:\n• **Weather Information:** Current weather for any city\n• **Forecasts:** 5-day weather outlook\n• **Weather Details:** Temperature, humidity, wind, and more\n• **General Chat:** Feel free to ask me anything!\n\nJust ask me about the weather in any city like \"What's the weather in Paris?\" or we can chat about anything else!";
  }

  // Thank you responses
  if (lowerMessage.includes('thank')) {
    return "You're welcome! Is there anything else I can help you with? I'm always ready to provide weather updates or just chat.";
  }

  // Goodbye responses
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! It was nice chatting with you. Come back anytime if you need weather information or just want to talk!";
  }

  // How are you responses
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you feel')) {
    return "I'm doing great, thank you for asking! I'm always excited to help with weather information and chat. How are you doing today?";
  }

  // Common knowledge questions
  if (lowerMessage.includes('capital') && lowerMessage.includes('england')) {
    return "The capital of England is London! It's also the capital of the United Kingdom. By the way, if you'd like to know the weather in London, just ask!";
  }

  if (lowerMessage.includes('capital') && (lowerMessage.includes('france') || lowerMessage.includes('french'))) {
    return "The capital of France is Paris! It's a beautiful city known for the Eiffel Tower and its rich culture. Want to check the weather there?";
  }

  if (lowerMessage.includes('capital') && lowerMessage.includes('japan')) {
    return "The capital of Japan is Tokyo! It's one of the largest cities in the world. I can get you the weather forecast for Tokyo if you're interested!";
  }

  if (lowerMessage.includes('what') && lowerMessage.includes('time')) {
    return "I don't have access to real-time clock data, but I can tell you the weather conditions which often include local time information! Just ask for weather in any city.";
  }

  // Math questions
  if (lowerMessage.includes('what') && lowerMessage.includes('2+2')) {
    return "2 + 2 = 4! Easy math question. Is there anything else I can help you with?";
  }

  // Color questions
  if (lowerMessage.includes('favorite color') || lowerMessage.includes('favourite colour')) {
    return "I'd say blue - like a clear sky on a perfect weather day! Speaking of which, I can tell you about the weather conditions anywhere you'd like to know.";
  }

  // General fallback responses that encourage engagement
  const responses = [
    "That's an interesting question! While I specialize in weather information, I'm happy to chat. Is there anything specific you'd like to know about?",
    "I'd love to help with that! I'm particularly good with weather-related questions, but feel free to ask me anything.",
    "Great question! I'm here to help with weather forecasts and general conversation. What else would you like to know?",
    "I understand what you're asking! While my specialty is weather information, I enjoy chatting about various topics. How can I assist you further?",
    "That's a good point! I'm always ready to help with weather updates for any city, or we can continue our conversation. What interests you?"
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Handle React routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`🚀 Chat Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('📱 In development mode - start React client separately with: cd client && npm start');
  }

  // Check MCP server connection
  const mcpInfo = await getMCPServerInfo();
  if (mcpInfo) {
    console.log(`🌤️  Connected to MCP server: ${mcpInfo.name} v${mcpInfo.version}`);
  } else {
    console.log(`⚠️  MCP server not available at ${MCP_SERVER_URL}`);
    console.log('💡 Start the MCP server with: node mcp-server/start-mcp-server.js');
  }
}); 