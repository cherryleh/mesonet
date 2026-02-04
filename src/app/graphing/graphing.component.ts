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
import { MatDatepickerModule, MatDateRangeInput, MatDateRangePicker, MatDatepickerToggle, MatDatepickerInput } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { UnitService } from '../services/unit.service'; 
import { Subscription } from 'rxjs';
import { StationDatesService } from '../services/station-dates.service';
import { SidebarService } from '../services/sidebar.service';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { BannerService } from '../services/banner.service';
import { BannerComponent } from '../banner/banner.component';

@Component({
  selector: 'app-graphing',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent, MatSelectModule,MatFormFieldModule, FormsModule,MatDateRangeInput, MatDateRangePicker,MatDatepickerToggle, MatDatepickerModule, MatNativeDateModule, MatInputModule,MatDatepickerInput,BannerComponent],
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
  bannerMessage: string | null = null;
  selectedUnit: string = 'metric'; 
  private unitSubscription!: Subscription;

  variables = [
    { label: 'Air Temperature, Sensor 1', value: 'Tair_1_Avg', yAxisTitle: 'Temperature Sensor 1 (°C)' },
    { label: 'Air Temperature, Sensor 2', value: 'Tair_2_Avg', yAxisTitle: 'Temperature Sensor 2 (°C)' },
    { label: 'Rainfall, 5-minute total', value: 'RF_1_Tot300s', yAxisTitle: 'Rainfall (mm)' },
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
    { label: 'Pressure', value: 'P_1_Avg', yAxisTitle: 'Pressure (kPa)' },
    { label: 'Sea level pressure', value: 'Psl_1_Avg', yAxisTitle: 'Sea Level Pressure (kPa)' },
    { label: 'Soil Temperature, Sensor 1', value: 'Tsoil_1_Avg', yAxisTitle: 'Soil Temperature Sensor 1 (°C)' },
    { label: 'Soil Temperature, Sensor 2', value: 'Tsoil_2_Avg', yAxisTitle: 'Soil Temperature Sensor 2 (°C)' },
    { label: 'Soil Temperature, Sensor 3', value: 'Tsoil_3_Avg', yAxisTitle: 'Soil Temperature Sensor 3 (°C)' },
    { label: 'Soil Temperature, Sensor 4', value: 'Tsoil_4_Avg', yAxisTitle: 'Soil Temperature Sensor 4 (°C)' },
    { label: 'Surface soil heat flux', value: 'SHFsrf_1_Avg', yAxisTitle: 'Surface Soil Heat Flux (W/m²)' },
    { label: 'Maximum Rainfall Intensity', value: 'RFint_1_Max', yAxisTitle: 'Maximum Rainfall Intensity (mm/hr)' },
    { label: 'Water temperature', value: 'Twt_1_Avg', yAxisTitle: 'Water Temperature (°C)'},
    { label: 'Water level', value:'Wlvl_1_Avg', yAxisTitle: 'Water level (m)'}
  ];

  durations = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 60 Days', value: '60d' },
    { label: 'Last 90 Days', value: '90d' }
  ];

  private sidebarSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private graphingDataService: GraphingDataService,
    private graphingMenuService: GraphingMenuService,
    private unitService: UnitService,
    private stationDatesService: StationDatesService,
    private sidebarService: SidebarService,
    private bannerService: BannerService,
    private http: HttpClient
  ) {}

  minAvailableDate: Date = new Date();
  maxAvailableDate: Date = new Date();

  stationVariablesMap: { [stationId: string]: string[] } = {};

  ngOnInit(): void {
    // this.bannerService.banner$.subscribe(msg => {
    //   this.bannerMessage = msg;
    // });
    // this.bannerService.set(this.bannerService.messages.maintenance);
    this.bannerService.set(null);
    this.unitSubscription = this.unitService.getUnit().subscribe(unit => {
      this.selectedUnit = unit;
    });

    this.sidebarSubscription = this.sidebarService.isCollapsed$.subscribe((value: boolean) => {
      this.isCollapsed = value;
      setTimeout(() => {
        this.chart?.reflow();
        setTimeout(() => {
          this.chart?.reflow();
        }, 250); 
      }, 0);
    });


    this.http.get('station_variables.csv', { responseType: 'text' })
      .pipe(map(csv => this.parseCsvToMap(csv)))
      .subscribe(map => {
        this.stationVariablesMap = map;

        this.route.queryParams.subscribe(params => {
          this.stationId = params['id'] || 'default_station_id';
          const shortId = this.stationId.substring(0, 4);

          const fallbackVarList = `SWin_1_Avg;SWout_1_Avg;LWin_1_Avg;LWout_1_Avg;SWnet_1_Avg;LWnet_1_Avg;Rnet_1_Avg;Albedo_1_Avg;Tsrf_1_Avg;Tsky_1_Avg;Tair_1_Avg;Tair_2_Avg;RH_1_Avg;RH_2_Avg;VP_1_Avg;VP_2_Avg;VPsat_1_Avg;VPsat_2_Avg;VPD_1_Avg;VPD_2_Avg;WS_1_Avg;WDrs_1_Avg;P_1_Avg;Psl_1_Avg;Tsoil_1_Avg;SHFsrf_1_Avg;SM_1_Avg;SM_2_Avg;SM_3_Avg;Tsoil_2_Avg;Tsoil_3_Avg;Tsoil_4_Avg;RF_1_Tot300s;RFint_1_Max`.split(';');
          const allowedVariables = this.stationVariablesMap[shortId] ?? fallbackVarList;

          this.filteredVariables = this.variables.filter(v => allowedVariables.includes(v.value));
          const isStreamStation = shortId.startsWith('14');

          this.selectedVariables = isStreamStation
            ? ['Twt_1_Avg', 'Wlvl_1_Avg', 'RF_1_Tot300s'].filter(v => allowedVariables.includes(v))
            : (this.filteredVariables.length > 0 ? [this.filteredVariables[0].value] : []);

          
          this.fetchStationDateRange(this.stationId); 
          this.loadData();  
        });
      });
  }



  
  filteredVariables: typeof this.variables = [];

  parseCsvToMap(csv: string): { [stationId: string]: string[] } {
    const lines = csv.trim().split('\n');
    const map: { [stationId: string]: string[] } = {};

    for (let i = 1; i < lines.length; i++) {
      const [station, variableString] = lines[i].split(',', 2);
      const variables = variableString.split(';').map(v => v.trim());
      map[station.trim()] = variables;
    }

    return map;
  }


  fetchStationDateRange(id: string): void {
    this.stationDatesService.getData(id).subscribe({
      next: (response: { minDate: Date | null; maxDate: Date | null }) => {
        if (response.minDate) {
          this.minAvailableDate = new Date(
            response.minDate.getFullYear(),
            response.minDate.getMonth(),
            response.minDate.getDate()
          );
        }

        if (response.maxDate) {
          this.maxAvailableDate = new Date(
            response.maxDate.getFullYear(),
            response.maxDate.getMonth(),
            response.maxDate.getDate()
          );
        }
      },
      error: (error: any) => {
        console.error('Error fetching station date range:', error);
      }
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
    switch (this.selectedDuration) {
      case '90d':
        return 7 * 24 * 3600 * 1000; // every 7 days
      case '60d':
        return 5 * 24 * 3600 * 1000; // every 5 days
      case '30d':
        return 1 * 24 * 3600 * 1000; // every day
      case '7d':
        return 12 * 3600 * 1000; // every 12 hours
      case '24h':
        return 6 * 3600 * 1000; // every 2 hours
      default:
        return 6 * 3600 * 1000; // fallback
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

    let startDate: string;
    let endDate: string;

    if (this.isCustomRange && this.dateRange.start && this.dateRange.end) {
      startDate = this.convertToApiTimestamp(this.dateRange.start);
      endDate = this.convertToApiTimestamp(this.dateRange.end, true);
    } else {
      const days = this.getDaysFromDuration(this.selectedDuration);
      startDate = this.getDateMinusDays(days);
      endDate = this.convertToApiTimestamp(new Date());
    }

    this.graphingDataService.getData(
      this.stationId,
      this.selectedVariables.join(','),
      startDate,
      this.selectedDuration,
      endDate
    ).subscribe(
      data => {
        this.isLoading = false;
        if (!data || data.length === 0) return;

        const timezoneOffset = this.stationId.startsWith('1') ? 660 : 600;
        this.chart?.update({ time: { timezoneOffset } });

        this.updateChart(this.formatData(data));
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false;
      }
    );
  }



  maxEndDate: Date = new Date();
  maxStartDate: Date = new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  onStartDateChange(): void {
    if (this.dateRange.start && this.dateRange.end) {
      const diff = (this.dateRange.end.getTime() - this.dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
      if (diff > 90) {
        this.dateRange.end = null; // Clear invalid end date
      }
    }
  }

  get dateRangeTooLong(): boolean {
    if (this.dateRange.start && this.dateRange.end) {
      const diffInMs = this.dateRange.end.getTime() - this.dateRange.start.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      return diffInDays > 90;
    }
    return false;
  }

  
  getMaxEndDate(): Date | null {
    if (!this.dateRange.start) return null;

    const max = new Date(this.dateRange.start);
    max.setDate(max.getDate() + 90); // add 90 days
    return max;
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    return date >= this.minAvailableDate && date <= this.maxAvailableDate;
  };


  convertToApiTimestamp(date: Date, forceEndOfDay: boolean = false): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let hour = '00';
    let minute = '00';
    let second = '00';

    if (forceEndOfDay) {
      hour = '23';
      minute = '59';
      second = '00';
    } else {
      hour = String(date.getHours()).padStart(2, '0');
      minute = String(date.getMinutes()).padStart(2, '0');
      second = String(date.getSeconds()).padStart(2, '0');
    }

    return `${year}-${month}-${day}T${hour}:${minute}:${second}-10:00`;
  }


  updateChart(seriesData: Highcharts.SeriesOptionsType[]): void {
    if (!this.chart) return;

    while (this.chart.series.length) {
      this.chart.series[0].remove(false);
    }

    const yAxisLabels = this.selectedVariables.map(variable => this.getYAxisLabel(variable));

    const sharedScaleGroups = [
      ['Tair_1_Avg', 'Tair_2_Avg'],
      ['Tsrf_1_Avg','Tsky_1_Avg','Tair_1_Avg','Tair_2_Avg'],
      ['SM_1_Avg', 'SM_2_Avg', 'SM_3_Avg'],
      ['VP_1_Avg', 'VP_2_Avg'],
      ['VPsat_1_Avg', 'VPsat_2_Avg'],
      ['VPD_1_Avg', 'VPD_2_Avg'],
      ['RH_1_Avg', 'RH_2_Avg'],
      ['Tsoil_1_Avg', 'Tsoil_2_Avg', 'Tsoil_3_Avg', 'Tsoil_4_Avg'],
      [
        'SWin_1_Avg', 'SWout_1_Avg', 'LWin_1_Avg', 'LWout_1_Avg',
        'SWnet_1_Avg', 'LWnet_1_Avg', 'Rnet_1_Avg', 'SHFsrf_1_Avg'
      ]
    ];

    const extremes: { [key: string]: { min: number; max: number } } = {};

    // Compute min/max for each group if all variables in it are selected
    for (const group of sharedScaleGroups) {
      const selectedInGroup = group.filter(v => this.selectedVariables.includes(v));
      if (selectedInGroup.length >= 2) {
        const allValues: number[] = [];
        for (const series of seriesData) {
          const varName = (series as any).custom?.variable;
          if (selectedInGroup.includes(varName)) {
            const values = ((series as any).data || [])
              .map((point: any) => point[1])
              .filter((val: any) => val !== null && !isNaN(val));
            allValues.push(...values);
          }
        }

        const min = Math.min(...allValues);
        const max = Math.max(...allValues);

        selectedInGroup.forEach(v => (extremes[v] = { min, max }));

      }
    }

    // Update or hide y-axes
    for (let i = 0; i < this.chart.yAxis.length; i++) {
      const axis = this.chart.yAxis[i];
      if (i < this.selectedVariables.length) {
        const variable = this.selectedVariables[i];
        const label = this.getYAxisLabel(variable);

        axis.setTitle({ text: label });
        axis.update({
          visible: true,
          min: extremes[variable]?.min,
          max: extremes[variable]?.max,
        }, false);
      } else {
        axis.update({ visible: false }, false); // hide unused axis
      }
    }




    // Add series back
    seriesData.forEach(series => this.chart?.addSeries(series, false));

    // Apply updated tick interval
    this.chart.update({
      xAxis: { tickInterval: this.getTickInterval() }
    }, false);

    this.chart.redraw();
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
        name: this.getYAxisLabel(variable), // friendly display name
        custom: { variable },               // raw variable name used for logic
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
      if (['Tair_1_Avg', 'Tsrf_1_Avg', 'Tsky_1_Avg', 'Tair_2_Avg', 'Tsoil_1_Avg', 'Tsoil_2_Avg', 'Tsoil_3_Avg', 'Tsoil_4_Avg','Twt_1_Avg'].includes(variable)) {
        return (value * 9/5) + 32; // Convert °C to °F
      } else if (variable === 'RF_1_Tot300s') {
        return value / 25.4; // Convert mm to inches
      } else if (variable === 'Wlvl_1_Avg') {
        return value * 3.28084; // Convert m to ft
      } else if (variable === 'WS_1_Avg') {
        return value * 2.23694; // Convert m/s to mph
      }
    }

    return value;
  }


  getYAxisLabel(variable: string): string {
    const isStandard = this.selectedUnit === 'standard';

    const labelMap: { [key: string]: string } = {
      Tair_1_Avg: `Air Temperature Sensor 1 (${isStandard ? '°F' : '°C'})`,
      Tair_2_Avg: `Air Temperature Sensor 2 (${isStandard ? '°F' : '°C'})`,
      Twt_1_Avg: `Water Temperature (${isStandard ? '°F' : '°C'})`,
      Tsrf_1_Avg: `Surface Temperature (${isStandard ? '°F' : '°C'})`,
      Tsky_1_Avg: `Sky Temperature (${isStandard ? '°F' : '°C'})`,
      Tsoil_1_Avg: `Soil Temperature Sensor 1 (${isStandard ? '°F' : '°C'})`,
      Tsoil_2_Avg:     `Soil Temperature Sensor 2 (${isStandard ? '°F' : '°C'})`,
      Tsoil_3_Avg:     `Soil Temperature Sensor 3 (${isStandard ? '°F' : '°C'})`,
      Tsoil_4_Avg:     `Soil Temperature Sensor 4 (${isStandard ? '°F' : '°C'})`,
      WS_1_Avg: `Wind Speed (${isStandard ? 'mph' : 'm/s'})`,
      RF_1_Tot300s: `Rainfall (${isStandard ? 'in' : 'mm'})`,
      Wlvl_1_Avg: `Water Level (${isStandard ? 'ft' : 'm'})`,
    };

    return labelMap[variable] || this.variables.find(v => v.value === variable)?.yAxisTitle || variable;
  }




  isCustomRange = false;
  dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };

}
