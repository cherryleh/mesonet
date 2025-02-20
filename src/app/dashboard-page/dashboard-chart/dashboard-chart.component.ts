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
        });
    } catch (error) {
        console.error('Error during ngOnInit:', error);
        this.isLoading = false;
    }
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

    const startDate = this.getDateMinusDaysInHST(parseInt(duration));
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

        let timezoneOffset = id.startsWith('1') ? 660 : 600; // Samoa (UTC -11) or Hawaii (UTC -10)

        data.forEach(item => {
          console.log("Processing item:", item);

          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);

          if (!isNaN(timestamp) && !isNaN(value)) {
            if (item.variable === 'Tair_1_Avg') {
              temperatureData.push([timestamp, (value * 1.8) + 32]);
            } else if (item.variable === 'RF_1_Tot300s') {
              rainfallData.push([timestamp, value / 25.4]);
            } else if (item.variable === 'SWin_1_Avg') {
              radData.push([timestamp, value]);
            }
          } else {
            console.warn("Skipping invalid data point:", item);
          }
        });

        console.log("Processed Temperature Data:", temperatureData);
        console.log("Processed Rainfall Data:", rainfallData);
        console.log("Processed Radiation Data:", radData);

        if (temperatureData.length === 0 && rainfallData.length === 0 && radData.length === 0) {
          console.error("No valid data points found. Cannot update chart.");
          this.isLoading = false;
          return;
        }

        // Update Highcharts time settings dynamically
        this.chartOptions.time = { timezoneOffset };
        this.chartOptions.series = [
          { name: 'Temperature (°F)', data: temperatureData, yAxis: 0, type: 'line', color: '#41d68f', zIndex: 3 },
          { name: 'Rainfall (in)', data: rainfallData, yAxis: 1, type: 'column', color: '#769dff', maxPointWidth: 5, groupPadding: 0.05, pointPadding: 0.05 },
          { name: 'Solar Radiation (W/m²)', data: radData, yAxis: 2, type: 'line', color: '#f9b721', visible: false }
        ] as Highcharts.SeriesOptionsType[];

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

  updateData(): void {
    if (this.isDestroyed || !this.id) {
      console.log('Component is destroyed or no ID available. Stopping update.');
      return; // Exit if component is destroyed
    }

    this.fetchData(this.id, this.selectedDuration);

    clearTimeout(this.refreshTimeout); // Clear any existing timeout before setting a new one

    // Schedule the next update ONLY IF the component is still active
    if (!this.isDestroyed) {
      this.refreshTimeout = setTimeout(() => {
        this.updateData(); // Recursive call for periodic updates
      }, this.refreshIntervalMS);
    }
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
        const timestamp = Number(hour); // Keep the start of the hour as the timestamp
        const { sum: totalSum, count } = hourlyData[hour];
        const result = sum ? totalSum : totalSum / count; // Sum if sum = true, otherwise average
        return [timestamp, result];
      });
  }


  onDurationChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedDuration = selectedValue;
    this.durationChanged.emit(selectedValue);
  }

  ngOnDestroy(): void {
    console.log('Dashboard chart component destroyed. Clearing refresh timer and canceling HTTP requests.');
    this.isDestroyed = true; // Prevent further updates
    clearTimeout(this.refreshTimeout); // Stop the periodic updates
    this.destroy$.next(); // Emit value to cancel HTTP requests
    this.destroy$.complete(); // Complete the Subject
  }


}
