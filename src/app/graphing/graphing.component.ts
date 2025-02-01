import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { GraphingDataService } from '../services/graphing-data.service';
import { GraphingMenuService } from '../services/graphing-menu.service';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-graphing',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent, MatSelectModule,MatFormFieldModule, FormsModule],
  templateUrl: './graphing.component.html',
  styleUrl: './graphing.component.css'
})
export class GraphingComponent implements OnInit, AfterViewInit {
  stationId = '';
  selectedVariables: string[] = ['Tair_1_Avg'];
  selectedDuration = '24h';
  selectedUnit: 'metric' | 'standard' = 'metric';
  isCollapsed = false;
  chart: Highcharts.Chart | null = null;
  isLoading = false;

  variables = [
    { label: 'Temperature', value: 'Tair_1_Avg', yAxisTitle: 'Temperature (°C)' },
    { label: 'Rainfall', value: 'RF_1_Tot300s', yAxisTitle: 'Rainfall (mm)' },
    { label: 'Soil Moisture', value: 'SM_1_Avg', yAxisTitle: 'Soil Moisture (%)' },
    { label: 'Relative Humidity', value: 'RH_1_Avg', yAxisTitle: 'Relative Humidity (%)' }
  ];

  durations = [
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
      this.stationId = params['id'] || 'default_station_id';
      this.loadData();
    });
  }

  ngAfterViewInit(): void {
    this.initializeChart();
  }

  onToggleSidebar(collapsed: boolean): void {
    this.isCollapsed = collapsed;
  }

  onVariableChange(event: MatSelectChange): void {
    if (event.value.length > 3) {
      return; // Prevents selecting more than 3 variables
    }
    this.selectedVariables = event.value;
  }

  /** Helper method to disable options when 3 are selected */
  isOptionDisabled(variable: string): boolean {
    return this.selectedVariables.length >= 3 && !this.selectedVariables.includes(variable);
  }

  onDurationChange(event: MatSelectChange): void {
    this.selectedDuration = event.value; // ✅ Use event.value directly
    this.graphingMenuService.setDuration(this.selectedDuration);
  }

  onUnitChange(event: MatSelectChange): void {
    this.selectedUnit = event.value as 'metric' | 'standard'; // ✅ Use event.value directly
  }

  updateChartButtonClick(): void {
    this.loadData();
  }

  initializeChart(): void {
    if (!this.chart) {
      this.chart = Highcharts.chart('graphContainer', {
        chart: { type: 'line', height: '45%', zooming: { type: 'x' } },
        title: { text: '' },
        xAxis: { type: 'datetime' },
        yAxis: [
          { title: { text: 'Primary Axis' } }, // Left y-axis
          { title: { text: 'Secondary Axis' }, opposite: true } // Right y-axis
        ],
        tooltip: { shared: true, valueDecimals: 2, xDateFormat: '%b %e, %Y %l:%M%p' },
        time: { timezoneOffset: 600 },
        plotOptions: { column: { pointWidth: 5 }, series: { lineWidth: 3, marker: { enabled: false } } },
        series: []
      });
    }
  }


  getDaysFromDuration(duration: string): number {
    return duration === '24h' ? 1 : duration === '7d' ? 7 : duration === '30d' ? 30 : 0;
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
  loadData(): void {
    this.isLoading = true;
    const days = this.getDaysFromDuration(this.selectedDuration);
    const startDate = this.getDateMinusDaysInHST(days);

    this.graphingDataService.getData(this.stationId, this.selectedVariables.join(','), startDate).subscribe(
      data => {
        this.isLoading = false;
        if (!data || data.length === 0) return;
        this.updateChart(this.formatData(data));
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false;
      }
    );
  }

  updateChart(seriesData: Highcharts.SeriesOptionsType[]): void {
    if (this.chart) {
      while (this.chart.series.length) {
        this.chart.series[0].remove(false);
      }

      // Get selected variables' y-axis labels
      const yAxisLabels = this.selectedVariables.map(variable => this.getYAxisLabel(variable));

      // Update the first y-axis title
      if (this.chart.yAxis[0]) {
        this.chart.yAxis[0].setTitle({ text: yAxisLabels[0] || 'Primary Axis' });
      }

      // Update the second y-axis title (or clear it if only one variable)
      if (this.chart.yAxis[1]) {
        if (this.selectedVariables.length > 1) {
          this.chart.yAxis[1].setTitle({ text: yAxisLabels[1] || yAxisLabels[2] || 'Secondary Axis' });
        } else {
          this.chart.yAxis[1].setTitle({ text: '' }); // ✅ Clear the title if only 1 variable
        }
      }

      // Add new series data
      seriesData.forEach(series => this.chart?.addSeries(series, false));
      this.chart?.redraw();
    }
  }




  formatData(data: any): Highcharts.SeriesOptionsType[] {
    if (!data || data.length === 0) return [];

    return this.selectedVariables.map((variable, index) => {
      const variableData = data
        .filter((item: any) => item.variable === variable)
        .map((item: any) => [
          new Date(item.timestamp).getTime(),
          this.convertValue(variable, parseFloat(item.value))
        ]);

      return {
        type: variable === 'RF_1_Tot300s' ? 'column' : 'line',
        name: this.getYAxisLabel(variable), // ✅ Update label dynamically
        data: variableData,
        yAxis: this.selectedVariables.length === 3
          ? index === 0 ? 0 : 1
          : this.selectedVariables.length === 2
            ? index === 1 ? 1 : 0
            : 0
      };
    });
  }

  /** Helper function to handle unit conversions */
  convertValue(variable: string, value: number): number {
    if (this.selectedUnit === 'standard') {
      if (variable === 'Tair_1_Avg') {
        return (value * 9/5) + 32; // Convert °C to °F
      } else if (variable === 'RF_1_Tot300s') {
        return value / 25.4; // Convert mm to inches
      }
    }
    return value;
  }

  /** Helper function to update y-axis labels dynamically */
  getYAxisLabel(variable: string): string {
    if (variable === 'Tair_1_Avg') {
      return this.selectedUnit === 'standard' ? 'Temperature (°F)' : 'Temperature (°C)';
    } else if (variable === 'RF_1_Tot300s') {
      return this.selectedUnit === 'standard' ? 'Rainfall (inches)' : 'Rainfall (mm)';
    } else {
      return this.variables.find(v => v.value === variable)?.yAxisTitle || variable;
    }
  }


  
}
