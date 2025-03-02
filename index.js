// Endpoint to check availability following Calendly's official API docs
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
    console.log(`Using user URI: ${CALENDLY_USER_URI}`);

    // Step 1: Get user's event types
    const eventTypesResponse = await axios.get('https://api.calendly.com/event_types', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        'user': CALENDLY_USER_URI
      }
    });

    console.log(`Retrieved ${eventTypesResponse.data.collection.length} event types`);

    // If no event types are found
    if (!eventTypesResponse.data.collection || eventTypesResponse.data.collection.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No event types found for this user'
      });
    }

    // For simplicity, use the first active event type
    const activeEventTypes = eventTypesResponse.data.collection.filter(et => et.active);
    if (activeEventTypes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No active event types found for this user'
      });
    }

    const eventType = activeEventTypes[0];
    console.log(`Using event type: ${eventType.name} (${eventType.uri})`);

    // Step 2: Calculate end time (7 days from start time)
    const startDate = new Date(minStartTime);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    const maxEndTime = endDate.toISOString();

    // Step 3: Get user availability
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

    // Step 4: Check if the specific time is available
    const requestedDate = new Date(minStartTime);
    const requestHour = requestedDate.getUTCHours();
    const requestMinute = requestedDate.getUTCMinutes();
    const requestDay = requestedDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
    
    let isAvailable = false;
    let availableTimes = [];
    
    if (availabilityResponse.data && 
        availabilityResponse.data.resource && 
        availabilityResponse.data.resource.availability_schedules) {
      
      // Extract available times from the response
      const availabilitySchedules = availabilityResponse.data.resource.availability_schedules;
      
      // Check each schedule for available times
      for (const schedule of availabilitySchedules) {
        if (schedule.available_times && schedule.available_times.length > 0) {
          availableTimes = [...availableTimes, ...schedule.available_times];
        }
      }
      
      // Check if the requested time matches any available time
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
      availableTimes: availableTimes.slice(0, 5) // Limit to first 5 available times for brevity
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