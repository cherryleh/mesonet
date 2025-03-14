import { Component, OnInit, HostListener, ElementRef, ViewChild, Input, Output, EventEmitter, OnDestroy, AfterViewInit, AfterContentChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Highcharts from 'highcharts';

import { DashboardChartService } from '../../services/dashboard-chart.service';
import { DurationService } from '../../services/dashboard-chart-dropdown.service';
import { aggregateService } from '../../services/aggregate.service';

import OfflineExporting from 'highcharts/modules/offline-exporting';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { UnitService } from '../../services/unit.service';
import { Subscription } from 'rxjs';

Exporting(Highcharts);
ExportData(Highcharts);
OfflineExporting(Highcharts);


@Component({
  selector: 'app-dashboard-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-chart.component.html',
  styleUrls: ['./dashboard-chart.component.css'],
  providers: [DashboardChartService],
})

export class DashboardChartComponent implements OnInit, OnDestroy, AfterViewInit {
  previousTemperatureData: [number, number][] = [];
  previousRainfallData: [number, number][] = [];
  previousRadData: [number, number][] = [];

  selectedUnit: string = 'standard';
  private unitSubscription!: Subscription;

  private refreshTimeout: any;
  private destroy$ = new Subject<void>();
  private isDestroyed = false;

  private isDataChanged(
    newData: [number, number][],
    oldData: [number, number][]
  ): boolean {
    if (newData.length !== oldData.length) return true;

    for (let i = 0; i < newData.length; i++) {
      if (newData[i][0] !== oldData[i][0] || newData[i][1] !== oldData[i][1]) {
        return true;
      }
    }
    return false;
  }

  @Input() isCollapsed = false;  // Accept sidebar state

  ngAfterViewInit() {
    setTimeout(() => this.chartRef.reflow(), 500); // Ensure reflow after view initializes
  }

  ngOnChanges() {
    if (this.chartRef) {
      setTimeout(() => this.chartRef.reflow(), 300); // Allow time for animations
    }
  }
  
  @Output() durationChanged = new EventEmitter<string>();

  currentTimeISO!: string;
  refreshIntervalMS = 300000;
  isLoading = true;
  id: string | null = null;
  selectedDuration = '1';

  durations = [
    { label: 'Last 24 Hours', value: '1' },
    { label: 'Last 3 Days', value: '3' },
    { label: 'Last 7 Days', value: '7' },
  ];
  Highcharts = Highcharts;
  chartRef!: Highcharts.Chart;

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      animation: false,
      zooming: {
        type: 'x'
      }
    },
    title: {
      text: ''
    },
    xAxis: {
      type: 'datetime',
      labels: {
        format: '{value:%b %e, %l:%M %p}', // "Feb 9, 2:30 PM"
        step: 1 // Ensures labels are spaced properly
      },
      tickInterval: 6 * 3600 * 1000, // 6 hours in milliseconds
    },
    yAxis: [
      {
        title: { text: 'Temperature (°F)' },
      },
      {
        title: { text: '5-min Rainfall (in)' },
        opposite: true,
        min: 0
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
      timezoneOffset: 600, 
    },
    series: [],
    plotOptions: {
      series: {
        lineWidth: 3,
        marker: { enabled: false },
        animation: false
      }
    },
    legend: {
      align: 'center',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemHiddenStyle: {
        color: 'gray',
        'text-decoration': 'none'
      }
    },
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'separator', 'downloadCSV', 'downloadXLS']
        }
      }
    }
  };


  constructor(
    private route: ActivatedRoute,
    private dataService: DashboardChartService,
    private aggregateService: aggregateService,
    private durationService: DurationService,
    private unitService: UnitService
  ) { }

  async ngOnInit(): Promise<void> {
    try {
        this.route.queryParams.subscribe((params) => {
            this.id = params['id'];
            if (!this.id) {
                console.error('ID not found in query params.');
                this.isLoading = false; // Stop loading
                return;
            }

            console.log(`Initializing chart for ID: ${this.id}`);

            this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
            this.subscribeToDurationChanges();
            this.adjustChartHeight();
          
            this.isLoading = false; // Stop loading spinner

            console.log('Dashboard chart initialized...');
            this.updateData(); // Start data fetch
            this.unitSubscription = this.unitService.selectedUnit$.subscribe(unit => {
              this.selectedUnit = unit;
              this.updateChartUnits();
          });
        });
    } catch (error) {
        console.error('Error during ngOnInit:', error);
        this.isLoading = false;
    }
}

