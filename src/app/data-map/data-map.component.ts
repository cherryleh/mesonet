import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { environment } from "../../environments/environment";  
import { interpolateViridis } from "d3-scale-chromatic"; 

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
  imports: [CommonModule],
  templateUrl: './data-map.component.html',
  styleUrl: './data-map.component.css'
})
export class DataMapComponent implements AfterViewInit {
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

  async fetchStationData(): Promise<void> {
    try {
        console.log("Fetching stations...");

        const stations: Station[] = await fetch(this.apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        console.log("Fetched stations:", stations);
        if (!stations || stations.length === 0) {
            console.warn("No station data received!");
            return;
        }

        const stationIds = stations.map(station => station.station_id).join(",");

        const measurementsApiUrl = `${this.measurementsUrl}&var_ids=${this.selectedVariable}&station_ids=${stationIds}&local_tz=True&limit=${stationIds.length}`;
        console.log("Fetching measurements from:", measurementsApiUrl);

        const measurements: Measurement[] = await fetch(measurementsApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
        }).then(res => res.json());

        console.log("Fetched measurements:", measurements);

        if (!measurements || measurements.length === 0) {
            console.warn("No measurement data received!");
            return;
        }

        const measurementMap: { [key: string]: number } = {};

        
        
        measurements.forEach(measurement => {
            if (measurement.station_id && measurement.value !== undefined) {
                measurementMap[measurement.station_id] = measurement.value;
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
                  this.selectedStation = {
                      name: station.name,
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
        console.error('Error fetching station data:', error);
    }
}

async fetchStationDetails(stationId: string): Promise<void> {
  try {
      const detailsApiUrl = `https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=Tair_1_Avg,Tsoil_1_Avg,RF_1_Tot300s,SWin_1_Avg,SM_1_Avg&station_ids=${stationId}&local_tz=True&limit=864`;

      console.log("Fetching station details from:", detailsApiUrl);

      const response = await fetch(detailsApiUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
      });

      const measurements: { variable?: string; value?: any }[] = await response.json();
      console.log("Fetched station details:", JSON.stringify(measurements, null, 2));

      if (!measurements || measurements.length === 0) {
          console.warn("No additional data available for this station.");
          this.selectedStation.details = { "RF_1_Tot300s": "No Data" }; 
          return;
      }

      const detailsMap: { [key: string]: string } = {};
      let rainfallSum = 0;
      let rainfallCount = 0;

      const unitMapping: { [key: string]: string } = {
        "Tair_1_Avg": "°C",      // Air Temperature
        "Tsoil_1_Avg": "°C",     // Soil Temperature
        "RF_1_Tot300s": "mm",    // Rainfall
        "SWin_1_Avg": "W/m²",    // Solar Radiation
        "SM_1_Avg": "%",         // Soil Moisture 
    };

    measurements.forEach((measurement) => {
        if (!measurement.variable) {
            console.warn("Skipping measurement with missing variable key:", measurement);
            return;
        }

        let numericValue = Number(measurement.value);

        if (!isNaN(numericValue)) {
            if (measurement.variable === "SM_1_Avg") {
                numericValue *= 100;
            }

            const unit = unitMapping[measurement.variable] || ""; 
            detailsMap[measurement.variable] = `${numericValue.toFixed(1)} ${unit}`;
        }
    });



      this.selectedStation.details = detailsMap;
  } catch (error) {
      console.error("Error fetching station details:", error);
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
}
