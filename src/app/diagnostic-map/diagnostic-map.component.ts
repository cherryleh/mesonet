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
        { id: "RHenc", name: "Enclosure relative humidity" },
        { id: "Tair_diff", name: "Temperature Sensor Difference" },
        { id: "RH_diff", name: "Relative Humidity Sensor Difference"},
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

    async fetchMapObservationTime(): Promise<void> {
        try {
            const response = await fetch("https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/BattVolt.json");
            const data: Record<string, { value: string; timestamp: string }> = await response.json();

            const firstEntry = Object.values(data)[0];
            if (firstEntry && firstEntry.timestamp) {
                this.latestObservationTime = this.formatTimestamp(firstEntry.timestamp);
            }
        } catch (error) {
            console.error("Error fetching map observation time:", error);
            this.latestObservationTime = null;
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

        const values = Object.values(measurementMap)
            .filter(v => v !== null && v !== 0 && !isTimestamp); // Treat 0 as No Data

        const minValue = values.length > 0 ? Math.min(...values) : 0;
        const maxValue = values.length > 0 ? Math.max(...values) : 1;

        setTimeout(() => {
            stations.forEach(station => {
                if (!station || !station.lat || !station.lng) {
                    console.warn(`Skipping invalid station:`, station);
                    return;
                }
                let rawValue = measurementMap[station.station_id] ?? null;

                // // Treat 0 as No Data
                // if (rawValue === 0) {
                //     rawValue = null;
                // }

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
                    fillOpacity: rawValue !== null ? 0.8 : 0.4,
                    weight: rawValue !== null ? 1 : 0.5
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
            await this.fetchMapObservationTime();

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
                case "Tair_diff":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/Tair_diff.json";
                    break;
                case "RH_diff":
                    dataUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/RH_diff.json";
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

            // Special Rule for Station 0521
            if (this.selectedVariable === "BattVolt") {
                const value0520 = measurementMap["0520"] ?? null;
                const value0521 = measurementMap["0521"] ?? null;
                if (value0520 !== null && value0521 !== null) {
                    measurementMap["0521"] = Math.min(value0520, value0521);
                }
            } else if (this.selectedVariable === "RHenc") {
                const value0520 = measurementMap["0520"] ?? null;
                const value0521 = measurementMap["0521"] ?? null;
                if (value0520 !== null && value0521 !== null) {
                    measurementMap["0521"] = Math.max(value0520, value0521);
                }
            } else if (this.selectedVariable === "CellStr" || this.selectedVariable === "CellQlt") {
                if (measurementMap["0520"] !== undefined) {
                    measurementMap["0521"] = measurementMap["0520"]; // Use 0520's value for 0521
                }
            }

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
            return "green";
        } else if (this.selectedVariable === "RHenc") {
            if (value >= 30) return "red";
            if (value >= 10) return "yellow";
            return "green";
        } else if (this.selectedVariable === "CellStr") {
            if (value < -115) return "red";
            if (value < -106) return "yellow";
            return "green";
        } else if (this.selectedVariable === "CellQlt") {
            if (value < -12) return "red";
            return "green";
        } else if (this.selectedVariable === "Tair_diff") {
            if (value > 0.2) return "red";
            if ( value >0.1) return "yellow";
            return "green";
        } else if (this.selectedVariable === "RH_diff") {
            if (value > 2) return "red";
            if ( value > 1.5) return "yellow";
            return "green";
        }else {
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
                        <span>< 10%</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                        <span>10-30%</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                            <span>> 30%</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                            <span>No Data</span>
                        </div>
                    </div>
                `} else if (this.selectedVariable === "Tair_diff") {
                    div.innerHTML = `
                    <h4>${this.selectedVariable}</h4>
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                            <span>< 0.1</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                            <span>0.1-0.2</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                                <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                                <span>>0.2</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center;">
                                <span style="width: 15px; height: 15px; background: gray; display: inline-block; margin-right: 5px;"></span>
                                <span>No Data</span>
                            </div>
                        </div>
                    `}else if (this.selectedVariable === "RH_diff") {
                        div.innerHTML = `
                        <h4>${this.selectedVariable}</h4>
                        <div style="display: flex; flex-direction: column;">
                            <div style="display: flex; align-items: center;">
                                <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                                <span>< 1.5%</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                                <span>1.5-2%</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                    <span style="width: 15px; height: 15px; background: red; display: inline-block; margin-right: 5px;"></span>
                                    <span>> 2%</span>
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
                "RHenc": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/RHenc.json",
                "Tair_diff": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/Tair_diff.json",
                "RH_diff": "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/RH_diff.json",
            };

            let latestDetails: { [key: string]: string } = {};
            let sensorUpdateDetails: { [key: string]: string } = {};

            // Fetch local JSON files for diagnostics
            const jsonRequests = Object.keys(variableJsonUrls).map(async (variable) => {
                const response = await fetch(variableJsonUrls[variable]);
                const data: Record<string, { value: string; timestamp: string }> = await response.json();
                return { variable, data };
            });

            // Fetch sensor update JSON (for "Sensor Latest Update")
            const sensorUpdateUrl = "https://raw.githubusercontent.com/cherryleh/mesonet/data-branch/data/latest_measurements.json";
            const [sensorUpdateResponse, ...resolvedJsonResponses] = await Promise.all([
                fetch(sensorUpdateUrl).then(res => res.json()).catch(err => {
                    console.warn("Sensor update fetch failed:", err);
                    return [];
                }),
                ...jsonRequests
            ]);

            // Process diagnostic JSON values
            resolvedJsonResponses.forEach(({ variable, data }) => {
                Object.keys(data).forEach(stationKey => {
                    const shouldInclude = (stationId === '0521' && (stationKey === '0520' || stationKey === '0521')) ||
                                          stationKey === stationId;

                    if (shouldInclude) {
                        const rawValue = parseFloat(data[stationKey].value);
                        const key = `${stationKey} ${this.getVariableName(variable)}`;
                        latestDetails[key] = isNaN(rawValue) ? "No Data" : rawValue.toString();
                    }

  
                });
            });

            // Process sensor updates (like in your old code)
            sensorUpdateResponse.forEach((measurement: Measurement) => {
                if (measurement.station_id === stationId && measurement.timestamp) {
                    const timeAgo = this.formatTimeAgo(measurement.timestamp);
                    sensorUpdateDetails[measurement.variable] = timeAgo.text;
                }
            });

            // Optional: Remove bad data for 0521
            if (stationId === "0521") {
                delete latestDetails["0521 Cellular Signal Strength"];
                delete latestDetails["0521 Cellular Signal Quality"];
            }

            this.selectedStation = {
                ...this.selectedStation,
                details: latestDetails,
                sensorUpdates: sensorUpdateDetails
            };

            this.cdr.detectChanges();

        } catch (error) {
            console.error("Error fetching station details:", error);
            this.selectedStation = { ...this.selectedStation, details: {}, sensorUpdates: {} };
            this.cdr.detectChanges();
        }
    }


    isDifferenceVariable(key: string): boolean {
        const name = key.toLowerCase();
        return name.includes('sensor difference') || name.includes('diff');
      }
      parseValue(val: any): number {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
    

    getStatus(variable: string, value: number | string | null): string {
        if (value === null || value === "No Data" || isNaN(parseFloat(value as any)) || parseFloat(value as any) === 0) {
            return "No Data";
        }

        const numValue = parseFloat(value as any);

        if (variable === "Battery Voltage") {
            if (numValue < 11.8) return "Critical";
            if (numValue < 12) return "Warning";
            if (numValue < 12.2) return "Caution";
            return "Good";
        } else if (variable === "Enclosure Relative Humidity") {
            if (numValue >= 30) return "Critical";
            if (numValue > 10) return "Caution";
            return "Good";
        } else if (variable === "Cellular Signal Strength") {
            if (numValue < -115) return "Critical";
            if (numValue < -106) return "Warning";
            return "Good";
        } else if (variable === "Cellular Signal Quality") {
            if (numValue < -12) return "Warning";
            return "Good";
        } else if (variable === "Tair Sensor Difference") {
            if (numValue > 0.2) return "Critical";
            if (numValue > 0.1) return "Warning";
            return "Good";
        } else if (variable === "RH Sensor Difference") {
            if (numValue > 30) return "Critical";
            if (numValue > 10) return "Warning";
            return "Good";
        }
        

        return "No Data";
    }

    getStatusClass(variable: string, value: number | string | null): string {
        const status = this.getStatus(variable, value);
        return status === "No Data" ? "no-data" : status.replace(" ", ""); // Converts "No Data" -> "no-data" for CSS
    }


    sensorUpdateVars: string[] = ["RF_1_Tot300s", "Tair_1_Avg", "Tair_2_Avg", "RH_1_Avg","RH_2_Avg", "SWin_1_Avg","WS_1_Avg","SM_1_Avg", "Tsoil_1_Avg", "P_1"];
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
            "RH_1_Avg": "Relative Humidity Sensor 1",
            "RH_2_Avg": "Relative Humidity Sensor 2",
            "Tair_1_Avg": "Temperature Sensor 1",
            "Tair_2_Avg": "Temperature Sensor 2",
            "SM_1_Avg": "Soil Moisture",
            "Tsoil_1_Avg": "Soil Temperature",
            "P_1": "Pressure",
            "BattVolt": "Battery Voltage",
            "CellStr": "Cellular Signal Strength",
            "CellQlt": "Cellular Signal Quality",
            "RHenc": "Enclosure Relative Humidity",
            "Tair_diff": "Tair Sensor Difference",
            "RH_diff": "RH Sensor Difference",
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
