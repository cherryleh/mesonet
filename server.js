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

// // API route to fetch data
// app.get('/api/data', async (req, res) => {
//     try {
//         const response = await axios.get('https://api.hcdp.ikewai.org/mesonet/getStations', {
//             headers: {
//                 'Authorization': `Bearer ${process.env.API_TOKEN}` // Access API token from environment variables
//             }
//         });
//         res.json(response.data); // Send the API response back to the client
//     } catch (error) {
//         console.error('Error fetching data:', error.message); // Log the error to the console
//         res.status(500).json({ error: 'Error fetching data' }); // Send a 500 error response
//     }
// });

// // Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

const apiToken = process.env.API_TOKEN; // Load API token from environment variables

const fetchData = async (url, res) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Error fetching data' });
    }
};

app.get('/api/data', (req, res) => {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/getStations'; // Replace with your actual API URL
    fetchData(apiUrl, res);
});

app.get('/api/data2', (req, res) => {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/getMeasurements?station_id=0281&start_date=2024-09-24T00:00:00-10:00&end_date=2024-10-01T00:00:00-10:00&var_ids=Tair_1_Avg,RF_1_Tot'; // Replace with your actual API URL
    fetchData(apiUrl, res);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});