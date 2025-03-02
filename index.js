require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// Add JSON body parser middleware
app.use(express.json());

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:');
  console.error(reason);
});

// Add a timeout to all axios requests
axios.defaults.timeout = 10000; // 10 seconds

// Calendly API token - make sure this is set in Railway environment variables
const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;
// Your Calendly User URI - you'll need to set this in Railway environment variables as well
const CALENDLY_USER_URI = process.env.CALENDLY_USER_URI;

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Calendly API integration is up and running!'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  // Return a simple response
  res.json({
    status: 'success',
    message: 'Test endpoint is working',
    env: {
      hasToken: !!CALENDLY_API_TOKEN,
      hasUserUri: !!CALENDLY_USER_URI,
      tokenLength: CALENDLY_API_TOKEN ? CALENDLY_API_TOKEN.length : 0,
      timestamp: new Date().toISOString()
    }
  });
});

// Check availability endpoint
app.get('/check-availability', async (req, res) => {
  try {
    // Get the min_start_time from query parameters
    const minStartTime = req.query.min_start_time;
    
    if (!minStartTime) {
      return res.status(400).json({
        status: 'error',
        message: 'min_start_time query parameter is required'
      });
    }

    // Simple mocked response for now to see if endpoint works
    return res.json({
      status: 'success',
      isAvailable: true,
      requestedTime: minStartTime,
      message: "Simplified response to test API endpoint",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in check-availability:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred',
      error: error.message
    });
  }
});

// Endpoint to get your Calendly user URI
app.get('/get-user-uri', async (req, res) => {
  try {
    const response = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      status: 'success',
      userUri: response.data.resource.uri,
      userData: response.data.resource
    });
  } catch (error) {
    console.error('Error getting user URI:', error.response ? error.response.data : error.message);
    
    return res.status(error.response ? error.response.status : 500).json({
      status: 'error',
      message: error.response ? error.response.data : 'An error occurred while getting user URI',
      details: error.message
    });
  }
});

// Debug endpoint to check API token (remove in production)
app.get('/debug-token', (req, res) => {
  // Show first and last 4 characters of token for verification
  const token = CALENDLY_API_TOKEN || 'Not set';
  const maskedToken = token.length > 8 
    ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` 
    : 'Token too short or not set';
  
  res.json({
    tokenStatus: token ? 'Token is set' : 'Token is not set',
    tokenLength: token ? token.length : 0,
    maskedToken: maskedToken,
    userUri: CALENDLY_USER_URI || 'Not set'
  });
});

// Make sure to listen on the PORT provided by Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});