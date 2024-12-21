import { Component, OnInit, HostListener, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Highcharts from 'highcharts';

import { DashboardChartService } from '../../dashboard-chart.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DurationService } from '../../../dashboard-chart-dropdown.service';
import { aggregateService } from '../../../aggregate.service';

import OfflineExporting from 'highcharts/modules/offline-exporting';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';
// import { DurationSelectorComponent } from '../duration-selector/duration-selector.component';

Exporting(Highcharts);
ExportData(Highcharts);
OfflineExporting(Highcharts);


@Component({
  selector: 'app-dashboard-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule,],
  templateUrl: './dashboard-chart.component.html',
  styleUrls: ['./dashboard-chart.component.css'],
  providers: [DashboardChartService],
})

export class DashboardChartComponent implements OnInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Output() durationChanged = new EventEmitter<string>();

  currentTimeISO!: string;
  refreshIntervalMS = 30000;
  isLoading = false;
  id: string | null = null;
  selectedDuration = '1';

  durations = [
    { label: 'Last 24 Hours', value: '1' },
    { label: 'Last 3 Days', value: '3' },
    { label: 'Last 7 Days', value: '7' },
  ];
  Highcharts = Highcharts;
  chartRef!: Highcharts.Chart;

  chartOptions: Highcharts.Options = {
    chart: {
      events: {
        load() {
          const chart = this;
          // Query checkboxes from the DOM
          chart.series.forEach((series, index) => {
            const checkbox = chart.container.querySelectorAll('input.highcharts-legend-checkbox')[index] as HTMLInputElement;

            if (checkbox) {
              checkbox.checked = true; // Mark checkboxes checked by default
            }

            series.setVisible(true, false); // Ensure series are visible initially
          });
        }

      },
      type: 'line',
      height: '50%'
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
        min: 0,
        max: 0.5
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
    legend: { 
      enabled: true, 
      itemCheckboxStyle: { width: 13, height: 13, marginLeft: -40 },
    },
    plotOptions: {
      series: {
        showCheckbox: true,
        events: {
          checkboxClick: function () {
            this.setVisible(!this.visible);
          },
          legendItemClick: function () {
            const chart = this.chart;
            const index = this.index; // Series index

            // Locate the checkbox for this series
            const checkbox = chart.container.querySelectorAll('input.highcharts-legend-checkbox')[index] as HTMLInputElement;

            if (checkbox) {
              checkbox.checked = !this.visible; // Sync checkbox with visibility
            }

            return true; // Allow default click behavior
          }

          }
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

    ngOnInit(): void {
      console.log('🔄 ngOnInit is running');
        this.route.queryParams.subscribe(params => {
          this.id = params['id'];
          if (!this.id) return console.error('❌ ID not found in query params.');

          // this.currentTimeISO = new Date().toISOString();
          this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
          // this.fetchData(this.id, this.selectedDuration);
          this.subscribeToDurationChanges();
          this.adjustChartHeight();
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
    this.durationService.selectedDuration$.subscribe(duration => {
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
    console.log('🔍 Checking if fetchData is being called with:', { id: this.id, selectedDuration: this.selectedDuration });

    this.isLoading = true;
    const startDate = this.getDateMinusDaysInHST(parseInt(duration));
    console.log(`Start date is ${startDate}`);
    this.dataService.getData(id, startDate).subscribe(
      (data: any[]) => {
        let temperatureData: [number, number][] = [];
        let rainfallData: [number, number][] = [];
        let radData: [number, number][] = [];

        data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);

          if (item.variable === 'Tair_1_Avg') {
            temperatureData.push([timestamp, (value * 1.8) + 32]);
          } else if (item.variable === 'RF_1_Tot300s') {
            rainfallData.push([timestamp, value / 25.4]);
          } else if (item.variable === 'SWin_1_Avg') {
            radData.push([timestamp, value]);
          }
        });

        if (duration == '3' || duration === '7') {
          temperatureData = this.aggregateToHourly(temperatureData);
          rainfallData = this.aggregateToHourly(rainfallData, true); // Aggregate rainfall by sum
          radData = this.aggregateToHourly(radData);
        }

        const totalRainfall = rainfallData.reduce((sum, point) => sum + point[1], 0);
        this.aggregateService.updateTotalRainfall(totalRainfall);

        const durationLabels: Record<string, string> = {
          '1': '24-hour',
          '3': '3-Day',
          '7': '7-Day',
        };

        const durationText = durationLabels[duration] || 'Custom duration';
        this.aggregateService.updateDurationText(durationText);

        const maxRainfall = Math.max(...rainfallData.map(point => point[1]));
        console.log(`Max rainfall value: ${maxRainfall}`);

        // 🔴 Dynamically update the Rainfall yAxis max using Highcharts update()
        if (this.chartRef) {
          this.chartRef.update({
            yAxis: [{
              max: null // Temperature
            }, {
              max: maxRainfall > 0.5 ? null : 0.5 // Rainfall axis
            }, {
              max: null // Solar Radiation
            }]
          });
        }


        this.chartOptions.series = [
          {
            name: 'Temperature (°F)',
            data: temperatureData,
            yAxis: 0,
            type: 'line',
            color: '#41d68f',
            zIndex: 3
          },
          {
            name: 'Rainfall (in)',
            data: rainfallData,
            yAxis: 1,
            type: 'column',
            color: '#769dff',
            maxPointWidth: 5,
            groupPadding: 0.05,
            pointPadding: 0.05,
          },
          {
            name: 'Solar Radiation (W/m²)',
            data: radData,
            yAxis: 2,
            type: 'line',
            color: '#f9b721'
          }
        ] as Highcharts.SeriesOptionsType[];

        if (this.chartContainer) {
          this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
        }
        this.isLoading = false;
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
        const timestamp = Number(hour); // Keep the start of the hour as the timestamp
        const { sum: totalSum, count } = hourlyData[hour];
        const result = sum ? totalSum : totalSum / count; // Sum if sum = true, otherwise average
        return [timestamp, result];
      });
  }


  onDurationChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    console.log('🚀 Child onDurationChange() called with:', selectedValue);
    this.selectedDuration = selectedValue;
    this.durationChanged.emit(selectedValue);
  }

}
