# MCP Weather Chat

A ChatGPT-like React application with weather functionality using Model Context Protocol (MCP) server integration with Claude AI.

## Features

- 🌤️ **Weather Integration**: Get real-time weather forecasts for any city
- 💬 **Chat Interface**: ChatGPT-like conversational UI with Claude AI
- 🔄 **MCP Server**: Real MCP server using Model Context Protocol with Claude
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎨 **Modern UI**: Clean interface with Tailwind CSS

## Prerequisites

Before running this application, you need:

1. **Anthropic API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. **Node.js**: Version 16 or higher
3. **npm**: For package management

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install React client dependencies  
cd client && npm install && cd ..
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Important**: You must have a valid Anthropic API key for the MCP server to work with Claude AI.

### 3. Development Mode

Run all services in development mode:

```bash
npm run dev
```

This will start:
- **MCP Server** on `http://localhost:3001` (Claude AI integration)
- **Express API Server** on `http://localhost:3000` (Backend API)
- **React Client** on `http://localhost:3002` (Frontend)

### 4. Individual Services

You can also run services individually:

```bash
# MCP server only (Claude AI)
npm run mcp-server

# Express API server only
npm run server

# React client only
npm run client
```

## Usage

### Chat Interface

1. Open your browser to `http://localhost:3002`
2. Type messages in the chat interface
3. Ask about weather: "What's the weather in London?"
4. Have conversations with Claude AI about any topic

### Weather Queries

Examples of weather questions:
- "What's the weather in New York?"
- "Tell me the forecast for Tokyo"
- "How's the weather today in Paris?"
- "Weather forecast for San Francisco"

### Regular Chat

You can also have normal conversations with Claude:
- "Hello, how are you?"
- "Tell me about yourself"
- "Help me with something"
- "Explain quantum physics"

## Architecture

```
mcp-weather-chat/
├── server.js                 # Express API server
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   └── styles/          # CSS files
├── mcp-server/              # MCP server with Claude
│   ├── real-mcp-http-server.js    # Main MCP server
│   ├── claude-service.js          # Claude AI integration
│   ├── weather-service.js         # Weather API service
│   └── http-transport.js          # HTTP transport layer
└── README.md
```

## MCP Server

The Model Context Protocol server integrates with Claude AI and provides weather functionality.

### Features
- **Claude AI Integration**: Powered by Anthropic's Claude model
- **Weather Data**: Simplified weather service for city forecasts
- **HTTP Transport**: RESTful API endpoints
- **Real-time Chat**: Streaming responses from Claude

### MCP Server Endpoints

- `GET /health` - Health check
- `POST /chat` - Send messages to Claude
- `GET /weather/:city` - Get weather for a city

## Configuration

### Required Environment Variables

Create a `.env` file in the root directory:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
NODE_ENV=development
PORT=3000
MCP_PORT=3001
CLIENT_PORT=3002
```

### Getting Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or sign in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client

### Backend  
- **Express.js** - Web server framework
- **Node.js** - Runtime environment
- **CORS** - Cross-origin resource sharing

### MCP Server
- **@anthropic-ai/sdk** - Official Anthropic SDK
- **@modelcontextprotocol/sdk** - MCP SDK
- **WebSocket** - Real-time communication
- **HTTP Transport** - RESTful API endpoints

## Development

### Project Structure

```
client/src/
├── App.js                    # Main React component
├── index.js                  # React entry point
├── components/
│   ├── ChatContainer.js      # Main chat logic
│   ├── MessageList.js        # Message display
│   └── MessageInput.js       # Input handling
└── styles/
    └── App.css              # Global styles & Tailwind
```

### Development Commands

```bash
# Start all services
npm run dev

# Build React client
npm run build

# Test MCP server health
npm run test-mcp
```

## Troubleshooting

### Common Issues

**MCP server won't start:**
- Check if you have a valid `ANTHROPIC_API_KEY` in your `.env` file
- Ensure port 3001 is not in use: `lsof -ti:3001 | xargs kill -9`

**React app won't start:**
```bash
cd client && npm install
```

**API calls failing:**
- Check if backend server is running on port 3000
- Verify MCP server is running on port 3001
- Check browser console for CORS errors

**Port conflicts:**
```bash
# Kill processes using specific ports
lsof -ti:3000,3001,3002 | xargs kill -9
```

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request 