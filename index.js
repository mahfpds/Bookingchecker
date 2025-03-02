require('dotenv').config();

const axios = require('axios');

// Function to check availability for a given date/time
async function checkAvailability(minStartTime) {
  try {
    // Ensure minStartTime is in ISO 8601 format (e.g., "2025-03-02T09:00:00Z")
    const formattedStartTime = new Date(minStartTime).toISOString();
    const maxStartTime = new Date(new Date(minStartTime).getTime() + 30 * 60000).toISOString(); // Add 30 minutes

    // Calendly API endpoint and configuration
    const url = 'https://api.calendly.com/scheduled_events';
    const token = process.env.CALENDLY_API_TOKEN; // Stored in .env

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        min_start_time: formattedStartTime,
        max_start_time: maxStartTime,
      },
    });

    const events = response.data.collection;

    // Logic to check availability: if no events overlap, it's available
    const isAvailable = events.length === 0 || !events.some(event => {
      const eventStart = new Date(event.start_time).getTime();
      const eventEnd = new Date(event.end_time).getTime();
      const requestStart = new Date(formattedStartTime).getTime();
      const requestEnd = new Date(maxStartTime).getTime();
      return requestStart < eventEnd && requestEnd > eventStart;
    });

    return {
      min_start_time: formattedStartTime,
      available: isAvailable,
      message: isAvailable ? 'The time slot is available.' : 'The time slot is booked.',
      events: events, // Optional: return events for debugging
    };
  } catch (error) {
    console.error('Error checking availability:', error.response ? error.response.data : error.message);
    throw new Error('Failed to check availability');
  }
}

// Example endpoint to test the function (for Railway)
const express = require('express');
const app = express();

app.use(express.json());

app.get('/check-availability', async (req, res) => {
  const { min_start_time } = req.query;
  if (!min_start_time) {
    return res.status(400).json({ error: 'min_start_time is required' });
  }

  try {
    const result = await checkAvailability(min_start_time);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server (Railway will handle port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { checkAvailability }; // For testing or import