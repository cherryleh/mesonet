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
  isLoading: boolean = false;

  private map!: L.Map;
  private getApiUrlWithUserId(): string {
    const userId = this.userIdService.getUserId();
    return `https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True&source=data_map&user_id=${userId}`;
  }

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
  this.isLoading = true;
  try {
    const stations: Station[] = await firstValueFrom(
      this.http.get<Station[]>(this.getApiUrlWithUserId(), {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })
    );

    const activeStations = stations.filter(s => (s as any).status === 'active');

    if (activeStations.length === 0) {
      console.warn("No active stations found.");
      return;
    }

    const stationCount = activeStations.length;
    console.log(`Using ${stationCount} active stations`);

    const varId = this.selectedVariable === 'RF_1_Tot300s_24H' ? 'RF_1_Tot300s' : this.selectedVariable;
    const stationIds = activeStations.map(s => s.station_id).join(',');

    let url = `${this.measurementsUrl}&var_ids=${varId}&station_ids=${stationIds}&local_tz=True`;

    if (varId === 'RF_1_Tot300s') {
      url += `&limit=${stationCount * 288}`;
    } else {
      url += `&limit=${stationCount * 12}`;
    }

    console.log("Fetching data from:", url);


    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn("Invalid response format from measurements API");
      return;
    }

    const variableData: { [key: string]: { value: number | null, timestamp: string | null } } = {};

      if (varId === 'RF_1_Tot300s') {
        // Sum last 24 hours per station (288 x 5-min intervals)
        const rainMap: { [key: string]: { total: number; latestTs: string | null } } = {};
        const now = new Date();
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        for (const entry of data) {
          const sid = entry.station_id;
          const val = parseFloat(entry.value);
          const ts = entry.timestamp;

          if (!ts || isNaN(val)) continue;

          const tsDate = new Date(ts);
          if (tsDate < cutoff) continue; // older than 24h -> ignore

          if (!rainMap[sid]) {
            rainMap[sid] = { total: 0, latestTs: null };
          }

          rainMap[sid].total += val;

          if (!rainMap[sid].latestTs || tsDate > new Date(rainMap[sid].latestTs)) {
            rainMap[sid].latestTs = ts;
          }
        }

        // Convert summed totals into variableData for downstream rendering
        for (const sid in rainMap) {
          variableData[sid] = {
            value: rainMap[sid].total,
            timestamp: rainMap[sid].latestTs
          };
        }
      } else {
      // Take first valid value per station
      for (const entry of data) {
        const sid = entry.station_id;
        const val = parseFloat(entry.value);
        if (!isNaN(val) && !(sid in variableData)) {
          variableData[sid] = {
            value: val,
            timestamp: entry.timestamp
          };
        }
      }
    }

    // Clear existing markers
    this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        this.map.removeLayer(layer);
      }
    });

    const measurementMap: { [key: string]: number } = {};
    for (const sid in variableData) {
      const entry = variableData[sid];
      if (!entry || entry.value == null) continue;

      const value = Number(entry.value);
      if (this.selectedVariable === 'Tsoil_1_Avg' && value > 50) continue;
      if (this.selectedVariable === 'SM_1_Avg' && value > 1) continue;

      measurementMap[sid] = value;
    }

    const values = Object.values(measurementMap).filter(v => v !== null);
    if (values.length === 0) return;

    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    if (this.selectedVariable === 'SM_1_Avg') {
      minValue = 0;
      maxValue = 1;  // raw value in fraction (0–1)
    }
    if (this.selectedVariable === 'RF_1_Tot300s_24H') {
      minValue = 0;

      const fixedMax = 1;
      maxValue = maxValue > fixedMax ? maxValue : fixedMax;
    }



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

          this.fetchStationDetails(station.station_id);
        });
      }
    });

  } catch (error) {
    console.error("Error fetching station data:", error);
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}


