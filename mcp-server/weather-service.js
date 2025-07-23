/**
 * Weather Service
 * 
 * A proper HTTP-based weather service for web applications using Open-Meteo APIs.
 * These APIs are free and don't require API keys.
 */

const axios = require('axios');

// Open-Meteo API configuration
const GEO_BASE_URL = 'https://geocoding-api.open-meteo.com/v1';
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1';

class WeatherService {
  constructor() {
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Geocode a city name to get coordinates using Open-Meteo
   */
  async geocodeCity(city, count = 1) {
    const cacheKey = `geocode_${city}_${count}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout * 6) { // Cache geocoding longer
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${GEO_BASE_URL}/search`, {
        params: {
          name: city,
          count: count,
        },
      });

      const locations = response.data.results?.map(location => ({
        name: location.name,
        country: location.country,
        admin1: location.admin1, // State/province
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
        population: location.population,
        elevation: location.elevation
      })) || [];

      // Cache the result
      this.cache.set(cacheKey, {
        data: locations,
        timestamp: Date.now()
      });

      return locations;
    } catch (error) {
      throw new Error(`Failed to geocode ${city}: ${error.message}`);
    }
  }

  /**
   * Get current weather and forecast for coordinates using Open-Meteo
   */
  async getWeatherForecast(latitude, longitude, days = 7) {
    const cacheKey = `forecast_${latitude}_${longitude}_${days}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
        params: {
          latitude: latitude,
          longitude: longitude,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum',
          timezone: 'auto',
          forecast_days: days
        },
      });

      const data = response.data;

      // Parse the response into a more usable format
      const result = {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        elevation: data.elevation,
        current: {
          time: data.current.time,
          temperature: Math.round(data.current.temperature_2m),
          apparentTemperature: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          rain: data.current.rain,
          snowfall: data.current.snowfall,
          weatherCode: data.current.weather_code,
          cloudCover: data.current.cloud_cover,
          pressure: data.current.pressure_msl,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          windGusts: data.current.wind_gusts_10m,
          isDay: data.current.is_day === 1
        },
        daily: data.daily.time.map((date, index) => ({
          date: date,
          weatherCode: data.daily.weather_code[index],
          temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
          temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
          apparentTemperatureMax: Math.round(data.daily.apparent_temperature_max[index]),
          apparentTemperatureMin: Math.round(data.daily.apparent_temperature_min[index]),
          sunrise: data.daily.sunrise[index],
          sunset: data.daily.sunset[index],
          daylightDuration: data.daily.daylight_duration[index],
          sunshineDuration: data.daily.sunshine_duration[index],
          uvIndexMax: data.daily.uv_index_max[index],
          precipitationSum: data.daily.precipitation_sum[index],
          precipitationHours: data.daily.precipitation_hours[index],
          precipitationProbability: data.daily.precipitation_probability_max[index],
          windSpeedMax: data.daily.wind_speed_10m_max[index],
          windGustsMax: data.daily.wind_gusts_10m_max[index],
          windDirection: data.daily.wind_direction_10m_dominant[index]
        })),
        units: data.current_units,
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get forecast for coordinates ${latitude}, ${longitude}: ${error.message}`);
    }
  }

  /**
   * Get weather data for a city with enhanced formatting for chat responses
   */
  async getWeatherForChat(city, includeForecast = false) {
    try {
      // First geocode the city
      const locations = await this.geocodeCity(city, 1);

      if (!locations || locations.length === 0) {
        return {
          error: true,
          message: `Could not find location for "${city}". Please check the city name and try again.`
        };
      }

      const location = locations[0];

      // Get weather data for the coordinates
      const weatherData = await this.getWeatherForecast(
        location.latitude,
        location.longitude,
        includeForecast ? 7 : 1
      );

      // Add location info to weather data
      weatherData.location = location;

      if (includeForecast) {
        return this.formatForecastForChat(weatherData);
      } else {
        return this.formatCurrentWeatherForChat(weatherData);
      }
    } catch (error) {
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Format current weather for chat display
   */
  formatCurrentWeatherForChat(weatherData) {
    const { current, location } = weatherData;
    const weatherDescription = this.getWeatherDescription(current.weatherCode);

    let response = `**Current Weather in ${location.name}`;
    if (location.admin1) response += `, ${location.admin1}`;
    response += `, ${location.country}**\n\n`;

    response += `🌡️ **Temperature:** ${current.temperature}°C (feels like ${current.apparentTemperature}°C)\n`;
    response += `☁️ **Condition:** ${weatherDescription}\n`;
    response += `💧 **Humidity:** ${current.humidity}%\n`;
    response += `🌬️ **Wind:** ${current.windSpeed} km/h`;
    if (current.windGusts > 0) {
      response += ` (gusts up to ${current.windGusts} km/h)`;
    }
    response += `\n`;
    response += `📊 **Pressure:** ${current.pressure} hPa\n`;
    response += `☁️ **Cloud Cover:** ${current.cloudCover}%\n`;

    if (current.precipitation > 0) {
      response += `🌧️ **Precipitation:** ${current.precipitation} mm\n`;
    }

    const timeOfDay = current.isDay ? '☀️ Day' : '🌙 Night';
    response += `🕐 **Time of Day:** ${timeOfDay}\n`;

    response += `\n📍 **Location:** ${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
    if (location.elevation) {
      response += ` (${Math.round(location.elevation)}m elevation)`;
    }

    return {
      response,
      weatherData,
      type: 'current'
    };
  }

  /**
   * Format forecast for chat display
   */
  formatForecastForChat(weatherData) {
    const { daily, location } = weatherData;

    let response = `**7-Day Weather Forecast for ${location.name}`;
    if (location.admin1) response += `, ${location.admin1}`;
    response += `, ${location.country}**\n\n`;

    daily.slice(0, 7).forEach((day, index) => {
      const date = new Date(day.date);
      const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weatherDesc = this.getWeatherDescription(day.weatherCode);

      response += `📅 **${dayName}, ${dateStr}**\n`;
      response += `   🌡️ ${day.temperatureMin}° - ${day.temperatureMax}°C\n`;
      response += `   ☁️ ${weatherDesc}\n`;

      if (day.precipitationSum > 0) {
        response += `   🌧️ ${day.precipitationSum}mm rain`;
        if (day.precipitationProbability > 0) {
          response += ` (${day.precipitationProbability}% chance)`;
        }
        response += `\n`;
      }

      if (day.windSpeedMax > 10) {
        response += `   💨 Wind up to ${day.windSpeedMax} km/h\n`;
      }

      response += `\n`;
    });

    return {
      response,
      weatherData,
      type: 'forecast'
    };
  }

  /**
   * Convert weather code to human-readable description
   * Based on WMO Weather interpretation codes
   */
  getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return weatherCodes[code] || `Weather code ${code}`;
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = WeatherService; 