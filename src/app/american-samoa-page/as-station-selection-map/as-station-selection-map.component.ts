import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-as-station-selection-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './as-station-selection-map.component.html',
  styleUrl: './as-station-selection-map.component.css'
})
export class AsStationSelectionMapComponent implements AfterViewInit {
  map!: L.Map;
  ngAfterViewInit(): void {
    this.initMap();
    this.fetchStationData();
    this.addLegend();
  }

  private initMap(): void {
    const latitude = -14.302298;
    const longitude = -170.695855;

    

    this.map = L.map('as-map', {
      center: [latitude, longitude],
      zoom: 12
    });

    const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
      minZoom: 0,
      maxZoom: 18
    });
    basemap.addTo(this.map);
  }

  fetchStationData(): void {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=american_samoa';
    const apiToken = environment.apiToken;

    fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Stations request failed: ${response.status} ${response.statusText} ${text}`);
        }
        return response.json();
      })
      .then((data: any[]) => {
        console.log('Fetched data:', data);

        data.forEach((station) => {
          const lat = station.lat != null ? parseFloat(station.lat) : NaN;
          const lng = station.lng != null ? parseFloat(station.lng) : NaN;

          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !station.name || !station.station_id) {
            return; // skip null/invalid coords
          }

          const randomized = this.randomizeLatLon(lat, lng);
          const stationId = String(station.station_id);

          const isStreamGauge = stationId.startsWith('14');
          const color = isStreamGauge ? 'red' : 'blue';
          const stationType = isStreamGauge ? 'Stream gauge' : 'Weather station';

          const circle = L.circleMarker([randomized.lat, randomized.lon], {
            radius: 6,
            color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 2,
          });

          const url = `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${stationId}`;
          circle.bindPopup(`
            <a href="${url}" style="font-size: 20px" target="_blank" rel="noopener">${station.name}</a><br>
            <b>${stationType}</b>
          `);

          circle.addTo(this.map);
        });
      })
      .catch((error) => {
        console.error('Error fetching station data:', error);
      });
  }

  private randomizeLatLon(lat: number, lon: number): { lat: number; lon: number } {
    const latOffset = (Math.random() - 0.5) * 0.0002;
    const lonOffset = (Math.random() - 0.5) * 0.0002;
    return { lat: lat + latOffset, lon: lon + lonOffset };
  }


  private addLegend(): void {
    const legend = new (L.Control.extend({
      options: { position: 'bottomright' },

      onAdd: function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <strong>Legend</strong><br>
          <i style="background: red; width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></i> Stream Gauge <br>
          <i style="background: blue; width: 12px; height: 12px; display: inline-block; margin-right: 5px;"></i> Weather Station
        `;
        return div;
      }
    }))();

    legend.addTo(this.map);
  }



  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 0);
    }
  }

}
