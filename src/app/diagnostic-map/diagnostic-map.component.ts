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
    { id: "RHenc", name: "Enclosure relative humidity" },
    { id: "Earliest Measurement", name: "Earliest Measurement" } 
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

  async plotEarliestMeasurements(): Promise<void> {
    try {
        const response = await fetch('https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/earliest_measurements.json');
        const earliestData: Measurement[] = await response.json();

        console.log("Earliest Measurements Data:", earliestData);

        const measurementMap = Object.fromEntries(
            earliestData.map(measurement => [measurement.station_id, measurement.timestamp])
        );

        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());
        console.log('Station info',this.apiUrl);
        this.plotStations(stations, measurementMap, true);
    } catch (error) {
        console.error("Error loading earliest measurements:", error);
    }
}

plotStations(stations: Station[], measurementMap: Record<string, any>, isTimestamp: boolean = false): void {
  this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
          this.map.removeLayer(layer);
      }
  });

  const values = Object.values(measurementMap).filter(v => v !== null && !isTimestamp);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 1; 

  setTimeout(() => {
      stations.forEach(station => {
        if (!station || !station.lat || !station.lng) {
            console.warn(`Skipping invalid station:`, station);
            return; 
        }
          const rawValue = measurementMap[station.station_id] ?? null;

          let displayText: string | null = null;
          let color: string;

          if (isTimestamp && rawValue) {
              const timeData = this.formatTimeAgo(rawValue); 
              displayText = timeData.text;

              if (timeData.hours > 24) {
                  color = "red"; // > 24 hours
              } else if (timeData.hours >= 5) {
                  color = "yellow"; // 5-24 hours
              } else {
                  color = "green"; // < 5 hours
              }
          } else {
              displayText = rawValue !== null ? rawValue.toString() : "No Data";
              color = rawValue !== null ? this.getColorFromValue(parseFloat(rawValue as any), minValue, maxValue) : "gray";
          }

          const marker = L.circleMarker([station.lat, station.lng], {
              radius: 8,
              color,
              fillColor: color,
              fillOpacity: 0.8
          }).addTo(this.map);

          marker.on('click', async () => {
            console.log(`🟢 Clicked station: ${station.name} (ID: ${station.station_id})`);

            this.selectedStation = {
                name: station.name,
                lat: station.lat,
                lng: station.lng,
                value: displayText ?? "No Data",
                variable: this.selectedVariable
            };

            await this.fetchStationDetails(station.station_id);

            this.cdr.detectChanges();
        });

      });

      this.addLegend(minValue, maxValue, isTimestamp);
      this.cdr.detectChanges();
  }, 100);
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
        if (this.selectedVariable === "Earliest Measurement") {
            await this.plotEarliestMeasurements(); 
            return;
        }

        // ✅ Fetch station data
        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        console.log("Fetched Stations:", stations);

        // ✅ Determine correct JSON file based on selected variable
        let dataUrl = "";
        if (this.selectedVariable === "BattVolt") {
            dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/BattVolt.json";
        } else if (this.selectedVariable === "RHenc") {
            dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/RHenc.json";
        } else {
            console.warn(`❌ No local data available for ${this.selectedVariable}`);
            return;
        }

        // ✅ Fetch data from the selected JSON file
        const response = await fetch(dataUrl);
        const data: Record<string, { value: string; timestamp: string }> = await response.json();

        console.log(`Fetched ${this.selectedVariable} Data:`, data);

        // ✅ Format data for plotting
        const measurementMap: Record<string, number> = {};
        Object.keys(data).forEach(stationId => {
            measurementMap[stationId] = parseFloat(data[stationId].value);
        });

        // ✅ Plot the stations using local JSON data
        this.plotStations(stations, measurementMap, false);

    } catch (error) {
        console.error(`Error fetching data for ${this.selectedVariable}:`, error);
    }
}

