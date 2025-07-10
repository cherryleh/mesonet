import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import 'leaflet.fullscreen';
import * as Papa from 'papaparse';


@Component({
  selector: 'app-station-map',
  standalone: true,
  imports: [FormsModule, CommonModule], 
  templateUrl: './station-selection-map.component.html',
  styleUrls: ['./station-selection-map.component.css']
})

export class StationSelectionMapComponent implements AfterViewInit {
  map!: L.Map;
  selectedIsland: string = 'All Islands';

  islandList = [
    { value: 'All Islands', label: 'All Islands' },
    { value: 'Hawaii', label: 'Hawaiʻi' },
    { value: 'Kauai', label: 'Kauaʻi' },
    { value: 'Maui', label: 'Maui' },
    { value: 'Molokai', label: 'Molokaʻi' },
    { value: 'Oahu', label: 'Oʻahu' }
  ];
  
  featuremap: { [key: string]: any } = {
    'All Islands': { lat: 20.389, lon: -157.52275766141424 },
    'Hawaii': { lat: 19.5429, lon: -155.6659 },
    'Kauai': { lat: 22.0974, lon: -159.5261 },
    'Maui': { lat: 20.7984, lon: -156.3319 },
    'Molokai': { lat: 21.1444, lon: -157.0226 },
    'Oahu': { lat: 21.4389, lon: -158.0001 }
  };

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.fetchStationData();
    }, 50); 
  }


  private initMap(): void {
    const latitude = 20.389;
    const longitude = -157.52275766141424;

    this.map = L.map('map', {
      center: [latitude, longitude],
      zoom: 7,
      fullscreenControl: true
    });



    const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      minZoom: 0,
      maxZoom: 18
    });
    basemap.addTo(this.map);

    this.map.on('enterFullscreen', () => {
      this.map.setZoom(this.map.getZoom() + 1); // Zoom in one level
    });

    this.map.on('exitFullscreen', () => {
      this.map.setZoom(this.map.getZoom() - 1); // Zoom out one level
    });


    this.addLegend();
  }

  private addLegend(): void {
    const LegendControl = L.Control.extend({
      options: { position: 'bottomright' },

      onAdd: function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <h4>Status</h4>
          <i style="background: blue; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px;"></i> Active<br>
          <i style="background: orange; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px;"></i> Planned<br>
          <i style="background: gray; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px;"></i> Inactive
        `;
        return div;
      }
    });

    const legend = new LegendControl();
    legend.addTo(this.map);
  }




  zoomToIsl(): void {
    const obj = this.featuremap[this.selectedIsland];
    if (obj) {
      let zoomLevel = 10;

      if (this.selectedIsland === 'Hawaii') {
        zoomLevel = 8.5;
      } else if (this.selectedIsland === 'Lanai') {
        zoomLevel = 11;
      } else if (this.selectedIsland === 'All Islands') {
        zoomLevel = 7;
      }

      this.map.setView([obj.lat, obj.lon], zoomLevel);
    }
  }

  fetchStationData(): void {
    const csvUrl = 'https://raw.githubusercontent.com/HCDP/loggernet_station_data/refs/heads/db-handler/csv_data/stations/station_metadata.csv';

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const data: any[] = results.data;

        data.forEach(station => {
          const lat = parseFloat(station.lat);
          const lng = parseFloat(station.lng);
          const name = station.full_name;
          const status = station.status?.toLowerCase();

          if (!isNaN(lat) && !isNaN(lng) && name) {
            const randomizedCoords = this.randomizeLatLon(lat, lng);

            let markerColor = 'blue';
            let fillOpacity = 0.1;

            if (status === 'inactive') {
              markerColor = 'gray';
              fillOpacity = 0.4;
            } else if (status === 'planned') {
              markerColor = 'orange';
              fillOpacity = 0.5;
            } else if (status === 'active') {
              markerColor = 'blue';
              fillOpacity = 0.5;
            }

            const circle = L.circleMarker(
              [randomizedCoords.lat, randomizedCoords.lon],
              {
                radius: 6,
                color: markerColor,
                fillColor: markerColor,
                fillOpacity,
                weight: 1
              }
            );

            const statusFormatted = status.charAt(0).toUpperCase() + status.slice(1);
            let url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/`;

            if (status === 'active') {
              url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`;
            } else if (status === 'planned') {
              url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/station-info?id=${station.station_id}`;
            } else if (status === 'inactive') {
              url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/graphing?id=${station.station_id}`;
            }

            circle.bindPopup(`
              <div style="font-size: 14px;">
                <a href="${url}" style="font-size: 20px; display: block; margin-bottom: 5px;" target="_blank">${name}</a>
                <strong>Status:</strong> ${statusFormatted || 'Unknown'}
              </div>
            `);

            circle.addTo(this.map);
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading CSV:', error);
      }
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
