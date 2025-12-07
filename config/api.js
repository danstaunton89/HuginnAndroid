// API Configuration for mobile app
// Uses __DEV__ flag to determine environment

const API_URLS = {
  production: 'https://huginn.health',
  staging: 'https://staging.huginn.health',
  development: 'https://dev.huginn.health:3000'
};

// __DEV__ is true in development, false in production builds
// Temporarily forcing production URL for testing
export const API_BASE_URL = API_URLS.production;