private async plotWindBarbs(): Promise<void> {
  this.isLoading = true;
  const windVarIds = 'WS_1_Avg,WDrs_1_Avg';
  if (!(window as any).L?.WindBarb || typeof (window as any).L.WindBarb.icon !== 'function') {
    return;
  }

  try {
    // Get active stations
    const stations: Station[] = await firstValueFrom(
      this.http.get<Station[]>(this.getApiUrlWithUserId(), {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      })
    );
    const activeStations = stations.filter(s => (s as any).status === 'active');
    const stationCount = activeStations.length;
    const stationIdMap = new Map(activeStations.map(s => [s.station_id, s]));

    const stationIds = activeStations.map(s => s.station_id).join(',');
    const url = `${this.measurementsUrl}&var_ids=${windVarIds}&station_ids=${stationIds}&local_tz=True&limit=${stationCount * 12}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    // Group wind values by station
    const stationWindMap: {
      [stationId: string]: { WS: number | null; WDrs: number | null; lat: number; lon: number; name?: string }
    } = {};

    for (const entry of data) {
      const sid = entry.station_id;
      const val = parseFloat(entry.value);
      const variable = entry.variable;

      const stationMeta = stationIdMap.get(sid);
      if (!stationMeta || isNaN(val)) continue;

      if (!stationWindMap[sid]) {
        stationWindMap[sid] = {
          WS: null,
          WDrs: null,
          lat: stationMeta.lat,
          lon: stationMeta.lng,
          name: stationMeta.name
        };
      }

      if (variable === 'WS_1_Avg') {
        stationWindMap[sid].WS = val;
      } else if (variable === 'WDrs_1_Avg') {
        stationWindMap[sid].WDrs = val;
      }
    }

    // Remove existing wind markers
    this.map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        this.map.removeLayer(layer);
      }
    });

    // Add wind barb markers
    Object.entries(stationWindMap).forEach(([stationId, wind]) => {
      const { WS, WDrs, lat, lon, name } = wind;

      if (lat != null && lon != null && WS != null && WDrs != null) {
        const speedKMH = WS * 3.6;

        const icon = (window as any).L.WindBarb.icon({ deg: WDrs, speed: speedKMH });
        const marker = L.marker([lat, lon], { icon }).addTo(this.map);

        marker.on('click', () => {
          this.selectedStation = {
            name: name || stationId,
            id: stationId,
            lat,
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
    console.error('Error loading wind barbs:', error);
  }finally {
    this.isLoading = false;
    this.cdr.detectChanges();
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
          const varId = variable === "RF_1_Tot300s_24H" ? "RF_1_Tot300s" : variable;
          const url = `${this.measurementsUrl}&var_ids=${varId}&station_ids=${stationId}&local_tz=True&limit=${varId === "RF_1_Tot300s" ? 288 : 1}`;
          console.log(url);
          try {
            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              console.warn(`Failed to fetch data for ${variable}`);
              updatedDetails[variable.replace("_24H", "")] = "Error Loading";
              continue;
            }

            const data = await response.json();

            // Handle 24H Rainfall
            if (varId === "RF_1_Tot300s") {
              const validValues = data
                .filter((entry: any) => entry.value != null && !isNaN(parseFloat(entry.value)))
                .map((entry: any) => parseFloat(entry.value));

              const total = validValues.reduce((sum: number, val: number) => sum + val, 0);

              const ts = data.length > 0 ? data[0].timestamp : null;

              updatedDetails["RF_1_Tot300s"] = total > 0 ? `${total.toFixed(1)} mm` : "0.0 mm";
              if (!latestTimestamp || (ts && ts > latestTimestamp)) {
                latestTimestamp = ts;
              }
            } else if (data.length > 0 && data[0].value != null) {
              const numericValue = parseFloat(data[0].value);
              const ts = data[0].timestamp;

              if (variable === "Tsoil_1_Avg" && numericValue > 50) {
                updatedDetails[variable] = "No Data";
                continue;
              }

              let formattedValue = `${numericValue.toFixed(1)}${unitMapping[variable]}`;

              if (variable === "SM_1_Avg") {
                // Convert to percent
                formattedValue = `${(numericValue * 100).toFixed(1)}${unitMapping[variable]}`;
              }

              updatedDetails[variable.replace("_24H", "")] = formattedValue;

              if (!latestTimestamp || (ts && ts > latestTimestamp)) {
                latestTimestamp = ts;
              }
            } else {
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

    const reversedViridisVariables = ["RF_1_Tot300s_24H"];
    const reversedTurboVariables = ["RH_1_Avg", "SM_1_Avg"];

    if (reversedViridisVariables.includes(this.selectedVariable)) {
      return interpolateViridis(1 - normalizedValue);  // reversed viridis
    }

    const isReversed = reversedTurboVariables.includes(this.selectedVariable);
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
              <span>${this.selectedVariable === 'SM_1_Avg' ? '0' : minValue.toFixed(1)}</span>
              <span>${this.selectedVariable === 'SM_1_Avg' ? '100' : maxValue.toFixed(1)}</span>
            </div>
        `;
        return div;
    };

    legend.addTo(this.map);

    setTimeout(() => {
        const gradientDiv = document.getElementById("legend-gradient");
        if (gradientDiv) {
            gradientDiv.style.background = `linear-gradient(to right,
            ${this.selectedVariable === "RF_1_Tot300s_24H"
                ? `${interpolateViridis(1)}, ${interpolateViridis(0.75)}, ${interpolateViridis(0.5)}, ${interpolateViridis(0.25)}, ${interpolateViridis(0)}`
                : this.selectedVariable === "SM_1_Avg" || this.selectedVariable === "RH_1_Avg"
                  ? `${interpolateTurbo(1)}, ${interpolateTurbo(0.75)}, ${interpolateTurbo(0.5)}, ${interpolateTurbo(0.25)}, ${interpolateTurbo(0)}`
                  : `${interpolateTurbo(0)}, ${interpolateTurbo(0.25)}, ${interpolateTurbo(0.5)}, ${interpolateTurbo(0.75)}, ${interpolateTurbo(1)}`
            })`;

            gradientDiv.style.border = "1px solid black";
        }
    }, 100);
}


  updateVariable(event: Event): void {
    this.selectedVariable = (event.target as HTMLSelectElement).value;

    this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });

    const existingLegend = document.querySelector(".info.legend");
    if (existingLegend) {
      existingLegend.remove();
    }

      if (this.selectedVariable === 'wind') {
        this.loadWindBarbPlugin().then(() => this.plotWindBarbs());
      } else {
      this.fetchStationData();
    }
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
