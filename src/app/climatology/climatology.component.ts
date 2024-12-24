import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

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

  // Data arrays for chart series
  rfData: number[] = [];
  tmeanData: number[] = [];
  tminData: number[] = [];
  tmaxData: number[] = [];
  categories: string[] = []; // X-axis categories for months

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCSVData();
  }

  loadCSVData(): void {
    const csvUrl = './climos/0115_climatology.csv'; // Ensure file path is correct

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
      const rf = parseFloat(columns[rf_in]);
      const tmean = parseFloat(columns[tmean_f]);
      const tmin = parseFloat(columns[tmin_f]);
      const tmax = parseFloat(columns[tmax_f]);

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
        height: '45%'
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
            format: '{value} in',
          },
          title: {
            text: 'Rainfall (in)',
          },
        },
        {
          title: {
            text: 'Temperature (°F)',
          },
          labels: {
            format: '{value} °F',
          },
          opposite: true,
        },
      ],
      tooltip: {
        shared: true,
      },
      legend: {
        floating: true,
        verticalAlign: 'top',
        layout: 'horizontal',
      },
      series: [
        {
          type: 'column',
          name: 'Rainfall (in)',
          data: this.rfData,
          yAxis: 0,
          tooltip: {
            valueSuffix: ' in',
          },
        },
        {
          type: 'line',
          name: 'Mean Temperature (°F)',
          data: this.tmeanData,
          yAxis: 1,
          tooltip: {
            valueSuffix: ' °F',
          },
        },
        {
          type: 'line',
          name: 'Minimum Temperature (°F)',
          data: this.tminData,
          yAxis: 1,
          tooltip: {
            valueSuffix: ' °F',
          },
        },
        {
          type: 'line',
          name: 'Maximum Temperature (°F)',
          data: this.tmaxData,
          yAxis: 1,
          tooltip: {
            valueSuffix: ' °F',
          },
        },
      ],
    };

    this.chart = Highcharts.chart(this.climatologyChart.nativeElement, chartOptions);
  }
}