updateChartUnits() {
  console.log(`Updating chart to ${this.selectedUnit} units`);

  if (this.chartRef && this.chartRef.series.length > 0) {
      const convertedDataArray = this.getConvertedData();

      this.chartRef.series.forEach((series, index) => {
          if (convertedDataArray[index]) {
              series.setData(convertedDataArray[index], true);
          }
      });

      // Update Y-Axis labels dynamically
      this.chartRef.yAxis[0].setTitle({ text: this.selectedUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)' });
      this.chartRef.yAxis[1].setTitle({ text: this.selectedUnit === 'metric' ? 'Rainfall (mm)' : 'Rainfall (in)' });

      this.chartRef.redraw();
  }
}




getConvertedData(): [number, number][][] {
  return this.chartRef.series.map((series, index) => {
      let currentData: [number, number][] = series.data.map(point => [point.x as number, point.y as number]);

      if (this.selectedUnit === 'metric') {
          // Convert temperature (F → C) and rainfall (in → mm)
          return currentData.map(([timestamp, value]) => {
              if (index === 0) { // Temperature series (Assuming it's first)
                  return [timestamp, ((value - 32) * 5) / 9]; // Convert °F → °C
              } else if (index === 1) { // Rainfall series (Assuming it's second)
                  return [timestamp, value * 25.4]; // Convert inches → mm
              }
              return [timestamp, value]; // Other series remain unchanged
          });
      } else {
          // Convert temperature (C → F) and rainfall (mm → in)
          return currentData.map(([timestamp, value]) => {
              if (index === 0) { // Temperature series
                  return [timestamp, (value * 9) / 5 + 32]; // Convert °C → °F
              } else if (index === 1) { // Rainfall series
                  return [timestamp, value / 25.4]; // Convert mm → inches
              }
              return [timestamp, value]; // Other series remain unchanged
          });
      }
  });
}





  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.chartRef) {
      this.adjustChartHeight();
      this.chartRef.reflow();
    }
  }

  subscribeToDurationChanges(): void {
    this.durationService.selectedDuration$.subscribe((duration) => {
      console.log('Duration changed to:', duration);
      this.isLoading = true; 
      this.selectedDuration = duration;
      if (this.id) {
        this.fetchData(this.id, duration);
      }
    });
  }

  adjustChartHeight() {
    const containerHeight = this.chartContainer.nativeElement.offsetHeight;
    this.chartRef.setSize(null, containerHeight);
  }

  fetchData(id: string, duration: string): void {
    console.log(`Fetching data for ID: ${id} with duration: ${duration}`);

    const startDate = this.getDateMinusDaysInHST(parseInt(duration), id);
    console.log(`Start Date Calculated: ${startDate}`);

    this.dataService.getData(id, startDate).pipe(takeUntil(this.destroy$)).subscribe(
      (data: any[]) => {
        console.log("Data received:", data);

        if (!data || data.length === 0) {
          console.error("No data received. Possible API issue.");
          this.isLoading = false;
          return;
        }

        let temperatureData: [number, number][] = [];
        let rainfallData: [number, number][] = [];
        let radData: [number, number][] = [];

        let timezoneOffset = id.startsWith('1') ? 660 : 600; // Samoa (UTC -11), Hawaii (UTC -10)
        this.chartOptions.time = { timezoneOffset };

        data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);

          if (!isNaN(timestamp) && !isNaN(value)) {
            if (item.variable === 'Tair_1_Avg') {
              temperatureData.push([timestamp, (value * 1.8) + 32]); // Convert °C to °F
            } else if (item.variable === 'RF_1_Tot300s') {
              rainfallData.push([timestamp, value / 25.4]); // Convert mm to inches
            } else if (item.variable === 'SWin_1_Avg') {
              radData.push([timestamp, value]);
            }
          } else {
            console.warn("Skipping invalid data point:", item);
          }
        });

        // 🛑 Perform Aggregation if Duration is 3 or 7 days 🛑
        if (duration === '3' || duration === '7') {
          console.log("Aggregating data to hourly...");

          temperatureData = this.aggregateToHourly(temperatureData);
          rainfallData = this.aggregateToHourly(rainfallData, true); // Sum rainfall
          radData = this.aggregateToHourly(radData);

          this.chartOptions.yAxis = [
            { title: { text: 'Hourly Temperature (°F)' } },
            { title: { text: 'Hourly Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Hourly Solar Radiation (W/m²)' }, opposite: true, min: 0 },
          ];
        } else {
          this.chartOptions.yAxis = [
            { title: { text: 'Temperature (°F)' } },
            { title: { text: '5-min Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Solar Radiation (W/m²)' }, opposite: true, min: 0 },
          ];
        }

        temperatureData.sort((a, b) => a[0] - b[0]);
        rainfallData.sort((a, b) => a[0] - b[0]);
        radData.sort((a, b) => a[0] - b[0]);

        const totalRainfall = rainfallData.length > 0 ? rainfallData.reduce((sum, point) => sum + point[1], 0) : 0;
        this.aggregateService.updateTotalRainfall(totalRainfall);

        const meanTemp = temperatureData.length > 0 ? temperatureData.reduce((sum, point) => sum + point[1], 0) / temperatureData.length : 0;
        this.aggregateService.updateMeanTemp(meanTemp);

        const minTemp = temperatureData.length > 0 ? Math.min(...temperatureData.map(point => point[1])) : 0;
        this.aggregateService.updateMinTemp(minTemp);

        const maxTemp = temperatureData.length > 0 ? Math.max(...temperatureData.map(point => point[1])) : 0;
        this.aggregateService.updateMaxTemp(maxTemp);

        const meanSolarRad = radData.length > 0 ? radData.reduce((sum, point) => sum + point[1], 0) / radData.length : 0;
        this.aggregateService.updateMeanSolarRad(meanSolarRad);

        console.log(`Total Rainfall: ${totalRainfall} in`);
        console.log(`Mean Temperature: ${meanTemp.toFixed(2)} °F`);
        console.log(`Min Temperature: ${minTemp.toFixed(2)} °F`);
        console.log(`Max Temperature: ${maxTemp.toFixed(2)} °F`);
        console.log(`Mean Solar Radiation: ${meanSolarRad.toFixed(2)} W/m²`);

        this.chartOptions.series = [
          { name: 'Temperature (°F)', data: temperatureData, yAxis: 0, type: 'line', color: '#41d68f', zIndex: 3 },
          { name: 'Rainfall (in)', data: rainfallData, yAxis: 1, type: 'column', color: '#769dff', maxPointWidth: 5, groupPadding: 0.05, pointPadding: 0.05 },
          { name: 'Solar Radiation (W/m²)', data: radData, yAxis: 2, type: 'line', color: '#f9b721', visible: false }
        ] as Highcharts.SeriesOptionsType[];

        // Create or update the chart
        if (!this.chartRef) {
          console.log("Creating new chart...");
          this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
        } else {
          console.log("Updating existing chart...");
          this.chartRef.update(this.chartOptions, true, true);
        }

        this.isLoading = false;
        console.log(`Timezone offset set to: ${timezoneOffset} minutes (ID: ${id})`);
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false;
      }
    );
}


