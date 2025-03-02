// Replace your current check-availability endpoint with this one
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

    console.log(`Checking availability for time: ${minStartTime}`);
    
    // Check if necessary environment variables are set
    if (!CALENDLY_API_TOKEN) {
      return res.status(500).json({
        status: 'error',
        message: 'Calendly API token is not configured'
      });
    }

    if (!CALENDLY_USER_URI) {
      return res.status(500).json({
        status: 'error',
        message: 'Calendly User URI is not configured'
      });
    }

    // Calculate end time (7 days from start time)
    const startDate = new Date(minStartTime);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    const maxEndTime = endDate.toISOString();

    // Get user availability from Calendly
    console.log(`Requesting availability from ${minStartTime} to ${maxEndTime}`);
    const availabilityResponse = await axios.get('https://api.calendly.com/user_availability', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        'user': CALENDLY_USER_URI,
        'start_time': minStartTime,
        'end_time': maxEndTime
      }
    });

    console.log('Retrieved user availability data');

    // Check if the specific time is available
    const requestedDate = new Date(minStartTime);
    const requestHour = requestedDate.getUTCHours();
    const requestMinute = requestedDate.getUTCMinutes();
    const requestDay = requestedDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
    
    // Initialize variables
    let isAvailable = false;
    let availableTimes = [];
    
    // Process availability data from Calendly
    if (availabilityResponse.data && 
        availabilityResponse.data.resource) {
      
      // Calendly v2 API might return the data in different formats depending on the account type
      // Let's handle both array and direct object formats
      if (availabilityResponse.data.resource.available_times) {
        // Direct available_times array
        availableTimes = availabilityResponse.data.resource.available_times;
      } else if (availabilityResponse.data.resource.availability_intervals) {
        // Array of availability intervals
        availabilityResponse.data.resource.availability_intervals.forEach(interval => {
          // Convert intervals to discrete times (e.g., every 30 minutes)
          const start = new Date(interval.start_time);
          const end = new Date(interval.end_time);
          
          // Create 30-minute slots
          while (start < end) {
            availableTimes.push(new Date(start).toISOString());
            start.setMinutes(start.getMinutes() + 30);
          }
        });
      } else if (availabilityResponse.data.resource.availability_schedules) {
        // Schedules with available_times
        availabilityResponse.data.resource.availability_schedules.forEach(schedule => {
          if (schedule.available_times) {
            availableTimes = [...availableTimes, ...schedule.available_times];
          }
        });
      }
      
      // Check if requested time matches an available time
      isAvailable = availableTimes.some(timeSlot => {
        const slotDate = new Date(timeSlot);
        return slotDate.toISOString().split('T')[0] === requestDay && 
               slotDate.getUTCHours() === requestHour && 
               slotDate.getUTCMinutes() === requestMinute;
      });
    }

    // Return the response
    return res.json({
      status: 'success',
      isAvailable: isAvailable,
      requestedTime: minStartTime,
      availableTimes: availableTimes.slice(0, 10) // Limit to first 10 available times
    });

  } catch (error) {
    console.error('Error checking availability:');
    
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Status code:', error.response.status);
      
      return res.status(error.response.status).json({
        status: 'error',
        message: error.response.data,
        details: `Request failed with status code ${error.response.status}`
      });
    } else {
      console.error('Error message:', error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while checking availability',
        details: error.message
      });
    }
  }
});