import { Component, OnInit, HostListener, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Highcharts from 'highcharts';

import { DashboardChartService } from '../../services/dashboard-chart.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DurationService } from '../../services/dashboard-chart-dropdown.service';
import { aggregateService } from '../../services/aggregate.service';

import OfflineExporting from 'highcharts/modules/offline-exporting';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';

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
  previousTemperatureData: [number, number][] = [];
  previousRainfallData: [number, number][] = [];
  previousRadData: [number, number][] = [];
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

  @Output() durationChanged = new EventEmitter<string>();

  currentTimeISO!: string;
  refreshIntervalMS = 30000;
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
      timezoneOffset: 600, // Hawaii time
    },
    series: [],
    plotOptions: {
      series: {
        lineWidth: 3,
        marker: { enabled: false }
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
        if (!this.id) return console.error('❌ ID not found in query params.');

        this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);

        this.subscribeToDurationChanges();
        this.adjustChartHeight();
        this.updateData(); 
        console.log('🔄 Refreshing dashboard chart data...');

      });
    } catch (error) {
      console.error('Error during ngOnInit:', error);
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
      console.log('📢 Duration changed to:', duration);
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
    const startDate = this.getDateMinusDaysInHST(parseInt(duration));
    
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

        const meanTemp = temperatureData.reduce((sum, point) => sum + point[1], 0) / temperatureData.length;
        this.aggregateService.updateMeanTemp(meanTemp);

        const minTemp = Math.min(...temperatureData.map(point => point[1]));
        this.aggregateService.updateMinTemp(minTemp);

        const maxTemp = Math.max(...temperatureData.map(point => point[1]));
        this.aggregateService.updateMaxTemp(maxTemp);

        const meanSolarRad = radData.reduce((sum, point) => sum + point[1], 0) / radData.length;
        
        this.aggregateService.updateMeanSolarRad(meanSolarRad);

        const durationLabels: Record<string, string> = {
          '1': '24-hour',
          '3': '3-Day',
          '7': '7-Day',
        };

        const durationText = durationLabels[duration] || 'Custom duration';
        this.aggregateService.updateDurationText(durationText);

        const maxRainfall = Math.max(...rainfallData.map(point => point[1]));
        console.log(`Max rainfall value: ${maxRainfall}`);

        const temperatureChanged = this.isDataChanged(temperatureData, this.previousTemperatureData);
        const rainfallChanged = this.isDataChanged(rainfallData, this.previousRainfallData);
        const radChanged = this.isDataChanged(radData, this.previousRadData);

        if (temperatureChanged || rainfallChanged || radChanged) {
          console.log('🔄 Data changed - showing spinner...');
          this.isLoading = true; // Show spinner
        } else {
          console.log('⏸️ No changes detected. Skipping update.');
          this.isLoading = false; // Don't show spinner, exit early
          return;
        }
        
        this.previousTemperatureData = temperatureData;
        this.previousRainfallData = rainfallData;
        this.previousRadData = radData;

        
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
            zIndex: 3,
            animation: false
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
            animation: false
          },
          {
            name: 'Solar Radiation (W/m²)',
            data: radData,
            yAxis: 2,
            type: 'line',
            color: '#f9b721',
            visible: false,
            animation: false
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
    if (this.id) {
      this.fetchData(this.id, this.selectedDuration);
    }
    setTimeout(() => {
      this.updateData(); // Recursive call to keep updating
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
