
    var latitude = 20.389;
    var longitude = -157.52275766141424;

    // Initialize the map
    var map = L.map('map', {
        center: [latitude, longitude],
        zoom: 7
    });

    // Add the basemap
    var basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
        minZoom: 0,
        maxZoom: 18
    });
    basemap.addTo(map);

    // Fetch data from your Node.js server instead of the external API
    fetch('/api/data')  // Request to your server-side endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json(); // Parse the JSON response
        })
        .then(stations => {
            // Loop through each station and add a marker on the map
            stations.forEach(station => {
                var url = 'station.html?id=' + station.site_id; // Link to station details
                var marker = L.circleMarker([station.latitude, station.longitude], {
                    color: "white",
                    fillColor: "blue",
                    fillOpacity: 0.5,
                    radius: 8,
                }).bindPopup('<a href="'+ url +'" style="font-size: 20px" target="_blank">' + station.site_name + '</a>');

                // Add marker to the map
                marker.addTo(map);
            });
        })
        .catch(error => {
            console.error('Error fetching the stations:', error);
        });

    // Update map attribution
    map.attributionControl.setPrefix(
        'View <a href="https://github.com/HandsOnDataViz/leaflet-map-csv" target="_blank">code on GitHub</a>'
    );

