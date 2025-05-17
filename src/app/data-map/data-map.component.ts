import { Component, AfterViewInit, ChangeDetectorRef,ViewEncapsulation } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { environment } from "../../environments/environment";  
import { interpolateViridis } from "d3-scale-chromatic";
import { interpolateTurbo } from 'd3-scale-chromatic';
import { HeaderComponent } from '../header/header.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserIdService } from '../services/user-id.service';

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
  styleUrl: './data-map.component.css',
  encapsulation: ViewEncapsulation.None
})

export class DataMapComponent implements AfterViewInit {

  constructor(private http: HttpClient,private cdr: ChangeDetectorRef, private userIdService: UserIdService) {}

  private map!: L.Map;
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True&source=data_map';
  private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii';
  private apiToken = environment.apiToken;

  private async loadWindBarbPlugin(): Promise<void> {
    if ((window as any).L?.WindBarb) {
      return;
    }
  
    return new Promise((resolve, reject) => {
      const scriptId = 'leaflet-windbarb-js';
  
      if (document.getElementById(scriptId)) {
        resolve();
        return;
      }
  
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'assets/libs/leaflet-windbarb.js';
      script.onload = () => {
        console.log('L.WindBarb:', (window as any).L?.WindBarb);  
        if ((window as any).L?.WindBarb?.icon) {
          resolve();
        } else {
          reject('WindBarb script loaded but did not attach correctly to window.L');
        }
      };
      script.onerror = () => reject('Failed to load leaflet-windbarb.js');
      document.body.appendChild(script);
    });
  }
  

  
  selectedVariable = "Tair_1_Avg"; 
  variableOptions = [
    { id: "Tair_1_Avg", name: "Air Temperature" },
    { id: "RF_1_Tot300s_24H", name: "24H Rainfall" },
    { id: "RH_1_Avg", name: "Relative Humidity" },
    { id: "SM_1_Avg", name: "Soil Moisture" },
    { id: "SWin_1_Avg", name: "Solar Radiation" },
    { id: "Tsoil_1_Avg", name: "Soil Temperature" },
    { id: "wind", name: "Wind" }
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
        const stations: Station[] = await firstValueFrom(
            this.http.get<Station[]>(this.apiUrl, {
              headers: {
                Authorization: `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
              }
            })
          );

        if (!stations || stations.length === 0) {
            console.warn("No station data received!");
            return;
        }

        const dataUrl = `https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/${this.selectedVariable}.json`;

        console.log("Fetching data from:", dataUrl);
        
        if (this.selectedVariable === 'wind') {
            await this.loadWindBarbPlugin();  // Wait until script fully loads
            await this.plotWindBarbs();       // Then safely use L.WindBarb
            return;
          }
  

          
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
          const entry = variableData[stationId];
          if (!entry || entry.value === undefined || entry.value === null) return;
  
          const value = Number(entry.value);
  
          // Apply soil temperature cap
          if (this.selectedVariable === 'Tsoil_1_Avg' && value > 50) {
            return; // skip this value
          }
  
          measurementMap[stationId] = value;
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
              const value = measurementMap[station.station_id] ?? null;
              const numericValue = value !== null ? Number(value) : null;

              const hasData = numericValue !== null && !isNaN(numericValue);

              const color = hasData 
                  ? this.getColorFromValue(numericValue, minValue, maxValue) 
                  : 'gray';

              const marker = L.circleMarker([station.lat, station.lng], {
                  radius: 8,
                  color: 'gray',     
                  fillColor: color,                  
                  fillOpacity: hasData ? 1 : 0.3,
                  opacity: hasData ? 1 : 0.3,
                  weight: hasData ? 1 : 0.5
              }).addTo(this.map);

              hasData ? marker.bringToFront() : marker.bringToBack();

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

private async plotWindBarbs(): Promise<void> {
    const windDataUrl = 'https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/wind.json';
  
    if (!(window as any).L?.WindBarb || typeof (window as any).L.WindBarb.icon !== 'function') {
        console.error('❌ WindBarb plugin is not available or icon method is undefined.');
        return;
      }
  
  
    try {
      const response = await fetch(windDataUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
  
      this.map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
          this.map.removeLayer(layer);
        }
      });
  
      Object.entries(data).forEach(([stationId, entry]: [string, any]) => {
        if (!entry || entry.lat == null || entry.lon == null || entry.value_WDrs == null) return;
  
        const lat = entry.lat;
        const lon = entry.lon;
        const direction = parseFloat(entry.value_WDrs);
        const speedMS = entry.value_WS !== null ? parseFloat(entry.value_WS) : 0;
        const speedKMH = speedMS * 3.6;

  
        if (!isNaN(lat) && !isNaN(lon) && !isNaN(direction)) {
            const icon = (window as any).L.WindBarb.icon({ deg: direction, speed: speedKMH });
            const marker = L.marker([lat, lon], { icon: icon }).addTo(this.map);

            marker.on('click', () => {
              console.log("Clicked on wind station:", entry.station_id); // For debugging

              this.selectedStation = {
                name: entry.name || stationId || 'Unknown Station',
                id: stationId,
                lat: lat,
                lng: lon,
                value: `${speedKMH.toFixed(1)} km/h`,
                variable: 'wind',
                url: `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${stationId}`,
                details: null
              };

              this.fetchStationDetails(stationId);

            });

        }
      });
    } catch (error) {
      console.error('Error loading wind data:', error);
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
            "RH_1_Avg": "Loading...",
            "SM_1_Avg": "Loading...",
            "WS_1_Avg": "Loading...",
            "WDrs_1_Avg": "Loading..."
        };
        this.convertedDetails = { ...this.selectedStation.details };
        this.cdr.detectChanges(); // Ensure UI updates

        const variableList = ["Tair_1_Avg", "Tsoil_1_Avg", "SWin_1_Avg", "RH_1_Avg", "SM_1_Avg", "RF_1_Tot300s_24H", "WS_1_Avg", "WDrs_1_Avg"];
        let latestTimestamp: string | null = null;
        const unitMapping: { [key: string]: string } = {
            "Tair_1_Avg": "°C",
            "Tsoil_1_Avg": "°C",
            "SWin_1_Avg": " W/m²",
            "RH_1_Avg": "%",
            "SM_1_Avg": "%",
            "RF_1_Tot300s_24H": " mm",
            "WS_1_Avg": " m/s",
            "WDrs_1_Avg": ""
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

                    if (variable === "Tsoil_1_Avg" && numericValue > 50) {
                      updatedDetails[variable] = "No Data";
                      continue;
                  }

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
        console.log("Updated station details:", this.selectedStation.details);

        this.convertUnits(); // Convert to selected units
        this.cdr.detectChanges(); // Ensure UI refresh

    } catch (error) {
        console.error("Error fetching station details:", error);
    }
}

private getColorFromValue(value: number, min: number, max: number): string {
    const normalizedValue = (value - min) / (max - min);
  
    // These variables are reversed (yellow for low, blue for high)
    const reversedVariables = ["RF_1_Tot300s_24H", "RH_1_Avg", "SM_1_Avg"];
  
    const isReversed = reversedVariables.includes(this.selectedVariable);
  
    return isReversed
      ? interpolateTurbo(1 - normalizedValue)
      : interpolateTurbo(normalizedValue);
  }
  

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.map = L.map('map', {
        center: [20.493410, -158.064388],
        zoom: 8,
        layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')],
        zoomControl: false 
      });

      L.control.zoom({ position: "bottomleft" }).addTo(this.map);

      // Delay station data fetch slightly more
      setTimeout(() => {
        this.fetchStationData();
      }, 1000); // ← increase delay to give Leaflet a moment to render
    });
  }

  

  private addLegend(minValue: number, maxValue: number): void {
    if (this.selectedVariable === 'wind') {
        return; // Skip legend for wind
    }

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
                ${this.selectedVariable === "RF_1_Tot300s_24H" || this.selectedVariable === "SM_1_Avg" || this.selectedVariable === "RH_1_Avg"
                    ? `${interpolateTurbo(1)}, ${interpolateTurbo(0.75)}, ${interpolateTurbo(0.5)}, ${interpolateTurbo(0.25)}, ${interpolateTurbo(0)}`
                    : `${interpolateTurbo(0)}, ${interpolateTurbo(0.25)}, ${interpolateTurbo(0.5)}, ${interpolateTurbo(0.75)}, ${interpolateTurbo(1)}`
                })`;
            gradientDiv.style.border = "1px solid black";
        }
    }, 100);
}


updateVariable(event: Event): void {
    this.selectedVariable = (event.target as HTMLSelectElement).value;

    // Clear existing markers
    this.map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
            this.map.removeLayer(layer);
        }
    });

    // Clear legend
    const existingLegend = document.querySelector(".info.legend");
    if (existingLegend) {
        existingLegend.remove();
    }

    this.fetchStationData();
}


  unitSystem: 'metric' | 'standard' = 'metric';
  convertedDetails: { [key: string]: string } = {};

  toggleUnits(event: Event): void {
      this.unitSystem = (event.target as HTMLInputElement).checked ? 'standard' : 'metric';
      this.convertUnits();
  }

  windDirectionToCardinal(degrees: number): string {
    const directions = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"
    ];
  
    const index = Math.round(degrees / 22.5) % 16;
    console.log('Wind direction index:', index);
    return directions[index];
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
      if (this.selectedStation.details['WDrs_1_Avg']) {
        const windDegrees = parseFloat(this.selectedStation.details['WDrs_1_Avg']);
        this.convertedDetails['WDrs_1_Avg'] = this.windDirectionToCardinal(windDegrees);
    }
  }



}