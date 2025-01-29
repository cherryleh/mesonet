import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { GraphingDataService } from '../services/graphing-data.service';
import { GraphingMenuService } from '../services/graphing-menu.service';
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
  selectedVariable: string = 'Tair_1_Avg'; // Default variable
  selectedDuration: string = '24h'; // Default duration
  selectedUnit: 'metric' | 'standard' = 'metric'; // Default to metric
  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
  chart: Highcharts.Chart | null = null;
  isLoading: boolean = false;
  variables: { label: string, value: string, yAxisTitle: string }[] = [
    { label: 'Temperature', value: 'Tair_1_Avg', yAxisTitle: 'Temperature (°C)' },
    { label: 'Rainfall', value: 'RF_1_Tot300s', yAxisTitle: 'Rainfall (mm)' },
    { label: 'Soil Moisture', value: 'SM_1_Avg', yAxisTitle: 'Soil Moisture (%)' },
    { label: 'Relative Humidity', value: 'RH_1_Avg', yAxisTitle: 'Relative Humidity (%)' },
    { label: 'Rainfall and Temperature', value: 'RF_1_Tot300s,Tair_1_Avg', yAxisTitle: '' },
    { label: 'Rainfall and Soil Moisture', value: 'RF_1_Tot300s,SM_1_Avg', yAxisTitle: '' }
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
  ) { }

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

  onUnitChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value as 'metric' | 'standard';
    this.selectedUnit = selectedValue;
  }


  updateChartButtonClick(): void {
    console.log('Update Chart button clicked');
    this.loadData(); // Call loadData() to update the chart
    
  }

  loadData(): void {
    this.isLoading = true;
    const days = this.getDaysFromDuration(this.selectedDuration);
    const startDate = this.getDateMinusDaysInHST(days);

    this.graphingDataService.getData(this.stationId, this.selectedVariable, startDate).subscribe(
      data => {
        console.log('Raw API response:', data); // Log the raw API response

        if (!data || data.length === 0) {
          console.error('No data returned from API or data is empty');
          this.isLoading = false;
          return;
        }

        const seriesData = this.formatData(data);
        this.updateChart(seriesData);
        this.isLoading = false;
      },
      error => {
        console.error('Error fetching data from API:', error);
        this.isLoading = false;
      }
    );
  }

  formatData(data: any): Highcharts.SeriesOptionsType[] {
    if (!data || data.length === 0) return []; // Check if the array is empty

    const seriesData: Highcharts.SeriesOptionsType[] = [];
    const variableList = this.selectedVariable.split(',');

    variableList.forEach((variable, index) => {
      const variableData = data
        .filter((item: any) => item.variable === variable) // Filter for the selected variable
        .map((item: any) => ({
          timestamp: new Date(item.timestamp).getTime(), // Convert timestamp to milliseconds
          value: variable === 'Tair_1_Avg' && this.selectedUnit === 'standard' 
            ? (parseFloat(item.value) * 9/5) + 32 // Convert to Fahrenheit
            : variable === 'RF_1_Tot300s' && this.selectedUnit === 'standard' 
              ? parseFloat(item.value) / 25.4 // Convert to inches
              : variable === 'SM_1_Avg' 
                ? parseFloat(item.value) * 100 // Convert Soil Moisture to percentage
                : parseFloat(item.value) // Convert value from string to number for others
        }));

      let aggregatedData = variableData;

      if (this.selectedDuration === '7d' || this.selectedDuration === '30d') {
        aggregatedData = this.aggregateToHourly(variableData, variable);
      }

      if (this.selectedDuration === '24h') {
        aggregatedData = variableData.map((item: { timestamp: number; value: number }) => [item.timestamp, item.value]);
      }

      seriesData.push({
        type: variable === 'RF_1_Tot300s' ? 'column' : 'line',
        name: this.variables.find(v => v.value === variable)?.label || variable,
        data: aggregatedData,
        yAxis: index
      });
    });

    return seriesData;
  }




  aggregateToHourly(data: { timestamp: number, value: number }[], variable: string): [number, number][] {
    const hourlyMap: Record<string, number[]> = {};

    data.forEach(item => {
      const date = new Date(item.timestamp);
      date.setMinutes(0, 0, 0); 
      const hourKey = date.getTime();

      if (!hourlyMap[hourKey]) {
        hourlyMap[hourKey] = [];
      }
      hourlyMap[hourKey].push(item.value);
    });

    const aggregatedData: [number, number][] = Object.entries(hourlyMap).map(([hour, values]) => {
      const timestamp = parseInt(hour, 10);
      const aggregateValue = variable === 'RF_1_Tot300s'
        ? values.reduce((acc, val) => acc + val, 0) // Sum for rainfall
        : values.reduce((acc, val) => acc + val, 0) / values.length; // Mean for other variables
      return [timestamp, parseFloat(aggregateValue.toFixed(2))];
    });

    aggregatedData.sort((a, b) => a[0] - b[0]);

    return aggregatedData;
  }




  initializeChart(): void {
    if (!this.chart) {
      this.chart = Highcharts.chart('graphContainer', {
        chart: {
          type: 'line',
          height: '45%',
          zooming: {
            type: 'x'
          }
        },
        title: {
          text: ''
        },
        xAxis: {
          type: 'datetime'
        },
        yAxis: [{
          title: {
            text: 'Primary Axis'
          }
        }, {
          title: {
            text: 'Secondary Axis'
          },
          opposite: true
        }],
        tooltip: {
          shared: true,
          valueDecimals: 2,
          xDateFormat: '%b %e, %Y %l:%M%p'
        },
        time: {
          timezoneOffset: 600, 
        },
        plotOptions: {
          column: {
            pointWidth: 5,
          },
          series: {
            lineWidth: 3,
            marker: { enabled: false }
          }
        },
        series: [] 
      });
    }
  }

  private getRainfallMax(seriesData: Highcharts.SeriesOptionsType[]): number | undefined {
    // Find the Rainfall series
    const rainfallSeries = seriesData.find(series => 
      series.name === 'Rainfall' && 'data' in series && Array.isArray((series as Highcharts.SeriesColumnOptions).data)
    ) as Highcharts.SeriesColumnOptions;

    // Check if rainfallSeries and its data array exist
    if (rainfallSeries && rainfallSeries.data) {
      // Handle possible Highcharts data formats [x, y] or { x, y } or y
      const maxValue = Math.max(
        ...rainfallSeries.data.map((point: any) => {
          if (Array.isArray(point)) {
            // Format [x, y]
            return point[1];
          } else if (typeof point === 'object' && 'y' in point) {
            // Format { x, y }
            return point.y;
          } else {
            // Format [y]
            return point;
          }
        })
      );
      // If the max value is greater than 0.6, let Highcharts automatically set the max
      return maxValue > 0.6 ? undefined : 0.6;
    }

    // Default to 0.6 if no rainfall series exists
    return 0.6; 
  }

  updateChart(seriesData: Highcharts.SeriesOptionsType[]): void {
    if (this.chart) {
      while (this.chart.series.length) {
        this.chart.series[0].remove(false);
      }

      const variableList = this.selectedVariable.split(',');

      if (variableList.length > 1) {
        const yAxisTitles = variableList.map(variable => {
          const originalTitle = this.variables.find(v => v.value === variable)?.yAxisTitle || 'Value';
          if (variable === 'Tair_1_Avg' && this.selectedUnit === 'standard') {
            return originalTitle.replace('°C', '°F');
          } else if (variable === 'RF_1_Tot300s' && this.selectedUnit === 'standard') {
            return originalTitle.replace('mm', 'in');
          }
          return originalTitle;
        });

        this.chart?.update({
          yAxis: [{
            title: { text: yAxisTitles[0] || 'Value' },
            max: variableList[0] === 'RF_1_Tot300s' ? this.getRainfallMax(seriesData) : undefined
          }, {
            title: { text: yAxisTitles[1] || 'Value' },
            opposite: true
          }]
        });

      } else {
        const variable = this.selectedVariable;
        let yAxisTitle = this.variables.find(v => v.value === variable)?.yAxisTitle || 'Value';
        if (variable === 'Tair_1_Avg' && this.selectedUnit === 'standard') {
          yAxisTitle = yAxisTitle.replace('°C', '°F');
        } else if (variable === 'RF_1_Tot300s' && this.selectedUnit === 'standard') {
          yAxisTitle = yAxisTitle.replace('mm', 'in');
        }

        this.chart?.update({
          yAxis: [{
            title: { text: yAxisTitle },
            max: variable === 'RF_1_Tot300s' ? this.getRainfallMax(seriesData) : undefined
          }, {
            title: { text: '' },
            opposite: true
          }]
        });
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
