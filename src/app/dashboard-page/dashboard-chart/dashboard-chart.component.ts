import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, Input, Output, EventEmitter, HostListener
} from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Highcharts from 'highcharts';

import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';
import OfflineExporting from 'highcharts/modules/offline-exporting';

import { DashboardChartService } from '../../services/dashboard-chart.service';
import { DurationService } from '../../services/dashboard-chart-dropdown.service';
import { aggregateService } from '../../services/aggregate.service';
import { UnitService } from '../../services/unit.service';

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
export class DashboardChartComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() isCollapsed = false;
  @Output() durationChanged = new EventEmitter<string>();
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  Highcharts = Highcharts;
  chartRef!: Highcharts.Chart;

  id: string | null = null;
  isLoading = true;
  selectedUnit: string = 'standard';
  selectedDuration = '1';

  private refreshTimeout: any;
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private unitSubscription!: Subscription;

  durations = [
    { label: 'Last 24 Hours', value: '1' },
    { label: 'Last 3 Days', value: '3' },
    { label: 'Last 7 Days', value: '7' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isCollapsed'] && !changes['isCollapsed'].firstChange) {
      // Initial reflow (after collapse/expand)
      setTimeout(() => {
        this.chartRef?.reflow();

        // Follow-up reflow to fix edge cutoff after transition
        setTimeout(() => {
          this.chartRef?.reflow();
        }, 250); // Adjust if your sidebar animation is longer
      }, 0);
    }
  }


  chartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      animation: false,
      zooming: { type: 'x' },
      spacingTop: 0
    },
    title: { text: '' },
    xAxis: {
      type: 'datetime',
      labels: {
        format: '{value:%b %e, %l:%M %p}',
        step: 1,
        rotation: 0
      },
      tickInterval: 6 * 3600 * 1000
    },
    yAxis: [
      { title: { text: 'Temperature (°F)' } },
      { title: { text: '5-min Rainfall (in)' }, opposite: true, min: 0 },
      { title: { text: 'Solar Radiation (W/m²)' }, opposite: true, min: 0 },
    ],
    tooltip: {
      shared: true,
      valueDecimals: 2,
      xDateFormat: '%b %e, %Y %l:%M%p'
    },
    time: { timezoneOffset: 600 },
    plotOptions: {
      series: {
        lineWidth: 3,
        marker: { enabled: false },
        animation: false,
        events: {
          legendItemClick: function () {
            if (this.name === 'Solar Radiation (W/m²)') {
              const chart = this.chart;
              const yAxis = chart.yAxis[2];

              // Toggle title based on the *new* visibility
              const newVisibility = !this.visible;
              yAxis.update({
                title: {
                  text: newVisibility ? 'Solar Radiation (W/m²)' : null
                }
              });
            }
          }
        }
      }
    }
