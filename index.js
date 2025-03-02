require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// Add JSON body parser middleware
app.use(express.json());

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

// Check availability endpoint
app.get('/check-availability', async (req, res) => {
  try {
    // Log authentication header that will be used (masking most of the token)
    const authHeader = `Bearer ${CALENDLY_API_TOKEN ? CALENDLY_API_TOKEN.substring(0, 4) + '...' : 'NOT_SET'}`;
    console.log(`Using auth header: ${authHeader}`);
    
    // Check if user URI is set
    if (!CALENDLY_USER_URI) {
      return res.status(400).json({
        status: 'error',
        message: 'CALENDLY_USER_URI environment variable is not set. Please set it and try again.',
        hint: 'Visit /get-user-uri endpoint to retrieve your user URI.'
      });
    }
    
    console.log(`Calendly User URI: ${CALENDLY_USER_URI}`);
    
    // Get the min_start_time from query parameters or request body
    const minStartTime = req.query.min_start_time || (req.body && req.body.min_start_time);
    
    if (!minStartTime) {
      return res.status(400).json({
        status: 'error',
        message: 'min_start_time query parameter is required'
      });
    }

    // First, we need to get the user's event types
    const eventTypesResponse = await axios.get('https://api.calendly.com/event_types', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        'user': CALENDLY_USER_URI
      }
    });

    // If no event types are found
    if (!eventTypesResponse.data.collection || eventTypesResponse.data.collection.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No event types found for this user'
      });
    }

    // For simplicity, we'll use the first event type
    const eventType = eventTypesResponse.data.collection[0];
    
    // Get the available times for this event type
    const availableTimesResponse = await axios.get(`https://api.calendly.com/event_types/${eventType.uri.split('/').pop()}/available_times`, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        'start_time': minStartTime,
        // You can adjust the days_into_future parameter as needed
        'days': 7
      }
    });

    // Check if there are available times
    const hasAvailability = availableTimesResponse.data.available_times && 
                          availableTimesResponse.data.available_times.length > 0;

    return res.json({
      status: 'success',
      isAvailable: hasAvailability,
      availableTimes: hasAvailability ? availableTimesResponse.data.available_times : [],
      requestedTime: minStartTime
    });

  } catch (error) {
    console.error('Error checking availability:', error.response ? error.response.data : error.message);
    
    return res.status(error.response ? error.response.status : 500).json({
      status: 'error',
      message: error.response ? error.response.data : 'An error occurred while checking availability',
      details: error.message
    });
  }
});

// Make sure to listen on the PORT provided by Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});