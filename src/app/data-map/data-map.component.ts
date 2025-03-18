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
    { id: "RF_1_Tot300s_24H", name: "24H Rainfall" },
    { id: "RH_1_Avg", name: "Relative Humidity" },
    { id: "SM_1_Avg", name: "Soil Moisture" },
    { id: "SWin_1_Avg", name: "Solar Radiation" },
    { id: "Tsoil_1_Avg", name: "Soil Temperature" },
    { id: "WS_1_Avg", name: "Wind Speed" },
    { id: "WDrs_1_Avg", name: "Wind Direction" }
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

    return `${formattedDate} ${formattedTime}`; 
}

async fetchStationData(): Promise<void> {
    try {
        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        if (!stations || stations.length === 0) {
            console.warn("No station data received!");
            return;
        }

        // Dynamically construct the URL based on the selected variable
        const dataUrl = `https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/${this.selectedVariable}.json`;

        console.log("Fetching data from:", dataUrl);
        
        const variableData = await fetch(dataUrl)
            .then(res => res.json())
            .catch(error => {
                console.error("Error fetching variable data:", error);
                return null;
            });

        if (!variableData || typeof variableData !== "object") {
            console.warn("Invalid variable data format!");
            return;
        }

        const measurementMap: { [key: string]: number } = {};
        
        Object.keys(variableData).forEach(stationId => {
            if (variableData[stationId] && variableData[stationId].value !== undefined) {
                measurementMap[stationId] = variableData[stationId].value;
            }
        });

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
                    console.log("Clicked on station:", station.station_id); // Debugging log

                    this.selectedStation = {
                        name: station.name,
                        id: station.station_id,
                        lat: station.lat,
                        lng: station.lng,
                        value: numericValue !== null && !isNaN(numericValue) ? numericValue.toFixed(1) : "No Data",
                        variable: this.selectedVariable,
                        url: `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`,
                        details: null
                    };

                    this.fetchStationDetails(station.station_id); // Make sure this is being called
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

        this.selectedStation.details = {
            "Tair_1_Avg": "Loading...",
            "Tsoil_1_Avg": "Loading...",
            "RF_1_Tot300s": "Loading...",
            "SWin_1_Avg": "Loading...",
            "SM_1_Avg": "Loading...",
            "WS_1_Avg": "Loading...",
            "WDrs_1_Avg": "Loading..."
        };
        this.convertedDetails = { ...this.selectedStation.details };
        this.cdr.detectChanges(); // Ensure UI updates

        const variableList = ["Tair_1_Avg", "Tsoil_1_Avg", "SWin_1_Avg", "SM_1_Avg", "RF_1_Tot300s_24H", "WS_1_Avg", "WDrs_1_Avg"];
        let latestTimestamp: string | null = null;
        const unitMapping: { [key: string]: string } = {
            "Tair_1_Avg": "°C",
            "Tsoil_1_Avg": "°C",
            "SWin_1_Avg": " W/m²",
            "SM_1_Avg": "%",
            "RF_1_Tot300s_24H": " mm",
            "WS_1_Avg": " m/s",
            "WDrs_1_Avg": "°"
        };

        let updatedDetails: { [key: string]: string } = { ...this.selectedStation.details };

        for (const variable of variableList) {
            const dataUrl = `https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/${variable}.json`;

            console.log(`Fetching station data for ${variable} from:`, dataUrl);

            try {
                const response = await fetch(dataUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${variable}`);
                    continue;
                }

                const variableData = await response.json();

                if (variableData && variableData[stationId]) {
                    const numericValue = Number(variableData[stationId].value);
                    const timestamp = variableData[stationId].timestamp;

                    if (!isNaN(numericValue)) {
                        let formattedValue = `${numericValue.toFixed(1)}${unitMapping[variable]}`;

                        // Convert Soil Moisture to percentage
                        if (variable === "SM_1_Avg") {
                            formattedValue = `${(numericValue * 100).toFixed(1)}${unitMapping[variable]}`;
                        }

                        updatedDetails[variable.replace("_24H", "")] = formattedValue;

                        // Track the latest timestamp across all variables
                        if (!latestTimestamp || (timestamp && timestamp > latestTimestamp)) {
                            latestTimestamp = timestamp;
                        }
                    }
                } else {
                    console.warn(`No data found for ${variable} at station ${stationId}`);
                    updatedDetails[variable.replace("_24H", "")] = "No Data";
                }

            } catch (error) {
                console.error(`Error fetching data for ${variable}:`, error);
                updatedDetails[variable.replace("_24H", "")] = "Error Loading";
            }
        }

        // Update the station details
        this.selectedStation.details = { ...updatedDetails };
        this.selectedStation.detailsTimestamp = latestTimestamp ? this.formatTimestamp(latestTimestamp) : "No Timestamp";
        this.convertedDetails = { ...updatedDetails };

        this.convertUnits(); // Convert to selected units
        this.cdr.detectChanges(); // Ensure UI refresh

    } catch (error) {
        console.error("Error fetching station details:", error);
    }
}

private getColorFromValue(value: number, min: number, max: number): string {
  const normalizedValue = (value - min) / (max - min);
  return this.selectedVariable === "RF_1_Tot300s" || this.selectedVariable === "SM_1_Avg"
  ? interpolateViridis(normalizedValue) // Keep normal for Rainfall
  : interpolateViridis(1 - normalizedValue); // Reverse for other variables


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

        // **Updated variable label mapping**
        const variableLabels: { [key: string]: string } = {
            "Tair_1_Avg": "Air Temperature (°C)",
            "Tsoil_1_Avg": "Soil Temperature (°C)",
            "RF_1_Tot300s_24H": "24H Rainfall (mm)",
            "RH_1_Avg": "Relative Humidity (%)",
            "SM_1_Avg": "Soil Moisture (%)",
            "SWin_1_Avg": "Solar Radiation (W/m²)",
            "WS_1_Avg": "Wind Speed (m/s)",
            "WDrs_1_Avg": "Wind Direction (°)"
        };

        const variableLabel = variableLabels[this.selectedVariable] || "Unknown Variable";

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
                ${this.selectedVariable === "RF_1_Tot300s_24H" || this.selectedVariable === "SM_1_Avg"
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

  unitSystem: 'metric' | 'standard' = 'metric';
  convertedDetails: { [key: string]: string } = {};

  toggleUnits(event: Event): void {
      this.unitSystem = (event.target as HTMLInputElement).checked ? 'standard' : 'metric';
      this.convertUnits();
  }

  convertUnits(): void {
      if (!this.selectedStation?.details) return;

      this.convertedDetails = { ...this.selectedStation.details };

      // Convert temperature (°C ↔ °F)
      if (this.selectedStation.details['Tair_1_Avg']) {
          const tempC = parseFloat(this.selectedStation.details['Tair_1_Avg']);
          this.convertedDetails['Tair_1_Avg'] = this.unitSystem === 'standard' 
              ? `${((tempC * 9/5) + 32).toFixed(1)}°F` 
              : `${tempC.toFixed(1)}°C`;
      }

      if (this.selectedStation.details['Tsoil_1_Avg']) {
          const tempC = parseFloat(this.selectedStation.details['Tsoil_1_Avg']);
          this.convertedDetails['Tsoil_1_Avg'] = this.unitSystem === 'standard' 
              ? `${((tempC * 9/5) + 32).toFixed(1)}°F` 
              : `${tempC.toFixed(1)}°C`;
      }

      // Convert rainfall (mm ↔ inches)
      if (this.selectedStation.details['RF_1_Tot300s']) {
          const rainMM = parseFloat(this.selectedStation.details['RF_1_Tot300s']);
          this.convertedDetails['RF_1_Tot300s'] = this.unitSystem === 'standard'
              ? `${(rainMM / 25.4).toFixed(2)} in` 
              : `${rainMM.toFixed(1)} mm`;
      }

      if (this.selectedStation.details['WS_1_Avg']) {
          const windMS = parseFloat(this.selectedStation.details['WS_1_Avg']);
          this.convertedDetails['WS_1_Avg'] = this.unitSystem === 'standard' 
              ? `${(windMS * 2.23694).toFixed(2)} mph` 
              : `${windMS.toFixed(1)} m/s`;
      }
  }



}