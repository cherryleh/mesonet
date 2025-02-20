import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { HighchartsChartModule } from "highcharts-angular";
import { NgIf } from "@angular/common";  
import Highcharts from "highcharts/highmaps";
import { environment } from "../../environments/environment";  

@Component({
  selector: 'app-highchart-map',
  standalone: true,
  templateUrl: './highchart-map.component.html',
  imports: [HighchartsChartModule, NgIf],
})
export class HighchartMapComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor = "mapChart";
  chartOptions: Highcharts.Options | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get("/hawaii.geojson").subscribe(
      (geojson: any) => {
        console.log("GeoJSON Loaded:", geojson); 
        this.fetchStationData(geojson);
      },
      (error) => {
        console.error("Error loading GeoJSON:", error);
      }
    );
  }

  async fetchStationData(geojson: any): Promise<void> {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?reverse=True';
    const apiToken = environment.apiToken;

    try {
      // ✅ Step 1: Fetch all stations
      const stations: any[] = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());

      const stationIds = stations.map(station => station.station_id).join(",");

      const measurementsUrl = `https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=Tsoil_1_Avg&local_tz=True&station_ids=${stationIds}&start_date=2025-01-30T11:15:00-10:00`;
      const measurements: any[] = await fetch(measurementsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());

      const measurementMap: { [key: string]: number } = {};
      measurements.forEach(measurement => {
        if (measurement.station_id && measurement.value !== undefined) {
          measurementMap[measurement.station_id] = measurement.value;
        }
      });

      const values = Object.values(measurementMap).filter(v => v !== null);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      const stationData: Highcharts.SeriesMappointDataOptions[] = stations
      .filter(station => station.lat && station.lng && station.name)
      .map(station => {
        let value = measurementMap[station.station_id] || null;
        let color = "gray"; // Default color for missing data

        if (value !== null) {
          color = this.getColorFromValue(value, minValue, maxValue);
          value = Math.round(value); // ✅ Convert to whole number
        }

        return {
          lat: station.lat,
          lon: station.lng,
          name: station.name,
          color: color,
          custom: {  
            url: `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${station.station_id}`,
            value: value // ✅ Store rounded value
          }
        };
      });


        this.chartOptions = {
          chart: { 
            map: geojson
          },
          title: { text: "" },
          mapNavigation: { enabled: true, enableMouseWheelZoom: true },
          colorAxis: {
            min: 15,  
            max: 40,  
            stops: [
              [0, 'rgb(255, 200, 200)'], 
              [1, 'rgb(255, 0, 0)']      
            ],
            labels: {
              format: '{value}' // Format the values shown in the legend
            }
          },
          legend: {
            title: {
              text: "Temperature", // Legend title
              style: { fontSize: '12px', fontWeight: 'bold' }
            }
          },
          tooltip: {  
            useHTML: true,
            hideDelay: 1500,
            style: { pointerEvents: 'auto' },
            formatter: function () {
              const point = this.point as Highcharts.Point & { options?: { name?: string, custom?: { url?: string, value?: number } } };
              if (point.options?.custom?.url && point.options?.name) {
                return `<div style="text-align: center;">
                          <b>${point.options.name}</b><br> <!-- ✅ Show station name in tooltip -->
                          <span>Temperature: ${point.options.custom.value !== undefined ? point.options.custom.value : "No Data"}</span><br>
                          <a href="${point.options.custom.url}" target="_blank" 
                             style="color: blue; text-decoration: underline; font-weight: bold;">
                             Open Dashboard
                          </a>
                        </div>`;
              }
              return "No data available";
            }
          },
          series: [
            {
              type: "map",
              name: "Hawaii",
              data: [],
              borderColor: "#000000",
              borderWidth: 1
            },
            {
              type: "mappoint",
              name: "Stations",
              marker: { 
                radius: 14 // Adjust marker size
              },
              data: stationData,
              dataLabels: { 
                enabled: true,  
                format: "{point.custom.value}", // ✅ Ensure it's a whole number
                align: "center",
                verticalAlign: "middle",
                style: {
                  fontSize: "14px",
                  fontWeight: "bold",
                  textOutline: "1px contrast",
                  color: "black"
                }
              }
            }
          ]



        };
  
  
  


    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  /**
   * ✅ Converts a value into a color on a blue-to-red gradient
   * @param value - The data value
   * @param minValue - The lowest measurement value
   * @param maxValue - The highest measurement value
   * @returns A color string
   */

  getColorFromValue(value: number, minValue: number, maxValue: number): string {
    if (minValue === maxValue) {
      return "rgb(255, 200, 200)"; // Light red if all values are the same
    }

    const percent = (value - minValue) / (maxValue - minValue);

    // Interpolate between light red and deep red
    const lightRed = [255, 200, 200]; // Light red (RGB)
    const deepRed = [255, 0, 0];      // Deep red (RGB)

    const r = Math.round(lightRed[0] + percent * (deepRed[0] - lightRed[0]));
    const g = Math.round(lightRed[1] + percent * (deepRed[1] - lightRed[1]));
    const b = Math.round(lightRed[2] + percent * (deepRed[2] - lightRed[2]));

    return `rgb(${r},${g},${b})`;
  }


}
