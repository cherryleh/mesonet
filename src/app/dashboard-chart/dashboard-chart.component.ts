import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import * as Highcharts from 'highcharts';
import { DashboardChartService } from '../dashboard-chart.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Import the spinner module


@Component({
  selector: 'app-dashboard-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule], // Add FormsModule here
  templateUrl: './dashboard-chart.component.html',
  styleUrls: ['./dashboard-chart.component.css'],
  providers: [DashboardChartService], // Provide the service here if not in root
})
export class DashboardChartComponent implements AfterViewInit {
  refreshIntervalMS = 30000; // Refresh interval in milliseconds
  isLoading = false;
  id: string | null = null;
  selectedDuration = '1080';
  durations = [
    { label: 'Last 24 Hours', value: '1080' },
    { label: 'Last 3 Days', value: '3240' },
    { label: 'Last 7 Days', value: '7560' },
  ];
  Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      zooming: {
        type: 'x', // Enable x-axis zoom
      },
    },
    title: {
      text: ''
      },
    xAxis: {
      type: 'datetime',
    },
    yAxis: [
      {
        title: { text: 'Temperature (°F)' },
      },
      {
        title: { text: '5-min Rainfall (in)' }, 
        opposite: true,
      },
      {
        title: { text: 'Solar Radiation (W/m²)' }, 
        opposite: true,
        min: 0
      },
    ],
    tooltip: {
      shared: true,
      valueDecimals: 2, 
      xDateFormat: '%b %e, %Y %l:%M%p'
    },
    time: {
      timezoneOffset: 600, // To display in Hawaii time
    },
    series: [], 
  };

  constructor(private route: ActivatedRoute, private dataService: DashboardChartService) {}

  fetchData(id: string, limit: string): void {
    this.isLoading = true; // Show the loading indicator
    this.dataService.getData(id, limit).subscribe(
      (data: any[]) => {
        let temperatureData: [number, number][] = [];
        let rainfallData: [number, number][] = [];
        let radData: [number, number][] = [];

        data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);

          if (item.variable === 'Tair_1_Avg') {
            temperatureData.push([timestamp, (value * 1.8) + 32]); // Convert Celsius to Fahrenheit
          } else if (item.variable === 'RF_1_Tot300s') {
            rainfallData.push([timestamp, value / 25.4]); // Rainfall mm to inches
          } else if (item.variable === 'SWin_1_Avg') {
            radData.push([timestamp, value]); // Solar Radiation
          }
        });

        if (limit === '3240' || limit === '7560') {
          temperatureData = this.aggregateToHourly(temperatureData);
          rainfallData = this.aggregateToHourly(rainfallData, true); // Aggregate rainfall by sum
          radData = this.aggregateToHourly(radData);
        }

        this.chartOptions.series = [
          {
            name: 'Temperature (°F)',
            data: temperatureData,
            yAxis: 0,
            type: 'line',
            zIndex: 2,
            color: '#FC7753',
            marker: {
              enabled: false, // Disable markers for this series
            }
          },
          {
            name: 'Rainfall (in)',
            data: rainfallData,
            yAxis: 1,
            type: 'column',
            zIndex: 1,
            color: '#058DC7',
            pointWidth: 5,
            marker: {
              enabled: false,
            },
            connectNulls: true,
            dataGrouping: {
              enabled: true
            },
          },
          {
            name: 'Solar Radiation (W/m²)',
            data: radData,
            yAxis: 2,
            type: 'line',
            zIndex: 1,
            color: '#FFC914',
            marker: {
              enabled: false, // Disable markers for this series
            }            
          },
        ] as Highcharts.SeriesOptionsType[];

        const container = document.getElementById('container');
        if (container) {
          Highcharts.chart(container, this.chartOptions);
        }
        this.isLoading = false; // Hide the loading indicator after chart update
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false; // Hide the loading indicator on error
      }
    );
  }



  ngAfterViewInit(): void {
    this.route.queryParams.subscribe(params => {
      this.id = params['id'];
      if (this.id) {
        this.fetchData(this.id, this.selectedDuration); // Fetch with default 24-hour duration
      }
    });
    this.updateData();
  }

  queryData(): void {
    console.log('Data fetched from API');
  }

  updateData(): void {
    this.queryData();
    setTimeout(() => {
      this.updateData();
    }, this.refreshIntervalMS);
  }

  
  aggregateToHourly(data: [number, number][], sum = false): [number, number][] {
    const hourlyData: { [hour: string]: { sum: number; count: number } } = {};

    // Step 1: Aggregate data by rounding timestamps to the start of the hour (UTC)
    data.forEach(([timestamp, value]) => {
      const hourTimestamp = Math.floor(timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60); // Round down to the start of the hour
      if (!hourlyData[hourTimestamp]) {
        hourlyData[hourTimestamp] = { sum: 0, count: 0 };
      }
      hourlyData[hourTimestamp].sum += value;
      hourlyData[hourTimestamp].count += 1;
    });

    // Step 2: Calculate the aggregated values for each complete hour
    return Object.keys(hourlyData)
      .filter(hour => hourlyData[hour].count === 12) // For 5-minute intervals, expect 12 points per hour
      .map(hour => {
        const timestamp = Number(hour) + (30 * 60 * 1000); // Add 30 minutes to get the midpoint of the hour
        const { sum: totalSum, count } = hourlyData[hour];
        const result = sum ? totalSum : totalSum / count; // Sum if sum = true, otherwise average
        return [timestamp, result];
      });
  }





  onDurationChange(): void {
    if (this.id) {
      this.fetchData(this.id, this.selectedDuration); // Fetch data for the selected duration
    }
  }
}
