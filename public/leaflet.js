var latitude = 20.389
var longitude = -157.52275766141424


var map = L.map('map', {
    center: [latitude, longitude],
    zoom: 7
});

var basemap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {});
basemap.addTo(map);

// Read markers data from data.csv
$.get('https://raw.githubusercontent.com/HCDP/loggernet_station_data/refs/heads/main/csv_data/metadata/metadata.csv', function (csvString) {

    // Use PapaParse to convert string to array of objects
    var data = Papa.parse(csvString, { header: true, dynamicTyping: true }).data;

    // For each row in data, create a marker and add it to the map
    // For each row, columns `Latitude`, `Longitude`, and `Title` are required
    for (var i in data) {
        var row = data[i];

        var marker = L.marker([row.lat, row.lon], {
            opacity: 1
        }).bindPopup(row.Title);

        marker.addTo(map);
    }

});

map.attributionControl.setPrefix(
    'View <a href="https://github.com/HandsOnDataViz/leaflet-map-csv" target="_blank">code on GitHub</a>'
);