import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { Chart, registerables } from 'chart.js';
import { StationTitleComponent } from '../../station-title/station-title.component';
import { DataService } from '../../services/dashboard-data.service';
import { DatePipe } from '@angular/common';

import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component'; // Import the standalone component
import { HeaderComponent } from '../../header/header.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { DurationSelectorComponent } from '../duration-selector/duration-selector.component';

import { aggregateService } from '../../services/aggregate.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatGridListModule,
    DashboardChartComponent,
    HeaderComponent,
    SidebarComponent,
    DurationSelectorComponent,
    StationTitleComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [DatePipe]
})
export class DashboardComponent implements AfterViewInit {
  private refreshTimeout: any;
  private destroy$ = new Subject<void>();
  private isDestroyed = false; 

  totalRainfall: number = 0;
  meanTemp: number = 0;
  minTemp: number = 0;
  maxTemp: number = 0;
  meanSolarRad: number = 0;
  duration: string = '24-hour'; // Default duration
  refreshIntervalMS = 300000;
  dataVariables: string[] = ['Rainfall', 'Temperature', 'Wind Speed', 'Soil Moisture', 'Solar Radiation', 'Relative Humidity'];


  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
  
  id: string | null = null; 
  latestTimestamp: string | null = null;
  variables: { [key: string]: string | null } = {
    Rainfall: null,
    Temperature: null,
  };

  stationName: string = ''; 

  constructor(private route: ActivatedRoute,
    private dataService: DataService,
    private datePipe: DatePipe,
    private aggregateService: aggregateService ) {
    Chart.register(...registerables);
  }

  private variableMapping: { [key: string]: string } = {
    Rainfall: 'RF_1_Tot300s',
    Temperature: 'Tair_1_Avg',
    'Solar Radiation': 'SWin_1_Avg',
    'Soil Moisture': 'SM_1_Avg',
    'Wind Speed': 'WS_1_Avg',
    'Relative Humidity': 'RH_1_Avg'
  };

  objectKeys = Object.keys;

  fetchData(id: string): void {
    this.dataService.getData(id).pipe(
      takeUntil(this.destroy$) 
    ).subscribe({
      next: (response) => {
        if (response.length > 0) {
          this.latestTimestamp = response[0].timestamp;
        }

        Object.keys(this.variableMapping).forEach((key) => {
          const variableData = response.find(
            (item: any) => item.variable === this.variableMapping[key]
          );
          if (key === 'Temperature' && variableData) {
            const celsius = parseFloat(variableData.value);
            const fahrenheit = (celsius * 1.8) + 32;
            this.variables[key] = `${fahrenheit.toFixed(1)}`;
          } 
          else if(key === 'Rainfall' && variableData){
            const mm = parseFloat(variableData.value);
            const inches = (mm)/25.4;
            this.variables[key] = `${inches.toFixed(1)}`;
          }
          else if(key === 'Wind Speed' && variableData){
            const mps = parseFloat(variableData.value);
            const mph = mps * 2.23694;
            this.variables[key] = `${mph.toFixed(1)}`;
          }
          else if (key === 'Soil Moisture' && variableData){
            const sm_dec = parseFloat(variableData.value);
            const sm_pct = sm_dec * 100;
            this.variables[key] = `${Math.round(sm_pct)}`;
          }
          else if (key === 'Relative Humidity' && variableData){
            this.variables[key] = `${Math.round(variableData.value)}`;
          }
          else if (key === 'Solar Radiation' && variableData){
            this.variables[key] = `${Math.round(variableData.value)}`;
          }
          else {
            this.variables[key] = variableData ? variableData.value : 'N/A';
          }
        });
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });

    
  }

  getFormattedTimestamp(): string {
    return this.latestTimestamp
      ? this.datePipe.transform(this.latestTimestamp, 'MMM d, y, h:mm a') || ''
      : 'No timestamp available';
  }

  ngAfterViewInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.id = params['id'];
      if (this.id) {
        this.fetchData(this.id); // Fetch initial data
      }
    });
  }


  ngOnInit(): void {
    this.aggregateService.totalRainfall$.subscribe((totalRain: number) => {
      this.totalRainfall = totalRain;
    });
    this.aggregateService.meanTemp$.subscribe((meanTemp: number) => {
      this.meanTemp = meanTemp;
    });
    this.aggregateService.minTemp$.subscribe((minTemp: number) => {
      this.minTemp = minTemp;
    });
    this.aggregateService.maxTemp$.subscribe((maxTemp: number) => {
      this.maxTemp = maxTemp;
    });
    this.aggregateService.meanSolarRad$.subscribe((meanSolarRad: number) => {
      this.meanSolarRad = meanSolarRad;
    });

    this.aggregateService.durationText$.subscribe((durationText: string) => {
      this.duration = durationText;
    });

    this.updateData();
  }

  queryData(): void {
    if (this.id) {
      console.log('Fetching data for ID:', this.id);
      this.fetchData(this.id);
    } else {
      console.error('ID is not available to query data.');
    }
  }

  updateData(): void {
    if (this.isDestroyed || !this.id) {
      console.log('Component is destroyed or no ID available. Stopping updates.');
      return; // Exit early if the component is destroyed
    }

    this.queryData(); // Fetch data

    clearTimeout(this.refreshTimeout); // Clear any previous timeout

    // Schedule the next update ONLY if the component is still active
    if (!this.isDestroyed) {
      this.refreshTimeout = setTimeout(() => {
        this.updateData(); // Recursive update
      }, this.refreshIntervalMS);
    }
  }


  getProgressValue(variableKey: string): number {
    if (variableKey && this.variables[variableKey]) {
      const value = parseFloat(this.variables[variableKey]?.replace(/[^\d.]/g, '') || '0');
      return isNaN(value) ? 0 : value;
    }
    return 0;
  }

  ngOnDestroy(): void {
    console.log('Dashboard component destroyed. Clearing refresh timer and canceling HTTP requests.');
    this.isDestroyed = true; // Prevent further updates
    clearTimeout(this.refreshTimeout); // Stop periodic updates
    this.destroy$.next(); // Cancel HTTP requests
    this.destroy$.complete(); // Complete the subject
  }

}
