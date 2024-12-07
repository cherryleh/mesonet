import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import * as Highcharts from 'highcharts';
import { DashboardChartService } from '../dashboard-chart.service';

@Component({
  selector: 'app-dashboard-chart',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule here
  templateUrl: './dashboard-chart.component.html',
  styleUrls: ['./dashboard-chart.component.css'],
  providers: [DashboardChartService], // Provide the service here if not in root
})
export class DashboardChartComponent implements AfterViewInit {
  refreshIntervalMS = 30000; // Refresh interval in milliseconds

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
      height: '40%'
    },
    title: {
      text: 'Variable Data Over Time',
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
      },
    ],
    tooltip: {
      shared: true,
      valueDecimals: 2, 
    },
    time: {
      timezoneOffset: 600, // To display in Hawaii time
    },
    series: [], 
  };

  constructor(private route: ActivatedRoute, private dataService: DashboardChartService) {}

  fetchData(id: string, limit: string): void {
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
            rainfallData.push([timestamp, value/25.4]); // Rainfall mm to inches
          } else if (item.variable === 'SWin_1_Avg') {
            radData.push([timestamp, value]); // Solar Radiation
          }
        });

        // Aggregate data for 7-day duration
        if (limit === '3240' || limit === '7560') {
          temperatureData = this.aggregateToHourly(temperatureData);
          rainfallData = this.aggregateToHourly(rainfallData, true); // Aggregate by sum
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
          },
          {
            name: 'Rainfall (in)',
            data: rainfallData,
            yAxis: 1,
            type: 'column',
            zIndex: 1,
            color: '#058DC7',
            pointWidth: 5,
          },
          {
            name: 'Solar Radiation (W/m²)',
            data: radData,
            yAxis: 2,
            type: 'line',
            zIndex: 1,
            color: '#FFC914',
          },
        ] as Highcharts.SeriesOptionsType[];

        const container = document.getElementById('container');
        if (container) {
          Highcharts.chart(container, this.chartOptions);
        }
      },
      error => {
        console.error('Error fetching data:', error);
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

    data.forEach(([timestamp, value]) => {
      const hourTimestamp = Math.floor(timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60); // Round to the nearest hour
      if (!hourlyData[hourTimestamp]) {
        hourlyData[hourTimestamp] = { sum: 0, count: 0 };
      }
      hourlyData[hourTimestamp].sum += value;
      hourlyData[hourTimestamp].count += 1;
    });

    return Object.keys(hourlyData).map(hour => {
      const timestamp = parseInt(hour, 10);
      const { sum, count } = hourlyData[hour];
      return [timestamp, sum / (sum ? 1 : count)]; // Average for temperature or radiation
    });
  }


  onDurationChange(): void {
    if (this.id) {
      this.fetchData(this.id, this.selectedDuration); // Fetch data for the selected duration
    }
  }
}
