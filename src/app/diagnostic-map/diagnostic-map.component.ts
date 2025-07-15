import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { environment } from "../../environments/environment";
import { interpolateViridis } from "d3-scale-chromatic";
import { HeaderComponent } from '../header/header.component';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';


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
    constructor(
      private cdr: ChangeDetectorRef,
      private http: HttpClient
    ) {}

    private toFloat(val: unknown): number {
      return typeof val === 'number' ? val : parseFloat(val as string);
    }


    private getApiUrlWithUserId(): string {
      return 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True&source=diagnostic_map';
    }

    loading: boolean = false;
    private map!: L.Map;
    private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
    private measurementsUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii';
    private apiToken = environment.apiToken;

    selectedVariable = "BattVolt";
    variableOptions = [
        { id: "BattVolt", name: "24H Min Battery Voltage" },
        { id: "CellQlt", name: "24H Min Cellular signal quality" },
        { id: "CellStr", name: "24H Min Cellular signal strength" },
        { id: "RHenc_max", name: "24H Max Enclosure relative humidity" },
        { id: "RHenc_50", name: ">50% Enclosure relative humidity" },
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
        this.loading = true;
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
        const stationIds = activeStations.map(s => s.station_id);
        const varId = this.selectedVariable;

        const stationCount = stationIds.length;

        const limit = ["Tair_diff", "RH_diff"].includes(this.selectedVariable)
          ? stationCount * 288 * 2
          : stationCount * 288;


        // Early return if it's 'Earliest Measurement' (still uses static JSON for now)
        if (varId === "Earliest Measurement") {
          await this.plotEarliestMeasurements(); // keep your original method
          return;
        }

        let fetchVars = [varId];
        if (["RHenc_max", "RHenc_50"].includes(varId)) {
          fetchVars = ["RHenc"];
        }
        if (varId === "Tair_diff") fetchVars = ["Tair_1_Avg", "Tair_2_Avg"];
        if (varId === "RH_diff") fetchVars = ["RH_1_Avg", "RH_2_Avg"];

        const url = `${this.measurementsUrl}&var_ids=${fetchVars.join(",")}&station_ids=${stationIds.join(",")}&local_tz=True&limit=${limit}`;
        console.log("[fetchStationData] API URL:", url);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data: Measurement[] = await response.json();
        const grouped: Record<string, number[]> = {};
        const diffGrouped: Record<string, { [ts: string]: number }> = {};

        for (const entry of data) {
          const sid = entry.station_id;
          const ts = entry.timestamp;
          const val = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value as string);


          if (isNaN(val)) continue;

          // For diff vars, store separately
          if (["Tair_diff", "RH_diff"].includes(varId)) {
            if (!diffGrouped[sid]) diffGrouped[sid] = {};
            if (!diffGrouped[sid][ts]) diffGrouped[sid][ts] = 0;
            diffGrouped[sid][ts + "|" + entry.variable] = val;
            continue;
          }

          // Regular vars
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(val);
        }

        const measurementMap: Record<string, number> = {};

        for (const sid of stationIds) {
          const values = grouped[sid] ?? [];

          if (values.length === 0) continue;

          switch (varId) {
            case "BattVolt":
            case "CellQlt":
            case "CellStr":
              measurementMap[sid] = Math.min(...values);
              break;
            case "RHenc_max":
              measurementMap[sid] = Math.max(...values);
              break;
            case "RHenc_50":
              const countAbove = values.filter(v => v > 50).length;
              measurementMap[sid] = (countAbove / values.length) * 100;
              break;
          }
        }

        // Diff var logic
        if (["Tair_diff", "RH_diff"].includes(varId)) {
          for (const sid of stationIds) {
            const raw = diffGrouped[sid];
            if (!raw) continue;

            const pairedDiffs: number[] = [];

            Object.keys(raw).forEach(key => {
              if (!key.includes("|")) return;
              const [ts, variable] = key.split("|");
            let otherVar = "";
            if (varId === "Tair_diff") {
              otherVar = variable === "Tair_1_Avg" ? "Tair_2_Avg" : "Tair_1_Avg";
            } else if (varId === "RH_diff") {
              otherVar = variable === "RH_1_Avg" ? "RH_2_Avg" : "RH_1_Avg";
            }
            const other = raw[ts + "|" + otherVar];

              if (other != null) {
                const diff = Math.abs(raw[key] - other);
                pairedDiffs.push(diff);
              }
            });

            if (pairedDiffs.length > 0) {
              measurementMap[sid] = Math.max(...pairedDiffs);
            }
          }
        }

        // Special station logic
        const v = this.selectedVariable;
        const v0520 = measurementMap["0520"] ?? null;
        const v0521 = measurementMap["0521"] ?? null;
        if (v0520 !== null && v0521 !== null) {
          if (v === "BattVolt") {
            measurementMap["0521"] = Math.min(v0520, v0521);
          } else if (["RHenc_max", "RHenc_50"].includes(v)) {
            measurementMap["0521"] = Math.max(v0520, v0521);
          } else if (["CellStr", "CellQlt"].includes(v)) {
            measurementMap["0521"] = v0520;
          }
        }

        this.plotStations(activeStations, measurementMap, false);

        // Timestamp for UI
        const tsEntry = data.find(d => d.station_id === "0115");
        if (tsEntry?.timestamp) {
          this.latestObservationTime = this.formatTimestamp(tsEntry.timestamp);
        }

        console.log("Processed station data:");
        Object.entries(measurementMap).forEach(([stationId, value]) => {
          console.log(`  ${stationId}: ${value}`);
        });


      } catch (error) {
        console.error("Error fetching diagnostic station data:", error);
      } finally {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }


    private getColorFromValue(value: number, min: number, max: number): string {
        if (this.selectedVariable === "BattVolt") {
            if (value < 11.8) return "red";
            if (value < 12) return "orange";
            if (value < 12.2) return "yellow";
            return "green";
        } else if (this.selectedVariable === "RHenc_max") {
            if (value >= 75) return "red";
            if (value >= 50) return "yellow";
            return "green";
        } else if (this.selectedVariable === "RHenc_50") {
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
                `} else if (this.selectedVariable === "RHenc_max") {
                    div.innerHTML = `
                    <h4>${this.selectedVariable}</h4>
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: green; display: inline-block; margin-right: 5px;"></span>
                            <span>< 50%</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="width: 15px; height: 15px; background: yellow; display: inline-block; margin-right: 5px;"></span>
                            <span>50-75%</span>
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
                `} else if (this.selectedVariable === "RHenc_50") {
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
      this.loading = true;

      const details: { [key: string]: number } = {};
      const sensorUpdates: { [key: string]: string } = {};

      try {
        // --- Diagnostic variables (one request) ---
        const diagVars = ["BattVolt", "CellQlt", "CellStr", "RHenc"];
        const diagUrl = `${this.measurementsUrl}&var_ids=${diagVars.join(",")}&station_ids=${stationId}&local_tz=True&limit=288`;

        console.log("📡 Fetching diagnostic vars from:", diagUrl);

        let diagData: Measurement[] = [];
        try {
          const diagRes = await firstValueFrom(this.http.get<Measurement[]>(diagUrl, {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            }
          }));
          console.log("📥 Diagnostic response:", diagRes);
          diagData = diagRes ?? [];
        } catch (err: any) {
          console.error("❌ Failed to fetch diagnostic vars:", err.message || err);
        }

        const byVar: Record<string, Measurement[]> = {};
        for (const entry of diagData) {
          if (!byVar[entry.variable]) byVar[entry.variable] = [];
          byVar[entry.variable].push(entry);
        }

        for (const v of ["BattVolt", "CellQlt", "CellStr"]) {
          const values = (byVar[v] || []).map(d => this.toFloat(d.value)).filter(v => !isNaN(v));
          if (values.length) {
            details[v] = Math.min(...values);
            const latest = byVar[v].find(d => d.value != null)?.timestamp;
            if (latest) sensorUpdates[v] = this.formatTimestamp(latest);
          }
        }

        const rhencVals = (byVar["RHenc"] || []).map(d => this.toFloat(d.value)).filter(v => !isNaN(v));
        if (rhencVals.length) {
          details["RHenc_max"] = Math.max(...rhencVals);
          details["RHenc_50"] = (rhencVals.filter(v => v > 50).length / rhencVals.length) * 100;
          const latest = byVar["RHenc"].find(d => d.value != null)?.timestamp;
          if (latest) sensorUpdates["RHenc"] = this.formatTimestamp(latest);
        }

        // --- Tair sensor diff ---
        const tairVars = ["Tair_1_Avg", "Tair_2_Avg"];
        const tairUrl = `${this.measurementsUrl}&var_ids=${tairVars.join(",")}&station_ids=${stationId}&local_tz=True&limit=288`;
        console.log("📡 Fetching Tair vars from:", tairUrl);

        try {
          const tairRes = await firstValueFrom(this.http.get<Measurement[]>(tairUrl));
          const tairPairs: { [ts: string]: number[] } = {};
          for (const d of tairRes) {
            const val = this.toFloat(d.value);
            if (isNaN(val)) continue;
            if (!tairPairs[d.timestamp]) tairPairs[d.timestamp] = [];
            tairPairs[d.timestamp].push(val);
          }
          const diffs = Object.values(tairPairs)
            .filter(p => p.length === 2)
            .map(([a, b]) => Math.abs(a - b));
          if (diffs.length) {
            details["Tair_diff"] = Math.max(...diffs);
            const latest = tairRes.find(d => d.value != null)?.timestamp;
            if (latest) sensorUpdates["Tair"] = this.formatTimestamp(latest);
          }
        } catch (err: any) {
          console.error("❌ Failed to fetch Tair vars:", err.message || err);
        }

        // --- RH sensor diff ---
        const rhVars = ["RH_1_Avg", "RH_2_Avg"];
        const rhUrl = `${this.measurementsUrl}&var_ids=${rhVars.join(",")}&station_ids=${stationId}&local_tz=True&limit=288`;
        console.log("📡 Fetching RH vars from:", rhUrl);

        try {
          const rhRes = await firstValueFrom(this.http.get<Measurement[]>(rhUrl));
          const rhPairs: { [ts: string]: number[] } = {};
          for (const d of rhRes) {
            const val = this.toFloat(d.value);
            if (isNaN(val)) continue;
            if (!rhPairs[d.timestamp]) rhPairs[d.timestamp] = [];
            rhPairs[d.timestamp].push(val);
          }
          const diffs = Object.values(rhPairs)
            .filter(p => p.length === 2)
            .map(([a, b]) => Math.abs(a - b));
          if (diffs.length) {
            details["RH_diff"] = Math.max(...diffs);
            const latest = rhRes.find(d => d.value != null)?.timestamp;
            if (latest) sensorUpdates["RH"] = this.formatTimestamp(latest);
          }
        } catch (err: any) {
          console.error("❌ Failed to fetch RH vars:", err.message || err);
        }

        // --- Save + show ---
        if (!this.selectedStation) this.selectedStation = { id: stationId } as any;
        this.selectedStation.details = details;
        this.selectedStation.sensorUpdates = sensorUpdates;

        console.table(details);
        console.table(sensorUpdates);

      } catch (err: any) {
        console.error(`❌ Unexpected error in fetchStationDetails for ${stationId}:`, err.message || err);
      } finally {
        this.loading = false;
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
      if (value === null || value === "No Data" || isNaN(parseFloat(value as any))) {
        return "No Data";
      }

      const numValue = parseFloat(value as any);

      switch (variable) {
        case "BattVolt":
          if (numValue === 0) return "No Data";
          if (numValue < 11.8) return "Critical";
          if (numValue < 12) return "Warning";
          if (numValue < 12.2) return "Caution";
          return "Good";

        case "RHenc_max":
          if (numValue >= 75) return "Critical";
          if (numValue >= 50) return "Caution";
          return "Good";

        case "RHenc_50":
          if (numValue >= 30) return "Critical";
          if (numValue > 10) return "Caution";
          return "Good";

        case "CellStr":
          if (numValue === 0) return "No Data";
          if (numValue < -115) return "Critical";
          if (numValue < -106) return "Warning";
          return "Good";

        case "CellQlt":
          if (numValue === 0) return "No Data";
          if (numValue < -12) return "Warning";
          return "Good";

        case "Tair_diff":
          if (numValue > 0.2) return "Critical";
          if (numValue > 0.1) return "Warning";
          return "Good";

        case "RH_diff":
          if (numValue > 2) return "Critical";
          if (numValue > 1.5) return "Warning";
          return "Good";

        default:
          return "No Data";
      }
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
            "RHenc_max":"24H Max Enclosure Relative Humidity",
            "RHenc_50": ">50% Enclosure Relative Humidity",
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
        requestAnimationFrame(() => {
          this.map = L.map('map', {
            center: [20.493410, -158.064388],
            zoom: 8,
            layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')],
            zoomControl: false
          });
      
          L.control.zoom({ position: "bottomleft" }).addTo(this.map);
      
          setTimeout(() => {
            this.map.invalidateSize(); // optional: helps if map is hidden on init
            this.fetchStationData();
          }, 500);
        });
      }
      
    }
