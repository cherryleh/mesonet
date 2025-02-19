import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-station-map',
  standalone: true,
  imports: [FormsModule, CommonModule], 
  templateUrl: './station-selection-map.component.html',
  styleUrls: ['./station-selection-map.component.css']
})

export class StationSelectionMapComponent implements AfterViewInit {
  map!: L.Map;
  selectedIsland: string = '';

  islandList = [
    { value: 'Hawaii', label: 'Hawaiʻi' },
    { value: 'Kauai', label: 'Kauaʻi' },
    { value: 'Maui', label: 'Maui' },
    { value: 'Molokai', label: 'Molokaʻi' },
    { value: 'Oahu', label: 'Oʻahu' }
  ];
  
  featuremap: { [key: string]: any } = {
    'Hawaii': { lat: 19.5429, lon: -155.6659 },
    'Kauai': { lat: 22.0974, lon: -159.5261 },
    'Maui': { lat: 20.7984, lon: -156.3319 },
    'Molokai': { lat: 21.1444, lon: -157.0226 },
    'Oahu': { lat: 21.4389, lon: -158.0001 }
  };

  ngAfterViewInit(): void {
    this.initMap();
    this.fetchStationData();
  }

  private initMap(): void {
    const latitude = 20.389;
    const longitude = -157.52275766141424;

    this.map = L.map('map', {
      center: [latitude, longitude],
      zoom: 7
    });

    const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      minZoom: 0,
      maxZoom: 18
    });
    basemap.addTo(this.map);
  }

  zoomToIsl(): void {
    const obj = this.featuremap[this.selectedIsland];
    if (obj) {
      let zoomLevel = 10;

      if (this.selectedIsland === 'Hawaii') {
        zoomLevel = 8.5;
      } else if (this.selectedIsland === 'Lanai') {
        zoomLevel = 11;
      }

      this.map.setView([obj.lat, obj.lon], zoomLevel);
    }
  }

  fetchStationData(): void {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=hawaii'; 
    const apiToken = environment.apiToken; 
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`, 
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then((data: any[]) => {
      data.forEach(station => {
        if (station.lat && station.lng && station.name) {
          const randomizedCoords = this.randomizeLatLon(station.lat, station.lng);

          const circle = L.circleMarker([randomizedCoords.lat, randomizedCoords.lon],
            {radius: 6, 
              color: 'blue', 
              fillColor: 'blue', 
              fillOpacity: 0.2, 
              weight: 2});
            const url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`;
            circle.bindPopup(`<a href="${url}" style="font-size: 20px" target="_blank">${station.name}</a>`);
          circle.addTo(this.map);
        }
      });
    })
    .catch(error => {
      console.error('Error fetching station data:', error);
    });
  }

  private randomizeLatLon(lat: number, lon: number): { lat: number; lon: number } {
    const latOffset = (Math.random() - 0.5) * 0.0002; 
    const lonOffset = (Math.random() - 0.5) * 0.0002;
    return { lat: lat + latOffset, lon: lon + lonOffset };
  }


  getIslands(): string {
    const selected = this.islandList.find(island => island.value === this.selectedIsland);
    return selected ? selected.label : 'Select Island';
  }

  selectIsland(value: string): void {
    this.selectedIsland = value;
    this.zoomToIsl(); 
  }

  invalidateMapSize(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

}
