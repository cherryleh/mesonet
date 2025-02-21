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
  variable: string;
  timestamp: string;
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
    { id: "CellStr", name: "Cellular signal strength" },
    { id: "CellQlt", name: "Cellular signal quality" },
    { id: "RHenc", name: "Enclosure relative humidity" }
  ];

  selectedStation: any = null;
  latestObservationTime: string | null = null;

  async fetchLatestObservationTime(): Promise<void> {
    try {
      const url = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=0115&local_tz=True&limit=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
      });

      const data: Measurement[] = await response.json();
      if (data.length > 0 && data[0].timestamp) {
        this.latestObservationTime = this.formatTimestamp(data[0].timestamp);
      }
    } catch (error) {
      console.error("Error fetching latest observation time:", error);
    }
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
        await this.fetchLatestObservationTime();

        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        const stationIds = stations.map(station => station.station_id).join(",");
        const measurementsApiUrl = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=${stationIds}&local_tz=True&limit=${stations.length}`;
        console.log('Measurements API', measurementsApiUrl);

        const measurements: Measurement[] = await fetch(measurementsApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        console.log("Fetched Measurements:", measurements);


        const measurementMap = Object.fromEntries(
            measurements.map(measurement => [measurement.station_id, measurement.value])
        );

        // Remove old markers before adding new ones
        this.map.eachLayer(layer => {
          if (layer instanceof L.CircleMarker) {
              this.map.removeLayer(layer);
          }
      });

      // Add a delay to ensure old markers are removed before adding new ones
      setTimeout(() => {
          stations.forEach(station => {
              const value = measurementMap[station.station_id] ?? null;
              const color = value !== null ? this.getColorFromValue(value, minValue, maxValue) : "gray";

              const marker = L.circleMarker([station.lat, station.lng], {
                  radius: 8,
                  color,
                  fillColor: color,
                  fillOpacity: 0.8
              }).addTo(this.map);

              marker.on('click', async () => {
                  console.log(`Clicked on station: ${station.name}, Value: ${value}`);

                  const numericValue = value !== null ? parseFloat(value as any) : null; 
                  console.log(`Converted Numeric Value:`, numericValue);

                  this.selectedStation = {
                      name: station.name,
                      lat: station.lat,
                      lng: station.lng,
                      value: numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) : "No Data",
                      variable: this.selectedVariable
                  };

                  // Fetch additional details
                  await this.fetchStationDetails(station.station_id);

                  // Force UI update
                  this.cdr.detectChanges();
                  this.cdr.markForCheck();
              });
          });

          this.cdr.detectChanges(); // Ensure UI updates
      }, 100);


        const values = Object.values(measurementMap).filter(v => v !== null);
        if (values.length === 0) return;

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        this.addLegend(minValue, maxValue);

        stations.forEach(station => {
          const value = measurementMap[station.station_id] ?? null;
          const color = value !== null ? this.getColorFromValue(value, minValue, maxValue) : "gray";

          const marker = L.circleMarker([station.lat, station.lng], {
              radius: 8,
              color,
              fillColor: color,
              fillOpacity: 0.8
          }).addTo(this.map);

          marker.on('click', async () => {
            console.log(`Clicked on station: ${station.name}, Raw Value:`, value);

            const numericValue = value !== null ? parseFloat(value as any) : null; 

            console.log(`Converted Numeric Value:`, numericValue);

            this.selectedStation = {
                name: station.name,
                lat: station.lat,
                lng: station.lng,
                value: numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) : "No Data",
                variable: this.selectedVariable
            };

            // Fetch additional details
            await this.fetchStationDetails(station.station_id);

            // Ensure UI updates
            this.cdr.detectChanges();
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

            for (let i = 0; i <= 10; i++) {
                const value = i / 10; // Normalized value between 0 and 1
                const color = interpolateViridis(value); // Get corresponding Viridis color
                gradientColors.push(color);
            }

            gradientDiv.style.background = `linear-gradient(to right, ${gradientColors.join(", ")})`;
            gradientDiv.style.border = "1px solid black";
        }
    }, 100);
  }

  async fetchStationDetails(stationId: string): Promise<void> {
    try {
        const battVoltApiUrl = `${this.measurementsUrl}&var_ids=BattVolt&station_ids=${stationId}&local_tz=True&limit=288`;
        console.log('Batt volt API', battVoltApiUrl);
        const latestValuesApiUrl = `${this.measurementsUrl}&var_ids=CellStr,CellQlt,RHenc&station_ids=${stationId}&local_tz=True&limit=3`;
        console.log('Latest values API', latestValuesApiUrl);

        const [battVoltResponse, latestValuesResponse] = await Promise.all([
            fetch(battVoltApiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
            }),
            fetch(latestValuesApiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
            })
        ]);

        const battVoltMeasurements: Measurement[] = await battVoltResponse.json();
        const latestMeasurements: Measurement[] = await latestValuesResponse.json();

        let latestDetails: { [key: string]: string } = {
            ["BattVolt"]: "No Data",
            ["Min24h"]: "No Data",
            ["Max24h"]: "No Data",
            ["CellStr"]: "No Data",
            ["CellQlt"]: "No Data",
            ["RHenc"]: "No Data"
        };

        // Process BattVolt data (24h history)
        let battVoltValues: number[] = battVoltMeasurements
            .map(m => parseFloat(m.value as any))
            .filter(v => !isNaN(v));

        if (battVoltValues.length > 0) {
            latestDetails["BattVolt"] = battVoltValues[battVoltValues.length - 1].toFixed(2);
            latestDetails["Min24h"] = Math.min(...battVoltValues).toFixed(2);
            latestDetails["Max24h"] = Math.max(...battVoltValues).toFixed(2);
        }

        // Process latest values for CellStr, CellQlt, RHenc
        latestMeasurements.forEach(measurement => {
            const numericValue = parseFloat(measurement.value as any);
            if (!isNaN(numericValue)) {
                latestDetails[measurement.variable] = numericValue.toFixed(2);
            }
        });

        // Update station details
        this.selectedStation = {
            ...this.selectedStation,
            details: latestDetails,
            detailsTimestamp: this.formatTimestamp(battVoltMeasurements[battVoltMeasurements.length - 1]?.timestamp || "")
        };

        // Trigger UI update
        this.cdr.detectChanges();
    } catch (error) {
        console.error("Error fetching station details:", error);
    }
}

updateVariable(event: Event): void {
  this.selectedVariable = (event.target as HTMLSelectElement).value;
  console.log(`Selected Variable Changed: ${this.selectedVariable}`);

  this.fetchStationData(); // Fetch new data
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
