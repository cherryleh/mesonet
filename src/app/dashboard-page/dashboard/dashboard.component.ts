import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { Chart, registerables } from 'chart.js';
import { StationTitleComponent } from '../../station-title/station-title.component';
import { DataService } from '../../services/dashboard-data.service';
import { DatePipe } from '@angular/common';

import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component'; 
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
  dataVariables: string[] = ['Rainfall', 'Temperature', 'Wind Speed', 'Wind Direction', 'Soil Moisture', 'Solar Radiation', 'Relative Humidity'];


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
    'Wind Direction': 'WDrs_1_Avg',
    'Relative Humidity': 'RH_1_Avg'
  };

  objectKeys = Object.keys;

  fetchData(id: string): void {
    this.dataService.getData(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.length > 0) {
          this.latestTimestamp = response[0].timestamp;
          console.log('Latest Timestamp ',this.latestTimestamp )
        }

        Object.keys(this.variableMapping).forEach((key) => {
          const variableData = response.find(
            (item: any) => item.variable === this.variableMapping[key]
          );

          console.log(`Key: ${key}, Variable: ${this.variableMapping[key]}, Data:`, variableData);

          if (key === 'Temperature' && variableData) {
            const celsius = parseFloat(variableData.value);
            const fahrenheit = (celsius * 1.8) + 32;
            this.variables[key] = `${fahrenheit.toFixed(1)}`;
          } 
          else if(key === 'Wind Speed' && variableData){
            const mps = parseFloat(variableData.value);
            const mph = mps * 2.23694;
            this.variables[key] = `${mph.toFixed(1)}`;
          }
          else if (key === 'Wind Direction' && variableData) {
            const degrees = parseFloat(variableData.value);
            this.variables[key] = this.windDirectionToCardinal(degrees);
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

    this.dataService.get24HourRainfall(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rainfallData: { value: string }[]) => {
        if (rainfallData.length > 0) {
          const totalMM = rainfallData.reduce((sum: number, item: { value: string }) => 
            sum + parseFloat(item.value || '0'), 0);
          const totalInches = totalMM / 25.4;
          this.variables['Rainfall'] = `${totalInches.toFixed(2)}`;
        } else {
          this.variables['Rainfall'] = '0.00';
        }
      },
      error: (error) => {
        console.error('Error fetching 24-hour rainfall:', error);
      }
    });

  }


  windDirectionToCardinal(degrees: number): string {
    const directions = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"
    ];
  
    const index = Math.round(degrees / 22.5) % 16;
    console.log('Wind direction index:', index);
    return directions[index];
  }


  getFormattedTimestamp(): string {
    if (!this.latestTimestamp) {
      return 'No timestamp available';
    }

    // Extract time from timestamp string (HH:MM)
    const match = this.latestTimestamp.match(/T(\d{2}):(\d{2})/);

    if (!match) {
      return 'Invalid timestamp format';
    }

    let hours = parseInt(match[1], 10);
    let minutes = match[2];

    // Convert 24-hour format to 12-hour AM/PM format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for AM case

    return `${displayHours}:${minutes} ${ampm}`;
  }


  ngAfterViewInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.id = params['id'];
      if (this.id) {
        this.fetchData(this.id);
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
      return; 
    }

    this.queryData(); 

    clearTimeout(this.refreshTimeout); 

    if (!this.isDestroyed) {
      this.refreshTimeout = setTimeout(() => {
        this.updateData(); 
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
    this.isDestroyed = true; 
    clearTimeout(this.refreshTimeout);
    this.destroy$.next();
    this.destroy$.complete();
  }

}
