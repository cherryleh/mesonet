import { Component } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';

// Define the interface for station data
interface Station {
  station_id: string;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
}

@Component({
  selector: 'app-station-specific-map',
  standalone: true,
  templateUrl: './station-specific-map.component.html',
  styleUrl: './station-specific-map.component.css'
})
export class StationSpecificMapComponent {
  map!: L.Map;

  constructor(private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.fetchStationData();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [20.7967, -156.3319], // Default center
      zoom: 8
    });

    const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      minZoom: 0,
      maxZoom: 18
    });
    basemap.addTo(this.map);
  }

  fetchStationData(): void {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations';
    const apiToken = environment.apiToken;

    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then((data: Station[]) => { // Specify data type as Station[]

      // Read query parameters
      this.route.queryParams.subscribe(params => {
        const stationId = params['id']; // Get ID from URL query
        let foundStation: Station | undefined = data.find(station => station.station_id === stationId); // Find matching station

        // Add markers for all stations
        data.forEach(station => {
          if (station.lat && station.lng && station.name) {
            const circle = L.circleMarker([station.lat, station.lng], {
              radius: 5,
              color: 'blue',
              fillColor: 'blue',
              fillOpacity: 0.2,
              weight: 2
            });
            const url = `/mesonet/#/dashboard?id=${station.station_id}`;
            circle.bindPopup(`<a href="${url}" style="font-size: 20px" target="_blank">${station.name}</a>`);
            circle.addTo(this.map);
          }
        });

        // Center map on the matching station
        if (foundStation) {
          this.map.setView([foundStation.lat, foundStation.lng], 10); // Use lat & lng safely
        }
      });
    })
    .catch(error => {
      console.error('Error fetching station data:', error);
    });
  }
}