private getColorFromValue(value: number, min: number, max: number): string {
  if (this.selectedVariable === "BattVolt") {
      const fixedMin = 11; // Always start from 11
      const dynamicMax = max; // Use the actual max

      if (value <= fixedMin) return "#FF0000"; // Red for <= 11
      if (min === max) return "#0000FF"; // Avoid divide-by-zero errors

      // Normalize value between fixedMin (11) and dynamicMax
      const normalizedValue = (value - fixedMin) / (dynamicMax - fixedMin);

      // Interpolate between red and blue
      const red = Math.round(255 * (1 - normalizedValue)); // Decreasing red
      const blue = Math.round(255 * normalizedValue); // Increasing blue

      return `rgb(${red}, 0, ${blue})`;
  } else {
      // Default Viridis scale for other variables
      if (min === max) return interpolateViridis(0.5);
      return interpolateViridis((value - min) / (max - min));
  }
}

private addLegend(minValue: number, maxValue: number, isTimestamp: boolean): void {
  const existingLegend = document.querySelector(".info.legend");
  if (existingLegend) {
      existingLegend.remove();
  }

  const legend = new L.Control({ position: "bottomright" } as any);

  legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");

      if (isTimestamp) {
          div.innerHTML = `
              <h4>Earliest Measurement (Time Ago)</h4>
              <div style="display: flex; flex-direction: column;">
                  <div style="display: flex; align-items: center;">
                      <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                      <span>< 5 hours ago</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                      <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                      <span>5-24 hours ago</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                      <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                      <span>> 24 hours ago</span>
                  </div>
              </div>
          `;
      } else {
          // ✅ Custom BattVolt legend with fixed red min (11) and dynamic blue max
          const fixedMin = 11;
          div.innerHTML = `
              <h4>${this.selectedVariable}</h4>
              <div id="legend-gradient" style="width: 200px; height: 15px; margin-bottom: 5px;"></div>
              <div style="display: flex; justify-content: space-between;">
                  <span>${fixedMin.toFixed(1)} (Red)</span>
                  <span>${maxValue.toFixed(1)} (Blue)</span>
              </div>
          `;
      }

      return div;
  };

  legend.addTo(this.map);

  // ✅ Create red-to-blue gradient for BattVolt legend
  if (!isTimestamp) {
      setTimeout(() => {
          const gradientDiv = document.getElementById("legend-gradient");
          if (gradientDiv) {
              let gradientColors = [];
              const fixedMin = 11;
              const dynamicMax = maxValue;

              for (let i = 0; i <= 10; i++) {
                  const value = fixedMin + ((dynamicMax - fixedMin) * (i / 10));
                  const color = this.getColorFromValue(value, fixedMin, dynamicMax);
                  gradientColors.push(color);
              }

              gradientDiv.style.background = `linear-gradient(to right, ${gradientColors.join(", ")})`;
              gradientDiv.style.border = "1px solid black";
          }
      }, 100);
  }
}

private formatTimeAgo(timestamp: string): { text: string; hours: number } {
  const time = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const diffMs = now - time;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));


  if (diffHours > 0) {
      return { text: `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`, hours: diffHours };
  } else {
      return { text: `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`, hours: 0 };
  }
}

