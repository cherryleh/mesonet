import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import { UnitService } from '../services/unit.service'; 
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-climatology',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent, MatFormFieldModule, FormsModule, MatSelectModule],
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

  selectedUnit: 'metric' | 'standard' = 'standard';
  private unitSubscription!: Subscription;

  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
  
  constructor(private http: HttpClient,private route: ActivatedRoute, private unitService: UnitService) {}

  ngOnInit(): void {
    this.unitSubscription = this.unitService.getUnit().subscribe(unit => {
      this.selectedUnit = unit as 'metric' | 'standard';
    });

    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id';
      this.loadCSVData(this.stationId);
    });
  }

  loadCSVData(stationId: string): void {
    const csvUrl = `./climos/${stationId}_climatology.csv`; 
    this.http.get(csvUrl, { responseType: 'text' }).subscribe(
      (data) => {
        const hasTemperature = this.parseCSV(data);
        this.createChart(hasTemperature);
      },
      (error) => {
        console.error('Error loading CSV:', error);
      }
    );
  }

  parseCSV(data: string): boolean {
    const rows = data.split('\n');
    if (rows.length < 2) return false; // Ensure there's at least a header and one row

    const headers = rows[0].split(',');

    const monthIndex = headers.indexOf('Month');
    const rf_in = headers.indexOf('RF_in');
    const rf_mm = headers.indexOf('RF_mm');

    const tmean_f = headers.indexOf('Tmean_f');
    const tmin_f = headers.indexOf('Tmin_f');
    const tmax_f = headers.indexOf('Tmax_f');
    const tmean_c = headers.indexOf('Tmean_c');
    const tmin_c = headers.indexOf('Tmin_c');
    const tmax_c = headers.indexOf('Tmax_c');

    const hasTemperature = tmean_f !== -1 && tmin_f !== -1 && tmax_f !== -1 && 
                           tmean_c !== -1 && tmin_c !== -1 && tmax_c !== -1;

    this.categories = [];
    this.rfData = [];
    this.tmeanData = [];
    this.tminData = [];
    this.tmaxData = [];

    rows.slice(1).forEach((row) => {
      const columns = row.split(',');
      if (columns.length <= monthIndex) return;

      const month = columns[monthIndex];
      const rf = parseFloat(this.selectedUnit === 'metric' ? columns[rf_mm] : columns[rf_in]);

      if (!isNaN(rf)) {
        this.categories.push(month);
        this.rfData.push(rf);
      }

      if (hasTemperature) {
        const tmean = parseFloat(this.selectedUnit === 'metric'  ? columns[tmean_c] : columns[tmean_f]);
        const tmin = parseFloat(this.selectedUnit === 'metric'  ? columns[tmin_c] : columns[tmin_f]);
        const tmax = parseFloat(this.selectedUnit === 'metric' ? columns[tmax_c] : columns[tmax_f]);

        if (!isNaN(tmean) && !isNaN(tmin) && !isNaN(tmax)) {
          this.tmeanData.push(tmean);
          this.tminData.push(tmin);
          this.tmaxData.push(tmax);
        }
      }
    });

    return hasTemperature; // Ensure function always returns a boolean
  }


  createChart(hasTemperature: boolean): void {
    const series: Highcharts.SeriesOptionsType[] = [
      {
        type: 'column',
        name: `Rainfall (${this.selectedUnit === 'metric' ? 'mm' : 'in'})`,
        data: this.rfData,
        yAxis: 0,
        tooltip: {
          valueSuffix: this.selectedUnit === 'metric'  ? ' mm' : ' in',
        },
      },
    ];

    const yAxis: Highcharts.YAxisOptions[] = [
      {
        labels: {
          format: `{value} ${this.selectedUnit === 'metric'  ? 'mm' : 'in'}`,
        },
        title: {
          text: `Rainfall (${this.selectedUnit === 'metric'  ? 'mm' : 'in'})`,
        },
        opposite: true,
      },
    ];

    if (hasTemperature) {
      series.push(
        {
          type: 'line',
          name: `Mean Temperature (${this.selectedUnit === 'metric' ? '°C' : '°F'})`,
          data: this.tmeanData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.selectedUnit === 'metric' ? ' °C' : ' °F',
          },
        },
        {
          type: 'line',
          name: `Minimum Temperature (${this.selectedUnit === 'metric' ? '°C' : '°F'})`,
          data: this.tminData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.selectedUnit === 'metric' ? ' °C' : ' °F',
          },
        },
        {
          type: 'line',
          name: `Maximum Temperature (${this.selectedUnit === 'metric' ? '°C' : '°F'})`,
          data: this.tmaxData,
          yAxis: 1,
          tooltip: {
            valueSuffix: this.selectedUnit === 'metric' ? ' °C' : ' °F',
          },
        }
      );

      yAxis.push({
        title: {
          text: `Temperature (${this.selectedUnit === 'metric' ? '°C' : '°F'})`,
        },
        labels: {
          format: `{value} ${this.selectedUnit === 'metric' ? '°C' : '°F'}`,
        },
      });
    }

    const chartOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        height: '45%',
      },
      title: {
        text: '',
      },
      xAxis: {
        categories: this.categories,
        crosshair: true,
      },
      yAxis: yAxis,
      tooltip: {
        shared: true,
      },
      legend: {
        floating: false,
        verticalAlign: 'top',
        align: 'center',
        layout: 'horizontal',
        itemMarginTop: 5,
      },
      series: series,
    };

    const chartContainer = document.getElementById('climatologyChart');
    if (chartContainer) {
      this.chart = Highcharts.chart(chartContainer, chartOptions);
    } else {
      console.error('Chart container not found!');
    }
  }


  onUnitChange(): void {
    this.rfData = [];
    this.tmeanData = [];
    this.tminData = [];
    this.tmaxData = [];
    this.categories = [];
    this.loadCSVData(this.stationId);
  }

}
