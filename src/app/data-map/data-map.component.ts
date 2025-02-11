import { Component, AfterViewInit  } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { environment } from "../../environments/environment";  
import { interpolateViridis } from "d3-scale-chromatic"; // ✅ Correct import for Viridis



@Component({
  selector: 'app-data-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-map.component.html',
  styleUrl: './data-map.component.css'
})
export class DataMapComponent implements AfterViewInit {
  private map!: L.Map;
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
  private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=Tsoil_1_Avg&local_tz=True&start_date=2025-01-30T11:15:00-10:00';
  private apiToken = environment.apiToken;  // ✅ Use imported environment variable

  async fetchStationData(): Promise<void> {
    try {
      const stations: { station_id: string; name: string; lat: number; lng: number }[] = 
        await fetch(this.apiUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

      const stationIds = stations.map((station: { station_id: string }) => station.station_id).join(",");

      const measurements: { station_id: string; value: number }[] = 
        await fetch(`${this.measurementsUrl}&station_ids=${stationIds}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

      const measurementMap: { [key: string]: number } = {};
      measurements.forEach((measurement: { station_id: string; value: number }) => {
        if (measurement.station_id && measurement.value !== undefined) {
          measurementMap[measurement.station_id] = measurement.value;
        }
      });

      const values = Object.values(measurementMap).filter(v => v !== null);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      this.addLegend(minValue, maxValue);


      stations.forEach((station: { station_id: string; name: string; lat: number; lng: number }) => {
        if (station.lat && station.lng) {
          let value = measurementMap[station.station_id] ?? null; // Ensure value is defined
          let numericValue = value !== null ? Number(value) : null; // Convert to number

          let color = numericValue !== null && !isNaN(numericValue) 
            ? this.getColorFromValue(numericValue, minValue, maxValue) 
            : "gray";

          const marker = L.circleMarker([station.lat, station.lng], {
            radius: 8,
            color: color,
            fillColor: color,
            fillOpacity: 0.8
          }).addTo(this.map);

          marker.bindPopup(`
            <b>${station.name}</b><br>
            Temperature: ${numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) + "°C" : "No Data"}<br>
            <a href="https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}" target="_blank">
              Open Dashboard
            </a>
          `);

          // ✅ Click event to update the side panel
          marker.on('click', () => {
            this.selectedStation = {
              name: station.name,
              lat: station.lat,
              lng: station.lng,
              value: numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) : "No Data"
            };
          });
        }
      });



    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  private getColorFromValue(value: number, min: number, max: number): string {
    const scale = interpolateViridis((value - min) / (max - min)); // Normalize to 0-1
    return scale;
  }

  selectedStation: any = null; // Store selected station for sidebar

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [20.389, -157.52275766141424],
      zoom: 8,
      layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')]
    });

    this.fetchStationData();
  }

  private addLegend(minValue: number, maxValue: number): void {
    const legend = new L.Control({ position: "bottomright" } as any);


    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");

      // ✅ Create a color gradient bar for continuous scale
      div.innerHTML = `
        <h4>Temperature (°C)</h4>
        <div style="width: 200px; height: 15px; background: linear-gradient(to right, 
        ${interpolateViridis(0)}
        ${interpolateViridis(0.25)}
        ${interpolateViridis(0.5)}
        ${interpolateViridis(0.75)}
        ${interpolateViridis(1)}

        );"></div>
        <div style="display: flex; justify-content: space-between;">
          <span>${minValue.toFixed(1)}°C</span>
          <span>${maxValue.toFixed(1)}°C</span>
        </div>
      `;

      return div;
    };

    legend.addTo(this.map);
  }



}