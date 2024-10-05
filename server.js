require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const axios = require('axios'); // Make sure to import axios for making HTTP requests

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html on root request
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to fetch data
app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get('https://api.hcdp.ikewai.org/mesonet/getStations', {
            headers: {
                'Authorization': `Bearer ${process.env.API_TOKEN}` // Access API token from environment variables
            }
        });
        res.json(response.data); // Send the API response back to the client
    } catch (error) {
        console.error('Error fetching data:', error.message); // Log the error to the console
        res.status(500).json({ error: 'Error fetching data' }); // Send a 500 error response
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});