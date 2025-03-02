const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/check-availability', async (req, res) => {
  try {
    const { date, email } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // You would typically use your Calendly API token here
    const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;
    
    if (!CALENDLY_API_TOKEN) {
      return res.status(500).json({ error: 'Calendly API token not configured' });
    }
    
    const response = await axios.get('https://api.calendly.com/availability', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        date,
        email
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error checking availability:', error.message);
    return res.status(500).json({ 
      error: 'Failed to check availability',
      details: error.response?.data || error.message
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Default route
app.get('/', (req, res) => {
  res.send('Calendly Availability Checker API is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing purposes
module.exports = app;