,
    legend: {
      align: 'center',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemHiddenStyle: {
        color: 'gray',
        textDecoration: 'none'
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
    },
    series: []
  };

  constructor(
    private route: ActivatedRoute,
    private dataService: DashboardChartService,
    private aggregateService: aggregateService,
    private durationService: DurationService,
    private unitService: UnitService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.id = params['id'];
      if (!this.id) {
        console.error('ID not found in query params.');
        this.isLoading = false;
        return;
      }

      // Don't set chart here
      this.subscribeToDurationChanges();
      this.unitSubscription = this.unitService.selectedUnit$.subscribe(unit => {
        this.selectedUnit = unit;
        if (this.id) {
          this.fetchData(this.id, this.selectedDuration); // <-- ADD this line
        }
      });


      this.isLoading = false;
    });
  }


  ngAfterViewInit(): void {
    if (!this.chartRef && this.chartContainer) {
      this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
    }

    setTimeout(() => {
      this.chartRef?.reflow();
    }, 200);
  }



  ngOnDestroy(): void {
    this.isDestroyed = true;
    clearTimeout(this.refreshTimeout);
    this.destroy$.next();
    this.destroy$.complete();
    this.unitSubscription.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustChartHeight();
    this.chartRef?.reflow();
  }

  onDurationChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedDuration = selectedValue;
    this.durationChanged.emit(selectedValue);
  }

  private subscribeToDurationChanges(): void {
    this.durationService.selectedDuration$.pipe(takeUntil(this.destroy$)).subscribe(duration => {
      this.isLoading = true;
      this.selectedDuration = duration;
      if (this.id) this.fetchData(this.id, duration);

      const tick = duration === '1' ? 6 * 3600 * 1000 : 24 * 3600 * 1000;
      if (Array.isArray(this.chartOptions.xAxis)) {
        this.chartOptions.xAxis[0].tickInterval = tick;
      } else {
        (this.chartOptions.xAxis as Highcharts.XAxisOptions).tickInterval = tick;
      }
      this.chartRef?.update({ xAxis: this.chartOptions.xAxis });
    });
  }

  private adjustChartHeight(): void {
    const height = this.chartContainer.nativeElement.offsetHeight;
    this.chartRef.setSize(null, height);
  }

  private updateChartUnits(): void {
    const names = [
      this.selectedUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)',
      this.selectedUnit === 'metric' ? 'Rainfall (mm)' : 'Rainfall (in)',
      'Solar Radiation (W/m²)'
    ];

    // Update series names only
    this.chartRef.series.forEach((series, i) => {
      series.update({ name: names[i] } as any, false);
    });

    // Update y-axis titles
    this.chartRef.yAxis[0].setTitle({ text: names[0] });
    this.chartRef.yAxis[1].update({
      title: { text: names[1] },
      // Optional fallback axis config
      max: undefined,
      tickInterval: undefined
    }, false);

    this.chartRef.redraw();
  }


  private getConvertedData(): [number, number][][] {
    return this.chartRef.series.map((series, i) => {
      return series.data.map(point => {
        const x = point.x as number;
        let y = point.y as number;

        if (this.selectedUnit === 'metric') {
          if (i === 0) y = ((y - 32) * 5) / 9;
          else if (i === 1) y *= 25.4;
        } else {
          if (i === 0) y = (y * 9) / 5 + 32;
          else if (i === 1) y /= 25.4;
        }
        return [x, y];
      });
    });
  }

  private isDataChanged(newData: [number, number][], oldData: [number, number][]): boolean {
    if (newData.length !== oldData.length) return true;
    return newData.some((val, i) => val[0] !== oldData[i][0] || val[1] !== oldData[i][1]);
  }

  private getDateMinusDaysInHST(days: number, id: string): string {
    const currentDate = new Date();
    const dateMinusHours = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const timeZone = id.startsWith('1') ? 'Pacific/Pago_Pago' : 'Pacific/Honolulu';
    const offset = id.startsWith('1') ? '-11:00' : '-10:00';

    const timeFormat = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    const parts = timeFormat.formatToParts(dateMinusHours).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}${offset}`;
  }

  private aggregateToHourly(data: [number, number][], sum = false): [number, number][] {
    if (!data || data.length === 0) return [];

    const hourlyData: { [hour: string]: { sum: number; count: number } } = {};

    data.forEach(([timestamp, value]) => {
      const hourTimestamp = Math.floor(timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
      if (!hourlyData[hourTimestamp]) hourlyData[hourTimestamp] = { sum: 0, count: 0 };
      hourlyData[hourTimestamp].sum += value;
      hourlyData[hourTimestamp].count += 1;
    });

    return Object.keys(hourlyData).map(hour => {
      const timestamp = Number(hour);
      const { sum: totalSum, count } = hourlyData[hour];
      const result = sum ? totalSum : totalSum / count;
      return [timestamp, isNaN(result) ? 0 : result];
    });
  }

  private updateData(): void {
    if (this.isDestroyed || !this.id) return;
    this.fetchData(this.id, this.selectedDuration);

    clearTimeout(this.refreshTimeout);
    if (!this.isDestroyed) {
      this.refreshTimeout = setTimeout(() => this.updateData(), 300000);
    }
  }

  private fetchData(id: string, duration: string): void {
    const startDate = this.getDateMinusDaysInHST(parseInt(duration), id);

    this.dataService.getData(id, startDate).pipe(takeUntil(this.destroy$)).subscribe((data: any[]) => {
      if (!data || data.length === 0) {
        console.error("No data received. Possible API issue.");
        this.isLoading = false;
        return;
      }

      let temperatureData: [number, number][] = [];
      let rainfallData: [number, number][] = [];
      let radData: [number, number][] = [];

      const timezoneOffset = id.startsWith('1') ? 660 : 600;

      
      const solarSeries = this.chartRef?.series.find((s: any) => s.name === 'Solar Radiation');

      this.chartRef?.yAxis[2].update({
        title: {
          text: solarSeries?.visible ? 'Solar Radiation (W/m²)' : null
        }
      });

      const isStreamStation = id.startsWith('14');

      data.forEach(item => {
        const timestamp = new Date(item.timestamp).getTime();
        const value = parseFloat(item.value);

      if (!isNaN(timestamp) && !isNaN(value)) {
          if (isStreamStation) {
            if (item.variable === 'Twt_1_Avg') {
              temperatureData.push([timestamp, value]);
            } else if (item.variable === 'Wlvl_1_Avg') {
              radData.push([timestamp, value]);
            } else if (item.variable === 'RF_1_Tot300s') {
              const rain = this.selectedUnit === 'metric' ? value : value / 25.4;
              rainfallData.push([timestamp, rain]);
            }
          } else {
            if (item.variable === 'Tair_1_Avg') {
              const temp = this.selectedUnit === 'metric' ? value : (value * 1.8) + 32;
              temperatureData.push([timestamp, temp]);
            } else if (item.variable === 'RF_1_Tot300s') {
              const rain = this.selectedUnit === 'metric' ? value : value / 25.4;
              rainfallData.push([timestamp, rain]);
            } else if (item.variable === 'SWin_1_Avg') {
              radData.push([timestamp, value]);
            }
          }
        }
      });

      if (duration === '3' || duration === '7') {
        temperatureData = this.aggregateToHourly(temperatureData);
        rainfallData = this.aggregateToHourly(rainfallData, true);
        radData = this.aggregateToHourly(radData);

        this.chartOptions.yAxis = isStreamStation
        ? [
            { title: { text: 'Hourly Water Temperature (°C)' } },
            { title: { text: 'Hourly Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Hourly Water Level (m)' }, opposite: true, min: 0 },
          ]
        : [
            { title: { text: 'Hourly Temperature (°F)' } },
            { title: { text: 'Hourly Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Solar Radiation (W/m²)' }, opposite: true, min: 0 },
          ];
      } else {
        this.chartOptions.yAxis = isStreamStation
        ? [
            { title: { text: 'Water Temperature (°C)' } },
            { title: { text: '5-min Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Water Level (m)' }, opposite: true, min: 0 },
          ]
        : [
            { title: { text: 'Temperature (°F)' } },
            { title: { text: '5-min Rainfall (in)' }, opposite: true, min: 0 },
            { title: { text: 'Solar Radiation (W/m²)' }, opposite: true, min: 0 },
          ];
      }

      this.chartRef.update({ yAxis: this.chartOptions.yAxis }, false);

      temperatureData.sort((a, b) => a[0] - b[0]);
      rainfallData.sort((a, b) => a[0] - b[0]);
      radData.sort((a, b) => a[0] - b[0]);

      this.aggregateService.updateTotalRainfall(rainfallData.reduce((sum, point) => sum + point[1], 0));
      this.aggregateService.updateMeanTemp(temperatureData.reduce((sum, point) => sum + point[1], 0) / temperatureData.length);
      this.aggregateService.updateMinTemp(Math.min(...temperatureData.map(point => point[1])));
      this.aggregateService.updateMaxTemp(Math.max(...temperatureData.map(point => point[1])));
      this.aggregateService.updateMeanSolarRad(radData.reduce((sum, point) => sum + point[1], 0) / radData.length);

      const wasSolarVisible = this.chartRef?.series.find(s => s.name === 'Solar Radiation (W/m²)')?.visible ?? false;
    
      let tempLabel = this.selectedUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)';
      let radLabel = 'Solar Radiation (W/m²)';

      if (isStreamStation) {
        tempLabel = 'Water Temperature (°C)';
        radLabel = 'Water Level (m)';
      }

      const rainLabel = this.selectedUnit === 'metric' ? 'Rainfall (mm)' : 'Rainfall (in)';


      const updatedSeries: Highcharts.SeriesOptionsType[] = [
        {
          name: tempLabel,
          data: temperatureData,
          yAxis: 0,
          type: 'line',
          color: '#41d68f',
          zIndex: 3,
        },
        {
          name: rainLabel,
          data: rainfallData,
          yAxis: 1,
          type: 'column',
          color: '#769dff',
          maxPointWidth: 5,
          groupPadding: 0.05,
          pointPadding: 0.05,
        },
        {
          name: radLabel,
          data: radData,
          yAxis: 2,
          type: 'line',
          color: '#f9b721',
          visible: isStreamStation,
        },
      ];

      this.chartRef.update({
        time: { timezoneOffset },
        series: updatedSeries,
        yAxis: this.chartOptions.yAxis
      }, true, true);

      // Update yAxis titles after updating series
      this.chartRef.yAxis[0].setTitle({ text: tempLabel });
      this.chartRef.yAxis[1].update({ title: { text: rainLabel } }, false);

      this.chartRef.redraw();

      this.isLoading = false;
    }, error => {
      console.error('Error fetching data:', error);
      this.isLoading = false;
    });
  }
}