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
  selector: 'app-data-map',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './data-map.component.html',
  styleUrl: './data-map.component.css'
})

export class DataMapComponent implements AfterViewInit {

    constructor(private cdr: ChangeDetectorRef) {}

  private map!: L.Map;
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
  private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii';
  private apiToken = environment.apiToken;

  selectedVariable = "Tair_1_Avg"; 
  variableOptions = [
    { id: "Tair_1_Avg", name: "Air Temperature" },
    { id: "Tsoil_1_Avg", name: "Soil Temperature" }
  ];

  selectedStation: any = null;

  latestObservationTime: string | null = null;

  async fetchLatestObservationTime(): Promise<string | null> {
    try {
        const url = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=0115&local_tz=True&limit=1`;

        console.log("Fetching latest observation time from:", url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data && data.length > 0 && data[0].timestamp) {
            const rawTimestamp = data[0].timestamp;
            this.latestObservationTime = this.formatTimestamp(rawTimestamp);
            return rawTimestamp;
        } else {
            console.warn("No valid timestamp found in the API response.");
        }
    } catch (error) {
        console.error("Error fetching latest observation time:", error);
    }

    return null;
}

formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() - 5); 

    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'long',  // Full month name (e.g., "February")
        day: 'numeric', // Day (e.g., "13")
        year: 'numeric' // Year (e.g., "2025")
    });

    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric', // Hour (e.g., "2")
        minute: '2-digit', // Minutes (e.g., "55")
        hour12: true, // Use 12-hour format
        timeZone: 'Pacific/Honolulu' // Ensure HST is displayed
    });

    return `${formattedDate} ${formattedTime}`; // No "at"
}

async fetchStationData(): Promise<void> {
    try {
        // Fetch station metadata
        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        if (!stations || stations.length === 0) {
            console.warn("No station data received!");
            return;
        }

        // Fetch temperature data from GitHub
        const temperatureDataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/Tair_1_Avg.json";
        console.log("Fetching air temperature data from:", temperatureDataUrl);
        
        const temperatureData = await fetch(temperatureDataUrl)
            .then(res => res.json())
            .catch(error => {
                console.error("Error fetching temperature data:", error);
                return null;
            });

        if (!temperatureData || typeof temperatureData !== "object") {
            console.warn("Invalid temperature data format!");
            return;
        }

        // Map station IDs to temperature values
        const measurementMap: { [key: string]: number } = {};
        
        Object.keys(temperatureData).forEach(stationId => {
            if (temperatureData[stationId] && temperatureData[stationId].value !== undefined) {
                measurementMap[stationId] = temperatureData[stationId].value;
            }
        });

        // Remove existing markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker) {
                this.map.removeLayer(layer);
            }
        });

        const values = Object.values(measurementMap).filter(v => v !== null);
        if (values.length === 0) return;

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        this.addLegend(minValue, maxValue);

        stations.forEach(station => {
            if (station.lat && station.lng) {
                let value = measurementMap[station.station_id] ?? null;
                let numericValue = value !== null ? Number(value) : null;

                let color = numericValue !== null && !isNaN(numericValue) 
                    ? this.getColorFromValue(numericValue, minValue, maxValue) 
                    : "gray";

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
                        value: numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) : "No Data",
                        variable: this.selectedVariable,
                        url: `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`,
                        details: null
                    };
                });
            }
        });

    } catch (error) {
        console.error('Error fetching station data:', error);
    }
}



async fetchStationDetails(stationId: string): Promise<void> {
    try {
        if (!this.selectedStation) {
            console.warn("No station selected.");
            return;
        }

        // ✅ Reset `selectedStation.details` and `convertedDetails`
        this.selectedStation = {
            ...this.selectedStation,
            details: {
                "Tair_1_Avg": "No Data",
                "Tsoil_1_Avg": "No Data",
                "RF_1_Tot300s": "No Data",
                "SWin_1_Avg": "No Data",
                "SM_1_Avg": "No Data"
            },
            detailsTimestamp: null
        };

        this.convertedDetails = { ...this.selectedStation.details }; // ✅ Reset converted values
        this.cdr.detectChanges(); // ✅ Ensure UI updates immediately

        // ✅ Fetch all non-rainfall variables
        const detailsApiUrl = `https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=Tair_1_Avg,Tsoil_1_Avg,SWin_1_Avg,SM_1_Avg&station_ids=${stationId}&local_tz=True&limit=4`;

        console.log("Fetching station details from:", detailsApiUrl);

        const response = await fetch(detailsApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        });

        const measurements: { timestamp?: string; variable?: string; value?: any }[] = await response.json();

        if (!measurements || measurements.length === 0) {
            console.warn("No additional data available for this station.");
            this.selectedStation.detailsTimestamp = null;
            this.convertedDetails = { ...this.selectedStation.details };
            this.cdr.detectChanges();
        } else {
            let latestTimestamp: string | null = null;
            const unitMapping: { [key: string]: string } = {
                "Tair_1_Avg": "°C",
                "Tsoil_1_Avg": "°C",
                "SWin_1_Avg": "W/m²",
                "SM_1_Avg": "%"
            };

            let updatedDetails = { ...this.selectedStation.details };

            measurements.forEach((measurement) => {
                if (!measurement.variable || !measurement.timestamp) return;

                let numericValue = Number(measurement.value);
                if (!isNaN(numericValue)) {
                    if (measurement.variable === "SM_1_Avg") {
                        numericValue *= 100;
                    }

                    const unit = unitMapping[measurement.variable] || "";
                    updatedDetails[measurement.variable] = `${numericValue.toFixed(1)} ${unit}`;

                    if (!latestTimestamp) {
                        latestTimestamp = measurement.timestamp;
                    }
                }
            });

            this.selectedStation = {
                ...this.selectedStation,
                details: updatedDetails,
                detailsTimestamp: latestTimestamp ? this.formatTimestamp(latestTimestamp) : null
            };

            this.convertedDetails = { ...updatedDetails };
            this.convertUnits();
            this.cdr.detectChanges();
        }

        await this.fetch24hRainfall(stationId);

    } catch (error) {
        console.error("Error fetching station details:", error);
    }
}

async fetch24hRainfall(stationId: string): Promise<void> {
    try {
        // ✅ Set "Loading..." while fetching rainfall data
        this.selectedStation.details['RF_1_Tot300s'] = "Loading...";
        this.convertedDetails['RF_1_Tot300s'] = "Loading...";
        this.cdr.detectChanges(); // Ensure UI updates

        const rainfallApiUrl = `${this.measurementsUrl}&var_ids=RF_1_Tot300s&station_ids=${stationId}&local_tz=True&limit=288`; // 24h of 5-min intervals

        console.log("Fetching 24-hour rainfall data from:", rainfallApiUrl);

        const response = await fetch(rainfallApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        });

        const rainfallData: { value?: any }[] = await response.json();

        if (!rainfallData || rainfallData.length === 0) {
            console.warn("No 24-hour rainfall data found.");
            this.selectedStation.details['RF_1_Tot300s'] = "No Data";
        } else {
            // ✅ Sum the rainfall values
            const totalRainfall = rainfallData.reduce((sum, record) => {
                return sum + (parseFloat(record.value) || 0);
            }, 0);

            this.selectedStation.details['RF_1_Tot300s'] = `${totalRainfall.toFixed(1)} mm`;
        }

        this.convertedDetails['RF_1_Tot300s'] = this.selectedStation.details['RF_1_Tot300s'];
        this.convertUnits();
        this.cdr.detectChanges();

    } catch (error) {
        console.error("Error fetching 24-hour rainfall data:", error);
        this.selectedStation.details['RF_1_Tot300s'] = "Error Loading";
        this.convertedDetails['RF_1_Tot300s'] = "Error Loading";
        this.cdr.detectChanges();
    }
}




private getColorFromValue(value: number, min: number, max: number): string {
  const normalizedValue = (value - min) / (max - min);
  return interpolateViridis(normalizedValue); 
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

  private addLegend(minValue: number, maxValue: number): void {
    const existingLegend = document.querySelector(".info.legend");
    if (existingLegend) {
        existingLegend.remove();
    }

    const legend = new L.Control({ position: "bottomright" } as any);


    legend.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend");

        let variableLabel = "";
        if (this.selectedVariable === "Tair_1_Avg") {
            variableLabel = "Air Temperature (°C)";
        } else if (this.selectedVariable === "Tsoil_1_Avg") {
            variableLabel = "Soil Temperature (°C)";
        } else if (this.selectedVariable === "RF_1_Tot300s") {
            variableLabel = "Rainfall (mm)";
        } else {
            variableLabel = "Unknown Variable";
        }

        div.innerHTML = `
            <h4>${variableLabel}</h4>
            <div id="legend-gradient" style="width: 200px; height: 15px;"></div>
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
            gradientDiv.style.background = `linear-gradient(to right, 
                ${this.selectedVariable === "RF_1_Tot300s"
                    ? `${interpolateViridis(1)}, ${interpolateViridis(0.75)}, ${interpolateViridis(0.5)}, ${interpolateViridis(0.25)}, ${interpolateViridis(0)}`
                    : `${interpolateViridis(0)}, ${interpolateViridis(0.25)}, ${interpolateViridis(0.5)}, ${interpolateViridis(0.75)}, ${interpolateViridis(1)}`
                })`;
            gradientDiv.style.border = "1px solid black";
        }
    }, 100);
}


  updateVariable(event: Event): void {
    this.selectedVariable = (event.target as HTMLSelectElement).value;

    this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        this.map.removeLayer(layer);
      }
    });

    this.fetchStationData(); 
  }


  unitSystem: 'metric' | 'imperial' = 'metric';
  convertedDetails: { [key: string]: string } = {};

  toggleUnits(event: Event): void {
      this.unitSystem = (event.target as HTMLInputElement).checked ? 'imperial' : 'metric';
      this.convertUnits();
  }

  convertUnits(): void {
      if (!this.selectedStation?.details) return;

      this.convertedDetails = { ...this.selectedStation.details };

      // Convert temperature (°C ↔ °F)
      if (this.selectedStation.details['Tair_1_Avg']) {
          const tempC = parseFloat(this.selectedStation.details['Tair_1_Avg']);
          this.convertedDetails['Tair_1_Avg'] = this.unitSystem === 'imperial' 
              ? `${((tempC * 9/5) + 32).toFixed(1)} °F` 
              : `${tempC.toFixed(1)} °C`;
      }

      if (this.selectedStation.details['Tsoil_1_Avg']) {
          const tempC = parseFloat(this.selectedStation.details['Tsoil_1_Avg']);
          this.convertedDetails['Tsoil_1_Avg'] = this.unitSystem === 'imperial' 
              ? `${((tempC * 9/5) + 32).toFixed(1)} °F` 
              : `${tempC.toFixed(1)} °C`;
      }

      // Convert rainfall (mm ↔ inches)
      if (this.selectedStation.details['RF_1_Tot300s']) {
          const rainMM = parseFloat(this.selectedStation.details['RF_1_Tot300s']);
          this.convertedDetails['RF_1_Tot300s'] = this.unitSystem === 'imperial' 
              ? `${(rainMM / 25.4).toFixed(2)} in` 
              : `${rainMM.toFixed(1)} mm`;
      }
  }



}