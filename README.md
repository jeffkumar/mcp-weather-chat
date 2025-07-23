# Weather Chat Assistant

A ChatGPT-like React application with weather functionality using Model Context Protocol (MCP) server integration.

## Features

- 🌤️ **Weather Integration**: Get real-time weather forecasts for any city
- 💬 **Chat Interface**: ChatGPT-like conversational UI  
- 🔄 **MCP Server**: Custom weather server using Model Context Protocol
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎨 **Modern UI**: Dark theme with weather-inspired colors

## Architecture

```
mcp-weather-chat/
├── server.js                 # Express API server
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   └── styles/          # CSS files
├── mcp-server/              # MCP weather server
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install React client dependencies  
cd client && npm install && cd ..
```

### 2. Development Mode

Run both the API server and React client in development:

```bash
npm run dev
```

This will start:
- API server on `http://localhost:3000`
- React client on `http://localhost:3001`

### 3. Individual Services

You can also run services individually:

```bash
# API server only
npm run server

# React client only (in another terminal)
npm run client

# MCP weather server only
npm run mcp-server
```

## Usage

### Chat Interface

1. Open your browser to `http://localhost:3001` (development) or `http://localhost:3000` (production)
2. Type messages in the chat interface
3. Ask about weather: "What's the weather in London?"
4. The assistant will automatically detect weather queries and prompt for cities if needed

### Weather Queries

Examples of weather questions:
- "What's the weather in New York?"
- "Tell me the forecast for Tokyo"
- "How's the weather today in Paris?"
- "Weather forecast for San Francisco"

### Regular Chat

You can also have normal conversations:
- "Hello, how are you?"
- "Tell me about yourself"
- "Help me with something"

## API Endpoints

### POST `/api/chat`

Send a chat message and get a response.

**Request:**
```json
{
  "message": "What's the weather in London?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "Here's the weather forecast for London...",
  "weatherData": { /* weather API response */ }
}
```

## MCP Server

The Model Context Protocol server handles weather data fetching and city geocoding.

### Features
- City name lookup and geocoding
- Weather data fetching from APIs
- 7-day forecast data
- Error handling and fallbacks

### Running MCP Server

```bash
npm run mcp-server
```

## Configuration

### Weather API

To use real weather data, get a free API key from [OpenWeatherMap](https://openweathermap.org/api):

1. Sign up for a free account
2. Get your API key
3. Update `server.js` line with your API key:
   ```javascript
   appid: 'your_api_key_here'
   ```

### Environment Variables

Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=3000
WEATHER_API_KEY=your_openweathermap_api_key
```

## Deployment

### Production Build

```bash
# Build React client
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker (Optional)

```bash
# Build Docker image
docker build -t weather-chat-app .

# Run container
docker run -p 3000:3000 weather-chat-app
```

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **CSS Variables** - Custom theming system
- **Font Awesome** - Icons
- **Axios** - HTTP client

### Backend  
- **Express.js** - Web server framework
- **Node.js** - Runtime environment
- **Axios** - Weather API integration
- **CORS** - Cross-origin resource sharing

### MCP Server
- **WebSocket** - Real-time communication
- **Custom Protocol** - Weather-specific MCP implementation

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
    ├── App.css              # Global styles & theme
    └── Chat.css             # Chat-specific styles
```

### Styling Guidelines

- Use CSS custom properties (variables) from `theme.css`
- Follow the established color palette
- Avoid hardcoded colors - use theme classes
- Responsive design with mobile-first approach

### Adding Features

1. **New Chat Features**: Extend `ChatContainer.js`
2. **Weather Data**: Modify MCP server in `mcp-server/`
3. **UI Components**: Add to `client/src/components/`
4. **Styling**: Update `client/src/styles/`

## Troubleshooting

### Common Issues

**React app won't start:**
```bash
cd client && npm install
```

**API calls failing:**
- Check if backend server is running on port 3000
- Verify proxy setting in `client/package.json`

**Weather data not loading:**
- Get a free API key from OpenWeatherMap
- Update the API key in `server.js`

**Styling issues:**
- Clear browser cache
- Check CSS variable definitions in theme files

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request 