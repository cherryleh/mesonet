import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { environment } from "../../environments/environment";  
import { interpolateViridis } from "d3-scale-chromatic";
import { HeaderComponent } from '../header/header.component';

interface Station {
  station_id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Measurement {
  station_id: string;
  value: number;
}

@Component({
  selector: 'app-diagnostic-map',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './diagnostic-map.component.html',
  styleUrls: ['./diagnostic-map.component.css']
})
export class DiagnosticMapComponent implements AfterViewInit {
  constructor(private cdr: ChangeDetectorRef) {}

  private map!: L.Map;
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
  private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii';
  private apiToken = environment.apiToken;

  selectedVariable = "BattVolt"; 
  variableOptions = [
    { id: "BattVolt", name: "Battery Voltage" },
    { id: "Tair_1_Avg", name: "Air Temperature" },
    { id: "Tsoil_1_Avg", name: "Soil Temperature" },
    { id: "RF_1_Tot300s", name: "Rainfall" }
  ];

  selectedStation: any = null;
  latestObservationTime: string | null = null;

  async fetchLatestObservationTime(): Promise<string | null> {
    try {
      const url = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=0115&local_tz=True&limit=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
      });

      const data: Measurement[] = await response.json();
      if (data.length > 0 && (data[0] as any).timestamp) {
        const rawTimestamp = (data[0] as any).timestamp;
        this.latestObservationTime = this.formatTimestamp(rawTimestamp);
        return rawTimestamp;
      }
    } catch (error) {
      console.error("Error fetching latest observation time:", error);
    }
    return null;
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Pacific/Honolulu' 
    }).format(date);

    return formattedDate;
  }

  async fetchStationData(): Promise<void> {
    try {
      const latestTime = await this.fetchLatestObservationTime();
      if (!latestTime) return;

      const stations: Station[] = await fetch(this.apiUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
      }).then(res => res.json());

      const stationIds = stations.map((station: Station) => station.station_id).join(",");
      const measurementsApiUrl = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=${stationIds}&local_tz=True&start_date=${latestTime}`;
      
      const measurements: Measurement[] = await fetch(measurementsApiUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
      }).then(res => res.json());

      const measurementMap: { [key: string]: number } = {};
      measurements.forEach((measurement: Measurement) => {
        measurementMap[measurement.station_id] = measurement.value;
      });

      this.map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
          this.map.removeLayer(layer);
        }
      });

      const values = Object.values(measurementMap);
      if (values.length === 0) return;

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      this.addLegend(minValue, maxValue);

      stations.forEach((station: Station) => {
        const value = measurementMap[station.station_id] ?? null;
        const color = value !== null ? this.getColorFromValue(value, minValue, maxValue) : "gray";

        const marker = L.circleMarker([station.lat, station.lng], {
          radius: 8,
          color: color,
          fillColor: color,
          fillOpacity: 0.8
        }).addTo(this.map);

        marker.on('click', () => {
          this.selectedStation = {
            name: station.name,
            lat: station.lat,
            lng: station.lng,
            value: value !== null ? value.toFixed(1) : "No Data",
            variable: this.selectedVariable
          };
          this.fetchStationDetails(station.station_id);
        });
      });

    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  private getColorFromValue(value: number, min: number, max: number): string {
    if (min === max) return interpolateViridis(0.5);
    return interpolateViridis((value - min) / (max - min));
  }

  private addLegend(minValue: number, maxValue: number): void {
    const existingLegend = document.querySelector(".info.legend");
    if (existingLegend) {
        existingLegend.remove();
    }

    const legend = new L.Control({ position: "bottomright" } as any);

    legend.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend");

        div.innerHTML = `
            <h4>${this.selectedVariable}</h4>
            <div id="legend-gradient" style="width: 200px; height: 15px; margin-bottom: 5px;"></div>
            <div style="display: flex; justify-content: space-between;">
                <span>${minValue.toFixed(1)}</span>
                <span>${maxValue.toFixed(1)}</span>
            </div>
        `;

        return div;
    };

    legend.addTo(this.map);

    setTimeout(() => {
        const gradientDiv = document.getElementById("legend-gradient");
        if (gradientDiv) {
            let gradientColors = [];

            // Generate colors for the legend (5 evenly spaced steps)
            for (let i = 0; i <= 10; i++) {
                const value = i / 10; // Normalized value between 0 and 1
                const color = interpolateViridis(value); // Get corresponding Viridis color
                gradientColors.push(color);
            }

            // Create a linear gradient background
            gradientDiv.style.background = `linear-gradient(to right, ${gradientColors.join(", ")})`;
            gradientDiv.style.border = "1px solid black";
        }
    }, 100);
  }


  async fetchStationDetails(stationId: string): Promise<void> {
    console.log("Fetching station details for:", stationId);
  }

  updateVariable(event: Event): void {
    this.selectedVariable = (event.target as HTMLSelectElement).value;
    this.fetchStationData(); 
  }

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [20.493410, -158.064388],
      zoom: 8,
      layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')],
      zoomControl: false 
    });

    L.control.zoom({ position: "bottomleft" }).addTo(this.map);
    setTimeout(() => {
      this.fetchStationData();
    }, 500);
  }

  
}
