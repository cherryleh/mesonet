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

import { UnitService } from '../services/unit.service'; 
import { Subscription } from 'rxjs';

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
  isCollapsed = false;
  chart: Highcharts.Chart | null = null;
  isLoading = false;

  selectedUnit: string = 'metric'; 
  private unitSubscription!: Subscription;

  variables = [
    { label: 'Air Temperature, Sensor 1', value: 'Tair_1_Avg', yAxisTitle: 'Temperature Sensor 1 (°C)' },
    { label: 'Air Temperature, Sensor 2', value: 'Tair_2_Avg', yAxisTitle: 'Temperature Sensor 2 (°C)' },
    { label: 'Rainfall', value: 'RF_1_Tot300s', yAxisTitle: 'Rainfall (mm)' },
    { label: 'Soil Moisture, Sensor 1', value: 'SM_1_Avg', yAxisTitle: 'Soil Moisture Sensor 1 (%)' },
    { label: 'Soil Moisture, Sensor 2', value: 'SM_2_Avg', yAxisTitle: 'Soil Moisture Sensor 2 (%)' },
    { label: 'Soil Moisture, Sensor 3', value: 'SM_3_Avg', yAxisTitle: 'Soil Moisture Sensor 3 (%)' },
    { label: 'Relative Humidity, Sensor 1', value: 'RH_1_Avg', yAxisTitle: 'Relative Humidity Sensor 1 (%)' },
    { label: 'Relative Humidity, Sensor 2', value: 'RH_2_Avg', yAxisTitle: 'Relative Humidity Sensor 2 (%)' },
    { label: 'Incoming Shortwave Radiation', value: 'SWin_1_Avg', yAxisTitle: 'Incoming Shortwave Radiation (W/m²)' },
    { label: 'Outgoing Shortwave Radiation', value: 'SWout_1_Avg', yAxisTitle: 'Outgoing Shortwave Radiation (W/m²)' },
    { label: 'Incoming Longwave Radiation', value: 'LWin_1_Avg', yAxisTitle: 'Incoming Longwave Radiation (W/m²)' },
    { label: 'Outgoing Longwave Radiation', value: 'LWout_1_Avg', yAxisTitle: 'Outgoing Longwave Radiation (W/m²)' },
    { label: 'Net Shortwave Radiation', value: 'SWnet_1_Avg', yAxisTitle: 'Net Shortwave Radiation (W/m²)' },
    { label: 'Net Longwave Radiation', value: 'LWnet_1_Avg', yAxisTitle: 'Net Longwave Radiation (W/m²)' },
    { label: 'Net Radiation', value: 'Rnet_1_Avg', yAxisTitle: 'Net Radiation (W/m²)' },
    { label: 'Albedo', value: 'Albedo_1_Avg', yAxisTitle: 'Albedo' },
    { label: 'Surface Temperature', value: 'Tsrf_1_Avg', yAxisTitle: 'Surface Temperature (°C)' },
    { label: 'Sky Temperature', value: 'Tsky_1_Avg', yAxisTitle: 'Sky Temperature (°C)' },
    { label: 'Vapor Pressure, Sensor 1', value: 'VP_1_Avg', yAxisTitle: 'Vapor Pressure Sensor 1 (kPa)' },
    { label: 'Vapor Pressure, Sensor 2', value: 'VP_2_Avg', yAxisTitle: 'Vapor Pressure Sensor 2 (kPa)' },
    { label: 'Vapor pressure deficit, Sensor 1', value: 'VPD_1_Avg', yAxisTitle: 'Vapor Pressure Deficit Sensor 1 (kPa)' },
    { label: 'Vapor pressure deficit, Sensor 2', value: 'VPD_2_Avg', yAxisTitle: 'Vapor Pressure Deficit Sensor 2 (kPa)' },
    { label: 'Wind Speed', value: 'WS_1_Avg', yAxisTitle: 'Wind Speed (m/s)' },
    { label: 'Wind Direction', value: 'WDrs_1_Avg', yAxisTitle: 'Wind Direction (°)' },
    { label: 'Pressure', value: 'P_1', yAxisTitle: 'Pressure (kPa)' },
    { label: 'Sea level pressure', value: 'Psl_1', yAxisTitle: 'Pressure (kPa)' },
    { label: 'Soil Temperature, Sensor 1', value: 'Tsoil_1_Avg', yAxisTitle: 'Soil Temperature Sensor 1 (°C)' },
    { label: 'Soil Temperature, Sensor 2', value: 'Tsoil_2', yAxisTitle: 'Soil Temperature Sensor 2 (°C)' },
    { label: 'Soil Temperature, Sensor 3', value: 'Tsoil_3', yAxisTitle: 'Soil Temperature Sensor 3 (°C)' },
    { label: 'Soil Temperature, Sensor 4', value: 'Tsoil_4', yAxisTitle: 'Soil Temperature Sensor 4 (°C)' },
    { label: 'Surface soil heat flux', value: 'SHFsrf_1_Avg', yAxisTitle: 'Surface Soil Heat Flux (W/m²)' },
    { label: 'Maximum Rainfall Intensity', value: 'RFint_1_Max', yAxisTitle: 'Maximum Rainfall Intensity (mm/hr)' },
  ];

  durations = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 60 Days', value: '60d' },
    { label: 'Last 90 Days', value: '90d' }
  ];

  constructor(
    private route: ActivatedRoute,
    private graphingDataService: GraphingDataService,
    private graphingMenuService: GraphingMenuService,
    private unitService: UnitService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id';
      console.log(`Initializing graph for station ID: ${this.stationId}`); 
      this.loadData();
    });

    this.unitSubscription = this.unitService.getUnit().subscribe(unit => {
      this.selectedUnit = unit; // Update dropdown selection when unit changes
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
      return;
    }
    this.selectedVariables = event.value;
  }

  isOptionDisabled(variable: string): boolean {
    return this.selectedVariables.length >= 3 && !this.selectedVariables.includes(variable);
  }

  onDurationChange(event: MatSelectChange): void {
    this.selectedDuration = event.value; 
    this.graphingMenuService.setDuration(this.selectedDuration);

    if (this.chart) {
      this.chart.xAxis[0].update({
        tickInterval: this.getTickInterval(),
      });
    }
  }


  onUnitChange(event: any): void {
    const newUnit = event.value;
    this.unitService.setUnit(newUnit); // Update the unit in the service
  }

  ngOnDestroy(): void {
    if (this.unitSubscription) {
      this.unitSubscription.unsubscribe();
    }
  }

  updateChartButtonClick(): void {
    this.loadData();
  }

  initializeChart(): void {
    if (!this.chart) {
      this.chart = Highcharts.chart('graphContainer', {
        chart: { type: 'line', zooming: { type: 'x' } },
        title: { text: '' },
        xAxis: {
          type: 'datetime',
          labels: {
            format: '{value:%b %e, %l:%M %p}', // "Feb 9, 2:30 PM"
          },
          tickInterval: this.getTickInterval(), 
        },
        yAxis: [
          { title: { text: '' } }, 
          { title: { text: '' }, opposite: true }, 
          { title: { text: '' }, opposite: true }  
        ],
        tooltip: { shared: true, valueDecimals: 2, xDateFormat: '%b %e, %Y %l:%M %p' },
        time: { timezoneOffset: 600 },
        plotOptions: { column: { pointWidth: 5 }, series: { lineWidth: 3, marker: { enabled: false } } },
        series: []
      });
    }
  }

  getTickInterval(): number {
    if (this.selectedDuration === '90d') {
      return 7 * 24 * 3600 * 1000; // 7 days in milliseconds
    } else if (this.selectedDuration === '60d') {
      return 5 * 24 * 3600 * 1000; // 5 days in milliseconds
    } else if (this.selectedDuration === '30d') {
      return 1 * 24 * 3600 * 1000; // 1 day
    } else {
      return 6 * 3600 * 1000; // 6 hours
    }
  }

  getDaysFromDuration(duration: string): number {
    return duration === '24h' ? 1 : duration === '7d' ? 7 : duration === '30d' ? 30 : duration === '60d' ? 60 : duration === '90d' ? 90 : 0;
  }

  getDateMinusDays(days: number): string {
    const now = new Date();

    const dateMinusDays = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const year = dateMinusDays.getFullYear();
    const month = String(dateMinusDays.getMonth() + 1).padStart(2, '0');
    const day = String(dateMinusDays.getDate()).padStart(2, '0');
    const hour = String(dateMinusDays.getHours()).padStart(2, '0');
    const minute = String(dateMinusDays.getMinutes()).padStart(2, '0');
    const second = String(dateMinusDays.getSeconds()).padStart(2, '0');

    const result = `${year}-${month}-${day}T${hour}:${minute}:${second}-10:00`;
    return result;
  }




  loadData(): void {
    if (!this.stationId) {
      console.error('No station ID available. Cannot fetch data.'); 
      return;
    }

    this.isLoading = true;
    const days = this.getDaysFromDuration(this.selectedDuration);
    const startDate = this.getDateMinusDays(days);

    this.graphingDataService.getData(this.stationId, this.selectedVariables.join(','), startDate,this.selectedDuration).subscribe(
      data => {
        this.isLoading = false;

        if (!data || data.length === 0) {
          console.warn('No data received from API. Clearing chart.');
          if (this.chart) {
            while (this.chart.series.length) {
              this.chart.series[0].remove(false);
            }
            this.chart.redraw();
          }
          return;
        }

        let timezoneOffset = this.stationId.startsWith('1') ? 660 : 600;
        this.chart?.update({ time: { timezoneOffset } });

        console.log(`Applying Timezone Offset: ${timezoneOffset} minutes`);

        this.updateChart(this.formatData(data));
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false;
        if (this.chart) {
          while (this.chart.series.length) {
            this.chart.series[0].remove(false);
          }
          this.chart.redraw();
        }
      }
    );

  }


  updateChart(seriesData: Highcharts.SeriesOptionsType[]): void {
    if (this.chart) {
      while (this.chart.series.length) {
        this.chart.series[0].remove(false);
      }

      const yAxisLabels = this.selectedVariables.map(variable => this.getYAxisLabel(variable));

      if (this.chart.yAxis[0]) {
        this.chart.yAxis[0].setTitle({ text: yAxisLabels[0] || 'Primary Axis' });
      }
      if (this.chart.yAxis[1]) {
        this.chart.yAxis[1].setTitle({ text: this.selectedVariables.length > 1 ? yAxisLabels[1] : '' });
      }
      if (this.chart.yAxis[2]) {
        this.chart.yAxis[2].setTitle({ text: this.selectedVariables.length > 2 ? yAxisLabels[2] : '' });
      }

      seriesData.forEach(series => this.chart?.addSeries(series, false));
      this.chart?.redraw();
    }
  }

  formatData(data: any): Highcharts.SeriesOptionsType[] {
    if (!data || data.length === 0) return [];
    let nonRainfallIndex = 0;

    return this.selectedVariables.map((variable, index) => {
      const variableData: [number, number | null][] = [];
      const filteredData = data
        .filter((item: any) => item.variable === variable)
        .map((item: any): [number, number | null] => {
          const timestamp = new Date(item.timestamp).getTime();
          let value: number | null = parseFloat(item?.value || '');

          if (item?.flag !== 0 || isNaN(value)) {
            value = null;
          } else {
            value = this.convertValue(variable, value); 
          }

          return [timestamp, value];
        })
        .sort((a: [number, number | null], b: [number, number | null]) => a[0] - b[0]);

      for (let i = 0; i < filteredData.length - 1; i++) {
        const [currentTime, currentValue] = filteredData[i];
        const [nextTime] = filteredData[i + 1];
        variableData.push([currentTime, currentValue]);

        if (nextTime - currentTime > 5 * 60 * 1000) {
          variableData.push([currentTime + 1, null]);
        }
      }

      if (filteredData.length > 0) {
        variableData.push(filteredData[filteredData.length - 1]);
      }

      let assignedColor = variable === 'RF_1_Tot300s' ? '#3498DB' : this.getSelectionColor(nonRainfallIndex++);

      return {
        type: variable === 'RF_1_Tot300s' ? 'column' : 'line',
        name: this.getYAxisLabel(variable),
        data: variableData,
        yAxis: index,
        zIndex: variable === 'RF_1_Tot300s' ? 0 : 1,
        color: assignedColor,
        connectNulls: false,
      };
    });
  }


  getSelectionColor(nonRainfallIndex: number): string {
    const colorOrder = ['#27AE60', '#F1C40F', '#f55e53']; 
    return colorOrder[nonRainfallIndex] || '#000000'; 
  }

  convertValue(variable: string, value: number): number {
    if (variable === 'SM_1_Avg'|| variable === 'SM_2_Avg' || variable === 'SM_3_Avg') {
      return value * 100; // Convert soil moisture to 0-100 scale
    }

    if (this.selectedUnit === 'standard') {
      if (['Tair_1_Avg', 'Tsrf_1_Avg', 'Tsky_1_Avg', 'Tair_2_Avg', 'Tsoil_1_Avg', 'Tsoil_2', 'Tsoil_3', 'Tsoil_4'].includes(variable)) {
        return (value * 9/5) + 32; // Convert °C to °F
      } else if (variable === 'RF_1_Tot300s') {
        return value / 25.4; // Convert mm to inches
      } else if (variable === 'WS_1_Avg') {
        return value * 2.23694; // Convert m/s to mph
      }
    }

    return value;
  }


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
