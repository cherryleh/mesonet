import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { GraphingDataService } from '../graphing-data.service';
import { GraphingMenuService } from '../graphing-menu.service';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-graphing',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent],
  templateUrl: './graphing.component.html',
  styleUrl: './graphing.component.css'
})

export class GraphingComponent implements OnInit, AfterViewInit {
  stationId: string = '';
  selectedVariable: string = 'RF_1_Tot300s'; // Default variable
  selectedDuration: string = '24h'; // Default duration
  chart: Highcharts.Chart | null = null;

  variables: { label: string, value: string }[] = [
    { label: 'Rainfall', value: 'RF_1_Tot300s' },
    { label: 'Soil Moisture', value: 'SM_1_Avg' },
    { label: 'Rainfall and Soil Moisture', value: 'RF_1_Tot300s,SM_1_Avg' }
  ];
  durations: { label: string, value: string }[] = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' }
  ];

  constructor(
    private route: ActivatedRoute,
    private graphingDataService: GraphingDataService,
    private graphingMenuService: GraphingMenuService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID from URL:', this.stationId);
      this.loadData(); // Load data after extracting the ID
    });
  }

  ngAfterViewInit(): void {
    this.initializeChart(); // Call the chart initialization method
  }

  onVariableChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedVariable = selectedValue;
  }

  onDurationChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedDuration = selectedValue;
    this.graphingMenuService.setDuration(this.selectedDuration);
  }

  updateChartButtonClick(): void {
    console.log('Update Chart button clicked');
    this.loadData(); // Call loadData() to update the chart
  }

  loadData(): void {
    const days = this.getDaysFromDuration(this.selectedDuration);
    const startDate = this.getDateMinusDaysInHST(days);

    this.graphingDataService.getData(this.stationId, this.selectedVariable, startDate).subscribe(
      data => {
        console.log('Raw API response:', data); // Log the raw API response

        if (!data || data.length === 0) {
          console.error('No data returned from API or data is empty');
          return;
        }

        const seriesData = this.formatData(data);
        this.updateChart(seriesData);
      },
      error => {
        console.error('Error fetching data from API:', error);
      }
    );
  }

  formatData(data: any): Highcharts.SeriesOptionsType[] {
    if (!data || data.length === 0) return []; // Check if the array is empty

    const seriesData: Highcharts.SeriesOptionsType[] = [];
    const variableList = this.selectedVariable.split(',');

    variableList.forEach(variable => {
      const variableData = data
        .filter((item: any) => item.variable === variable) // Filter for the selected variable
        .map((item: any) => ({
          timestamp: new Date(item.timestamp).getTime(), // Convert timestamp to milliseconds
          value: parseFloat(item.value) // Convert value from string to number
        }));

      let aggregatedData = variableData;

      // If the selected duration is 7d or 30d, aggregate to hourly
      if (this.selectedDuration === '7d' || this.selectedDuration === '30d') {
        aggregatedData = this.aggregateToHourly(variableData);
      } 

      // If the selected duration is 24h, do NOT aggregate (use 5-minute data as-is)
      if (this.selectedDuration === '24h') {
        aggregatedData = variableData.map((item: { timestamp: number; value: number }) => [item.timestamp, item.value]);
      }

      seriesData.push({
        type: 'line',
        name: this.variables.find(v => v.value === variable)?.label || variable,
        data: aggregatedData
      });
    });

    return seriesData;
  }

  aggregateToHourly(data: { timestamp: number, value: number }[]): [number, number][] {
    // Create a map to group values by hour
    const hourlyMap: Record<string, number[]> = {};

    data.forEach(item => {
      // Convert timestamp to "hour" (e.g., 2024-12-18T19:00:00.000Z)
      const date = new Date(item.timestamp);
      date.setMinutes(0, 0, 0); // Set to the start of the hour
      const hourKey = date.getTime(); // Get the hour as a timestamp

      // Group values by hour
      if (!hourlyMap[hourKey]) {
        hourlyMap[hourKey] = [];
      }
      hourlyMap[hourKey].push(item.value);
    });

    // Aggregate each hour's data
    const aggregatedData: [number, number][] = Object.entries(hourlyMap).map(([hour, values]) => {
      const timestamp = parseInt(hour, 10); // Convert the hour key back to a number
      const averageValue = values.reduce((acc, val) => acc + val, 0) / values.length; // Calculate the average
      return [timestamp, parseFloat(averageValue.toFixed(2))]; // Round to 2 decimals
    });

    // Sort by timestamp
    aggregatedData.sort((a, b) => a[0] - b[0]);

    return aggregatedData;
  }




  initializeChart(): void {
    if (!this.chart) {
      this.chart = Highcharts.chart('graphContainer', {
        chart: {
          type: 'line'
        },
        title: {
          text: 'Dashboard Chart'
        },
        xAxis: {
          type: 'datetime'
        },
        yAxis: {
          title: {
            text: 'Values'
          }
        },
        tooltip: {
          shared: true,
          valueDecimals: 2,
          xDateFormat: '%b %e, %Y %l:%M%p'
        },
        time: {
          timezoneOffset: 600, // To display in Hawaii time
        },
        series: [] // Empty initially
      });
    }
  }

  updateChart(seriesData: Highcharts.SeriesOptionsType[]): void {
    if (this.chart) {
      while (this.chart.series.length) {
        this.chart.series[0].remove(false);
      }
      seriesData.forEach(series => this.chart?.addSeries(series, false));
      this.chart?.redraw();
    } else {
      console.error('Chart is not initialized yet.');
    }
  }

  getDateMinusDaysInHST(days: number): string {
    const currentDate = new Date();
    const dateMinusHours = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const hawaiiTimeFormat = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = hawaiiTimeFormat.formatToParts(dateMinusHours).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}-10:00`;
  }


  getDaysFromDuration(duration: string): number {
    if (duration === '24h') return 1;
    if (duration === '7d') return 7;
    if (duration === '30d') return 30;
    return 0;
  }


}
