import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-climatology',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent],
  templateUrl: './climatology.component.html',
  styleUrls: ['./climatology.component.css'],
})
export class ClimatologyComponent implements OnInit {
  @ViewChild('climatologyChart', { static: true }) climatologyChart!: ElementRef;
  Highcharts: typeof Highcharts = Highcharts;
  chart: Highcharts.Chart | undefined;
  stationId: string = '';
  // Data arrays for chart series
  rfData: number[] = [];
  tmeanData: number[] = [];
  tminData: number[] = [];
  tmaxData: number[] = [];
  categories: string[] = []; // X-axis categories for months
  isMetric: boolean = false;

  constructor(private http: HttpClient,private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID from URL:', this.stationId);
      this.loadCSVData(this.stationId);
    });
  }

  loadCSVData(stationId: string): void {
    const csvUrl = `./climos/${stationId}_climatology.csv`; 
    this.http.get(csvUrl, { responseType: 'text' }).subscribe(
      (data) => {
        console.log('Raw CSV Data:', data);
        this.parseCSV(data);
        this.createChart();
      },
      (error) => {
        console.error('Error loading CSV:', error);
      }
    );
  }

  parseCSV(data: string): void {
    const rows = data.split('\n');
    const headers = rows[0].split(','); // Get headers from first row

    // Find column indices dynamically
    const monthIndex = headers.indexOf('Month');
    const rf_in = headers.indexOf('RF_in');
    const tmean_f = headers.indexOf('Tmean_f');
    const tmin_f = headers.indexOf('Tmin_f');
    const tmax_f = headers.indexOf('Tmax_f');

    const rf_mm = headers.indexOf('RF_mm');
    const tmean_c = headers.indexOf('Tmean_c');
    const tmin_c = headers.indexOf('Tmin_c');
    const tmax_c = headers.indexOf('Tmax_c');

    rows.slice(1).forEach((row) => {
      const columns = row.split(',');
      const month = columns[monthIndex];
      const rf = parseFloat(this.isMetric ? columns[rf_mm] : columns[rf_in]);
      const tmean = parseFloat(this.isMetric ? columns[tmean_c] : columns[tmean_f]);
      const tmin = parseFloat(this.isMetric ? columns[tmin_c] : columns[tmin_f]);
      const tmax = parseFloat(this.isMetric ? columns[tmax_c] : columns[tmax_f]);

      if (!isNaN(rf) && !isNaN(tmean) && !isNaN(tmin) && !isNaN(tmax)) {
        this.categories.push(month);
        this.rfData.push(rf);
        this.tmeanData.push(tmean);
        this.tminData.push(tmin);
        this.tmaxData.push(tmax);
      }
    });

    console.log('Parsed Data:', {
      categories: this.categories,
      rfData: this.rfData,
      tmeanData: this.tmeanData,
      tminData: this.tminData,
      tmaxData: this.tmaxData,
    });
  }

  createChart(): void {
    const chartOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        height: '50%'
      },
      title: {
        text: '',
      },
      xAxis: {
        categories: this.categories,
        crosshair: true,
      },
      yAxis: [
        {
          labels: {
            format: `{value} ${this.isMetric ? 'mm' : 'in'}`,
          },
          title: {
            text: `Rainfall (${this.isMetric ? 'mm' : 'in'})`,
          },
        },
        {
          title: {
            text: `Temperature (${this.isMetric ? '°C' : '°F'})`,
          },
          labels: {
            format: `{value} ${this.isMetric ? '°C' : '°F'}`,
          },
          opposite: true,
        },
      ],
      tooltip: {
        shared: true,
      },
      legend: {
        floating: false, // Set to false to prevent floating
        verticalAlign: 'top', // Move the legend below the chart
        align: 'center', // Center-align the legend
        layout: 'horizontal', // Layout horizontally
        itemMarginTop: 5, // Adds spacing between legend items
      },
      series: [
        {
          type: 'column',
          name: `Rainfall (${this.isMetric ? 'mm' : 'in'})`,
          data: this.rfData,
          yAxis: 0,
          tooltip: {
            valueSuffix: this.isMetric ? ' mm' : ' in',
          },
        },
        {
          type: 'line',
          name: `Mean Temperature (${this.isMetric ? '°C' : '°F'})`,
          data: this.tmeanData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.isMetric ? ' °C' : ' °F',
          },
        },
        {
          type: 'line',
          name: `Minimum Temperature (${this.isMetric ? '°C' : '°F'})`,
          data: this.tminData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.isMetric ? ' °C' : ' °F',
          },
        },
        {
          type: 'line',
          name: `Maximum Temperature (${this.isMetric ? '°C' : '°F'})`,
          data: this.tmaxData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.isMetric ? ' °C' : ' °F',
          },
        }
      ],
    };

    const chartContainer = document.getElementById('climatologyChart');
    if (chartContainer) {
      this.chart = Highcharts.chart(chartContainer, chartOptions);
    } else {
      console.error('Chart container not found!');
    }
  }

  toggleUnits(): void {
    this.isMetric = !this.isMetric;
    this.rfData = [];
    this.tmeanData = [];
    this.tminData = [];
    this.tmaxData = [];
    this.categories = [];
    this.loadCSVData(this.stationId);
  }
}