getDateMinusDaysInHST(days: number, id: string): string {
  const currentDate = new Date();
  const dateMinusHours = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));

  // Determine correct timezone
  const timeZone = id.startsWith('1') ? 'Pacific/Pago_Pago' : 'Pacific/Honolulu'; // Samoa (-11) or Hawaii (-10)
  const offset = id.startsWith('1') ? '-11:00' : '-10:00'; // Format UTC offset

  const timeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = timeFormat.formatToParts(dateMinusHours).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}${offset}`;
}


  updateData(): void {
    if (this.isDestroyed || !this.id) {
      console.log('Component is destroyed or no ID available. Stopping update.');
      return; // Exit if component is destroyed
    }

    this.fetchData(this.id, this.selectedDuration);

    clearTimeout(this.refreshTimeout); 

    if (!this.isDestroyed) {
      this.refreshTimeout = setTimeout(() => {
        this.updateData(); // Recursive call for periodic updates
      }, this.refreshIntervalMS);
    }
  }


  aggregateToHourly(data: [number, number][], sum = false): [number, number][] {
    if (!data || data.length === 0) {
        console.warn("No data provided for aggregation.");
        return [];
    }

    const hourlyData: { [hour: string]: { sum: number; count: number } } = {};

    data.forEach(([timestamp, value]) => {
        const hourTimestamp = Math.floor(timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
        if (!hourlyData[hourTimestamp]) {
            hourlyData[hourTimestamp] = { sum: 0, count: 0 };
        }
        hourlyData[hourTimestamp].sum += value;
        hourlyData[hourTimestamp].count += 1;
    });

    return Object.keys(hourlyData).map(hour => {
        const timestamp = Number(hour);
        const { sum: totalSum, count } = hourlyData[hour];

        const result = sum ? totalSum : totalSum / count; // Sum for rainfall, average otherwise

        return [timestamp, isNaN(result) ? 0 : result]; // Avoid NaN values
    });
}

  onDurationChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedDuration = selectedValue;
    this.durationChanged.emit(selectedValue);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true; // Prevent further updates
    clearTimeout(this.refreshTimeout); // Stop the periodic updates
    this.destroy$.next(); // Emit value to cancel HTTP requests
    this.destroy$.complete(); // Complete the Subject
    this.unitSubscription.unsubscribe();
  }


}
