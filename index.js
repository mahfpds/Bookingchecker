// Add this endpoint to your index.js file
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

    // Cal.com API endpoint for availability
    const calApiKey = process.env.CAL_API_KEY;
    const calEventTypeId = process.env.CAL_EVENT_TYPE_ID;
    
    if (!calApiKey || !calEventTypeId) {
      return res.status(500).json({
        status: 'error',
        message: 'Cal.com credentials not configured'
      });
    }

    // Calculate date range (current day to a week in the future)
    const startDate = new Date(minStartTime);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    // Format dates as required by Cal.com API
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Call Cal.com API
    const availabilityResponse = await axios.get(
      `https://api.cal.com/v1/availability/${calEventTypeId}`,
      {
        headers: {
          Authorization: `Bearer ${calApiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          dateFrom: startDateStr,
          dateTo: endDateStr,
          withCredentials: true
        }
      }
    );

    // Check if the requested time is available
    const requestedDateTime = new Date(minStartTime);
    let isAvailable = false;
    
    if (availabilityResponse.data && availabilityResponse.data.busy) {
      // Cal.com returns busy times, so we need to check if our time conflicts with any
      isAvailable = !availabilityResponse.data.busy.some(busySlot => {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        return requestedDateTime >= busyStart && requestedDateTime <= busyEnd;
      });
    }

    // Return the response
    return res.json({
      status: 'success',
      isAvailable: isAvailable,
      requestedTime: minStartTime
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking availability',
      details: error.message
    });
  }
});