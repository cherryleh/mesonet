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
    constructor(private cdr: ChangeDetectorRef) { }

    private map!: L.Map;
    private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
    private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii';
    private apiToken = environment.apiToken;

    selectedVariable = "BattVolt";
    variableOptions = [
        { id: "BattVolt", name: "24H Min Battery Voltage" },
        { id: "CellQlt", name: "24H Min Cellular signal quality" },
        { id: "CellStr", name: "24H Min Cellular signal strength" },
        { id: "RHenc", name: "24H Max Enclosure relative humidity" },
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
            console.log('Station info', this.apiUrl);
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
                    fillOpacity: rawValue !== null ? 0.8 : 0.4, // Reduce opacity for No Data
                    weight: rawValue !== null ? 1 : 0.5 // Thinner border for No Data
                }).addTo(this.map);

                if (rawValue === null) {
                    marker.bringToBack(); // Moves "No Data" markers to the back
                } else {
                    marker.bringToFront(); // Moves Data markers to the front
                }



                marker.on('click', async () => {
                    console.log(`Clicked station: ${station.name} (ID: ${station.station_id})`);

                    this.selectedStation = {
                        name: station.name,
                        id: station.station_id,
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

            const stations: Station[] = await fetch(this.apiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
            }).then(res => res.json());

            console.log("Fetched Stations:", stations);

            let dataUrl = "";
            switch (this.selectedVariable) {
                case "BattVolt":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/BattVolt.json";
                    break;
                case "RHenc":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/RHenc.json";
                    break;
                case "CellStr":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/CellStr.json";
                    break;
                case "CellQlt":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/CellQlt.json";
                    break;
                default:
                    console.warn(`No local data available for ${this.selectedVariable}`);
                    return;
            }

            const response = await fetch(dataUrl);
            const data: Record<string, { value: string; timestamp: string }> = await response.json();

            console.log(`Fetched ${this.selectedVariable} Data:`, data);

            const measurementMap: Record<string, number> = {};
            Object.keys(data).forEach(stationId => {
                measurementMap[stationId] = parseFloat(data[stationId].value);
            });

            this.plotStations(stations, measurementMap, false);

        } catch (error) {
            console.error(`Error fetching data for ${this.selectedVariable}:`, error);
        }
    }


    private getColorFromValue(value: number, min: number, max: number): string {
        if (this.selectedVariable === "BattVolt") {
            if (value < 11.8) return "red";
            if (value < 12) return "orange";
            if (value < 12.2) return "yellow";
            return "green"; // > 13V
        } else if (this.selectedVariable === "RHenc") {
            if (value >= 75) return "red";
            if (value > 60) return "orange";
            if (value > 50) return "yellow";
            return "green";
        } else if (this.selectedVariable === "CellStr"){
            if (value < -115) return "red";
            if (value < -106) return "yellow";
            return "green";
        } else if (this.selectedVariable === "CellQlt"){
            if (value < -12) return "red";
            return "green";
        } else {
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
            } else if (this.selectedVariable === "BattVolt") {
                div.innerHTML = `
                <h4>${this.selectedVariable}</h4>
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                        <span>>12.2 VDC</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                        <span>12 to 12.2 VDC</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: orange; display: inline-block; margin-right: 5px;"></span>
                        <span>11.8 to 12 VDC</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                        <span><11.8 VDC</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                        <span>No Data</span>
                    </div>
                </div>
          `;
            } else if (this.selectedVariable === "CellStr") {div.innerHTML = `
                <h4>${this.selectedVariable}</h4>
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                        <span>>-105 dBm</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                        <span>-106 to -115 dBm</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                        <span>< -115 dBm</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                        <span>No Data</span>
                    </div>
                </div>
                `} else if (this.selectedVariable === "CellQlt") {div.innerHTML = `
                    <h4>${this.selectedVariable}</h4>
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                            <span>>-12</span>
                        </div>
                    <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                            <span>< -12</span>
                        </div>
                    <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                            <span>No Data</span>
                        </div>
                    </div>
                    `} else if (this.selectedVariable === "RHenc") {
                div.innerHTML = `
                <h4>${this.selectedVariable}</h4>
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                        <span>< 50%</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                        <span>50-60%</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: orange; display: inline-block; margin-right: 5px;"></span>
                        <span>60-75%</span>
                    </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                        <span>> 75%</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                        <span>No Data</span>
                    </div>
                </div>
                `} else {
                div.innerHTML = `
              <h4>${this.selectedVariable}</h4>
              <div id="legend-gradient" style="width: 200px; height: 15px; margin-bottom: 5px;"></div>
              <div style="display: flex; justify-content: space-between;">
                  <span>${minValue.toFixed(1)}</span>
                  <span>${maxValue.toFixed(1)}</span>
              </div>
          `;
            }

            return div;
        };

        legend.addTo(this.map);
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
            const variableJsonUrls: { [key: string]: string } = {
                "BattVolt": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/BattVolt.json",
                "CellStr": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/CellStr.json",
                "CellQlt": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/CellQlt.json",
                "RHenc": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/RHenc.json"
            };

            const latestValuesApiUrl = `${this.measurementsUrl}&var_ids=BattVolt,CellStr,CellQlt,RHenc&station_ids=${stationId}&local_tz=True&limit=4`;
            const sensorUpdateUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/latest_measurements.json";

            let latestDetails: { [key: string]: string } = {};

            const jsonRequests = Object.keys(variableJsonUrls).map(async (variable) => {
                const response = await fetch(variableJsonUrls[variable]);
                const data: Record<string, { value: string; timestamp: string }> = await response.json();
                return { variable, data };
            });

            const [latestValuesResponse, sensorUpdateResponse, ...jsonResponses] = await Promise.all([
                fetch(latestValuesApiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' } }),
                fetch(sensorUpdateUrl)
                    .then(response => response.json())
                    .catch(error => {
                        console.error("Error fetching sensor update data:", error);
                        return [];
                    }),
                ...jsonRequests
            ]);

            const latestMeasurements: Measurement[] = await latestValuesResponse.json();
            const sensorUpdates: Measurement[] = sensorUpdateResponse;
        
            jsonResponses.forEach(({ variable, data }) => {
                const measurement = data[stationId];
                if (measurement) {
                    const formattedValue = measurement.value.toString();
                    const variableName = this.getVariableName(variable); // Ensure correct name mapping
        
                    if (variable === "RHenc") {
                        latestDetails[`24H Max ${variableName}`] = formattedValue; // Ensure "Max" label is used
                    } else {
                        latestDetails[`24H Min ${variableName}`] = formattedValue;
                    }
                }
            });

            latestMeasurements.forEach(measurement => {
                if (measurement && measurement.value !== undefined && measurement.value !== null) {
                    latestDetails[`Current ${this.getVariableName(measurement.variable)}`] = measurement.value.toString();
                }
            });

            sensorUpdates.forEach(measurement => {
                if (measurement.station_id === stationId && measurement.timestamp) {
                    const timeAgo = this.formatTimeAgo(measurement.timestamp);
                    latestDetails[measurement.variable] = timeAgo.text;
                }
            });

            let latestTimestamp = latestMeasurements.length > 0 ? latestMeasurements[0].timestamp : "";
            let formattedTimestamp = latestTimestamp ? this.formatTimestamp(latestTimestamp) : "No Data";

            this.selectedStation = {
                ...this.selectedStation,
                details: latestDetails,
                detailsTimestamp: formattedTimestamp
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
    objectKeys(obj: Record<string, any> | null | undefined): string[] {
        return obj ? Object.keys(obj) : [];
    }
    hasSensorUpdateVariables(): boolean {
        if (!this.selectedStation || !this.selectedStation.details) return false;
        return this.sensorUpdateVars.some(key => this.selectedStation.details[key]);
    }
    closeSidebar(): void {
        this.selectedStation = null;
    }


    getVariableName(variableId: string): string {
        const variableMap: { [key: string]: string } = {
            "RF_1_Tot300s": "Rainfall",
            "WS_1_Avg": "Wind Speed",
            "SWin_1_Avg": "Solar Radiation",
            "RH_1_Avg": "Relative Humidity",
            "Tair_1_Avg": "Temperature",
            "BattVolt": "Battery Voltage",
            "CellStr": "Cellular Signal Strength",
            "CellQlt": "Cellular Signal Quality",
            "RHenc": "Enclosure Relative Humidity"
        };
        return variableMap[variableId] || variableId; 
    }

    updateVariable(event: Event): void {
        this.selectedVariable = (event.target as HTMLSelectElement).value;
        console.log(`Selected Variable Changed: ${this.selectedVariable}`);

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
