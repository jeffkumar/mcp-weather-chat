/**
 * Claude AI Service for Weather Analysis
 * 
 * Provides intelligent weather analysis and conversational responses
 * using Anthropic's Claude API.
 */

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

class ClaudeService {
  constructor() {
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'your_claude_api_key_here') {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    this.model = 'claude-3-5-sonnet-20241022';
    this.maxTokens = 1000;
  }

  /**
   * Analyze current weather and provide intelligent insights
   */
  async analyzeCurrentWeather(weatherData, city) {
    const prompt = `You are a helpful weather assistant. Analyze this current weather data for ${city} and provide a conversational, helpful response.

Weather Data:
- Temperature: ${weatherData.current.temperature}°C (feels like ${weatherData.current.apparentTemperature}°C)
- Condition: ${this.getWeatherDescription(weatherData.current.weatherCode)}
- Humidity: ${weatherData.current.humidity}%
- Wind: ${weatherData.current.windSpeed} km/h
- Pressure: ${weatherData.current.pressure} hPa
- Cloud Cover: ${weatherData.current.cloudCover}%
- Time: ${weatherData.current.isDay ? 'Day' : 'Night'}
${weatherData.current.precipitation > 0 ? `- Precipitation: ${weatherData.current.precipitation}mm` : ''}

Please provide:
1. A friendly summary of current conditions
2. What it feels like outside
3. Any practical advice (clothing, activities, etc.)
4. Keep it conversational and helpful (2-3 sentences)

Format as natural conversational text, not bullet points.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      return this.fallbackCurrentWeatherResponse(weatherData, city);
    }
  }

  /**
   * Analyze weather forecast and provide intelligent insights
   */
  async analyzeWeatherForecast(weatherData, city) {
    const prompt = `You are a helpful weather assistant. Analyze this 7-day weather forecast for ${city} and provide useful insights.

Current Weather:
- ${weatherData.current.temperature}°C, ${this.getWeatherDescription(weatherData.current.weatherCode)}

7-Day Forecast:
${weatherData.daily.map((day, index) => {
      const date = new Date(day.date);
      const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName}: ${day.temperatureMin}-${day.temperatureMax}°C, ${this.getWeatherDescription(day.weatherCode)}${day.precipitationSum > 0 ? `, ${day.precipitationSum}mm rain` : ''}`;
    }).slice(0, 7).join('\n')}

Please provide:
1. A summary of the weekly weather pattern
2. Highlight any significant changes or notable weather
3. Practical advice for planning activities
4. Best and worst days in the forecast
5. Keep it conversational and helpful (3-4 sentences)

Format as natural conversational text, not bullet points.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      return this.fallbackForecastResponse(weatherData, city);
    }
  }

  /**
   * Analyze weather for specific coordinates with context
   */
  async analyzeLocationWeather(weatherData, latitude, longitude, days = 1) {
    const isCurrentWeather = days === 1;
    const prompt = isCurrentWeather ?
      `You are a weather assistant. Analyze the current weather for coordinates ${latitude.toFixed(2)}, ${longitude.toFixed(2)}.

Weather Data:
- Temperature: ${weatherData.current.temperature}°C (feels like ${weatherData.current.apparentTemperature}°C)
- Condition: ${this.getWeatherDescription(weatherData.current.weatherCode)}
- Humidity: ${weatherData.current.humidity}%
- Wind: ${weatherData.current.windSpeed} km/h

Provide a helpful summary of current conditions and practical advice. Keep it brief and conversational.` :
      `You are a weather assistant. Analyze this ${days}-day forecast for coordinates ${latitude.toFixed(2)}, ${longitude.toFixed(2)}.

Forecast Overview:
${weatherData.daily.slice(0, days).map((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        return `${dayName}: ${day.temperatureMin}-${day.temperatureMax}°C, ${this.getWeatherDescription(day.weatherCode)}`;
      }).join('\n')}

Provide a helpful forecast summary with practical insights. Keep it conversational.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      return isCurrentWeather ?
        this.fallbackCurrentWeatherResponse(weatherData, `coordinates ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`) :
        this.fallbackForecastResponse(weatherData, `coordinates ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
    }
  }

  /**
   * Answer general weather questions with context
   */
  async answerWeatherQuestion(question, weatherData = null, city = null) {
    let prompt = `You are a helpful weather assistant. Answer this weather-related question: "${question}"`;

    if (weatherData && city) {
      prompt += `

Here's current weather context for ${city}:
- Temperature: ${weatherData.current.temperature}°C
- Condition: ${this.getWeatherDescription(weatherData.current.weatherCode)}
- Humidity: ${weatherData.current.humidity}%
- Wind: ${weatherData.current.windSpeed} km/h`;
    }

    prompt += '\n\nProvide a helpful, conversational response. If you need specific location information, mention that.';

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      return "I'd be happy to help with weather questions! Could you specify a location so I can provide accurate information?";
    }
  }

  /**
   * Fallback responses when Claude API is unavailable
   */
  fallbackCurrentWeatherResponse(weatherData, city) {
    const temp = weatherData.current.temperature;
    const condition = this.getWeatherDescription(weatherData.current.weatherCode);
    const feelsLike = weatherData.current.apparentTemperature;

    let response = `The current weather in ${city} is ${temp}°C with ${condition.toLowerCase()}`;
    if (Math.abs(temp - feelsLike) > 3) {
      response += `, though it feels like ${feelsLike}°C`;
    }
    response += '. ';

    if (weatherData.current.precipitation > 0) {
      response += "It's currently raining, so you'll want an umbrella. ";
    }

    if (temp < 10) {
      response += "It's quite chilly - dress warmly!";
    } else if (temp > 25) {
      response += "It's quite warm - perfect for outdoor activities!";
    } else {
      response += "Pleasant weather overall!";
    }

    return response;
  }

  fallbackForecastResponse(weatherData, city) {
    const today = weatherData.daily[0];
    const tomorrow = weatherData.daily[1];

    let response = `The forecast for ${city} shows `;
    response += `${today.temperatureMin}-${today.temperatureMax}°C today with ${this.getWeatherDescription(today.weatherCode).toLowerCase()}`;

    if (tomorrow) {
      response += `, and ${tomorrow.temperatureMin}-${tomorrow.temperatureMax}°C tomorrow with ${this.getWeatherDescription(tomorrow.weatherCode).toLowerCase()}`;
    }

    const rainDays = weatherData.daily.slice(0, 7).filter(day => day.precipitationSum > 0).length;
    if (rainDays > 3) {
      response += '. Expect several rainy days this week.';
    } else if (rainDays > 0) {
      response += '. Some rain is expected during the week.';
    } else {
      response += '. Looks like a dry week ahead!';
    }

    return response;
  }

  /**
   * Weather code descriptions (same as WeatherService)
   */
  getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      66: 'Light freezing rain', 67: 'Heavy freezing rain',
      71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      85: 'Slight snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };

    return weatherCodes[code] || `Weather code ${code}`;
  }
}

module.exports = ClaudeService; 