async fetchStationDetails(stationId: string): Promise<void> {
  try {
      const battVoltApiUrl = `${this.measurementsUrl}&var_ids=BattVolt&station_ids=${stationId}&local_tz=True&limit=288`;
      const latestValuesApiUrl = `${this.measurementsUrl}&var_ids=CellStr,CellQlt,RHenc&station_ids=${stationId}&local_tz=True&limit=3`;

      let allStationMeasurements: Measurement[] = [];
      try {
        const latestMeasurementsResponse = await fetch('https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/latest_measurements.json');
        if (!latestMeasurementsResponse.ok) throw new Error("❌ Failed to load latest_measurements.json");

        allStationMeasurements = await latestMeasurementsResponse.json();

      } catch (error) {
        console.error("❌ Error loading latest_measurements.json:", error);
      }

      const [battVoltResponse, latestValuesResponse] = await Promise.all([
          fetch(battVoltApiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' } }),
          fetch(latestValuesApiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' } })
      ]);

      const battVoltMeasurements: Measurement[] = await battVoltResponse.json();
      const latestMeasurements: Measurement[] = await latestValuesResponse.json();

      const stationMeasurements = allStationMeasurements.filter(m => m.station_id === stationId);
      console.log("Filtered latest observations:", stationMeasurements);

      let latestDetails: { [key: string]: string } = {
          "BattVolt": "No Data",
          "24h BattVolt Min": "No Data",
          "24h BattVolt Max": "No Data",
          "CellStr": "No Data",
          "CellQlt": "No Data",
          "RHenc": "No Data"
      };

      let battVoltValues: number[] = battVoltMeasurements
          .map(m => parseFloat(m.value as any))
          .filter(v => !isNaN(v));

      if (battVoltValues.length > 0) {
          latestDetails["BattVolt"] = battVoltValues[battVoltValues.length - 1].toFixed(2);
          latestDetails["24h BattVolt Min"] = Math.min(...battVoltValues).toFixed(2);
          latestDetails["24h BattVolt Max"] = Math.max(...battVoltValues).toFixed(2);
      }

      latestMeasurements.forEach(measurement => {
          const numericValue = parseFloat(measurement.value as any);
          if (!isNaN(numericValue)) {
              latestDetails[measurement.variable] = numericValue.toFixed(2);
          }
      });

      // ✅ Process Latest Observations for All Variables
      stationMeasurements.forEach(measurement => {
          const timeData = this.formatTimeAgo(measurement.timestamp);
          latestDetails[measurement.variable] = timeData.text; // ✅ Store as "X hours ago"
      });

      console.log("Final latestDetails object:", latestDetails);

      // ✅ Extract the latest timestamp and format it
      let latestTimestamp = battVoltMeasurements[battVoltMeasurements.length - 1]?.timestamp || "";
      let formattedTimestamp = latestTimestamp ? this.formatTimestamp(latestTimestamp) : "No Data";

      // ✅ Always set selectedStation.details (prevents undefined details)
      this.selectedStation = {
          ...this.selectedStation,
          details: latestDetails,
          detailsTimestamp: formattedTimestamp // ✅ Store formatted timestamp
      };

      console.log("Updated Station Details:", this.selectedStation);
      this.cdr.detectChanges();
  } catch (error) {
      console.error("Error fetching station details:", error);
      this.selectedStation = { ...this.selectedStation, details: {} }; 
      this.cdr.detectChanges();
  }
}


sensorUpdateVars: string[] = ["RF_1_Tot300s", "RH_1_Avg", "SWin_1_Avg", "Tair_1_Avg", "WS_1_Avg"];

  // ✅ Ensure `objectKeys` always returns an array
  objectKeys(obj: Record<string, any> | null | undefined): string[] {
    return obj ? Object.keys(obj) : [];
  }

  // ✅ Function to check if any "Sensor latest update" variables exist
  hasSensorUpdateVariables(): boolean {
    if (!this.selectedStation || !this.selectedStation.details) return false;
    return this.sensorUpdateVars.some(key => this.selectedStation.details[key]);
  }

  // ✅ Handle sidebar close action
  closeSidebar(): void {
    this.selectedStation = null;
  }
  

getVariableName(variableId: string): string {
  const variableMap: { [key: string]: string } = {
      "RF_1_Tot300s": "Rainfall",
      "RH_1_Avg": "Relative Humidity",
      "Tair_1_Avg": "Temperature",
      "BattVolt": "Battery Voltage",
      "CellStr": "Cellular Signal Strength",
      "CellQlt": "Cellular Signal Quality"
  };
  return variableMap[variableId] || variableId; // ✅ Returns readable name or fallback to original ID
}

updateVariable(event: Event): void {
  this.selectedVariable = (event.target as HTMLSelectElement).value;
  console.log(`Selected Variable Changed: ${this.selectedVariable}`);

  this.fetchStationData(); // Fetch new data
}


ngAfterViewInit(): void {
  console.log("🗺️ Initializing Leaflet map...");

  this.map = L.map('map', {
      center: [20.493410, -158.064388],
      zoom: 8,
      layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')],
      zoomControl: false 
  });

  L.control.zoom({ position: "bottomleft" }).addTo(this.map);

  setTimeout(() => {
      console.log("🚀 Calling fetchStationData()...");
      this.fetchStationData();
  }, 500);
}


  
}
