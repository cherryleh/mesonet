import { Component } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

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
      center: [20.7967, -156.3319], 
      zoom: 8
    });

    const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      minZoom: 0,
      maxZoom: 18
    });
    basemap.addTo(this.map);
  }

  private randomizeLatLon(lat: number, lon: number): { lat: number; lon: number } {
    const latOffset = (Math.random() - 0.5) * 0.0002; 
    const lonOffset = (Math.random() - 0.5) * 0.0002;
    return { lat: lat + latOffset, lon: lon + lonOffset };
  }

  fetchStationData(): void {
    this.route.queryParams.subscribe(params => {
      const stationId = params['id']; 
    
      // Determine the API URL based on the first character of stationId
      let apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=hawaii'; 
      if (stationId && stationId.startsWith('1')) {
        apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=american_samoa';
      }

      const apiToken = environment.apiToken;

      fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then((data: Station[]) => {
        let selectedStation: { lat: number; lon: number; name: string } | undefined; 

        data.forEach(station => {
          if (station.lat && station.lng && station.name) {
            let coords = this.randomizeLatLon(station.lat, station.lng);

            if (stationId && station.station_id === stationId) {
              selectedStation = { lat: coords.lat, lon: coords.lon, name: station.name }; 
            }

            const circle = L.circleMarker([coords.lat, coords.lon], {
              radius: 8,
              color: 'blue',
              fillColor: 'blue',
              fillOpacity: 0.2,
              weight: 2
            });

            const url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`;
            circle.bindPopup(`<a href="${url}" style="font-size: 20px" target="_blank">${station.name}</a>`);
            circle.addTo(this.map);
          }
        });

        if (selectedStation !== undefined) { 
          const selectedCircle = L.circleMarker([selectedStation.lat, selectedStation.lon], {
            radius: 10, 
            color: 'red', 
            fillColor: 'red', 
            fillOpacity: 0.7, 
            weight: 3 
          });

          const selectedUrl = `/mesonet/#/dashboard?id=${stationId}`;
          selectedCircle.bindPopup(`<a href="${selectedUrl}" style="font-size: 20px" target="_blank">${selectedStation.name}</a>`);
          selectedCircle.addTo(this.map);

          this.map.setView([selectedStation.lat, selectedStation.lon], 15);
        } else {
          console.warn('Station not found for ID:', stationId);
        }
      })
      .catch(error => {
        console.error('Error fetching station data:', error);
      });
    });
  }


}
