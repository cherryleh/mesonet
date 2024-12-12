import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { Chart, registerables } from 'chart.js';

import { DataService } from '../data.service';
import { StationDataService } from '../station-data.service';
import { DatePipe } from '@angular/common';

import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component'; // Import the standalone component
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

import { CumulativeService } from '../../cumulative.service';
/**
 * @title Dynamic grid-list
 */


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatGridListModule,
    DashboardChartComponent,
    HeaderComponent,
    SidebarComponent
  ],
  templateUrl: './dashboard-2.component.html',
  styleUrls: ['./dashboard-2.component.css'],
  providers: [DatePipe]
})
export class Dashboard2Component implements AfterViewInit {
  totalRainfall: number = 0;
  refreshIntervalMS = 30000;
  dataVariables: string[] = ['Rainfall', 'Temperature', 'Wind Speed', 'Soil Moisture', 'Solar Radiation', 'Relative Humidity'];

  id: string | null = null; // Added 'id' property
  latestTimestamp: string | null = null;
  variables: { [key: string]: string | null } = {
    Rainfall: null,
    Temperature: null,
  };

  stationName: string = ''; 

  constructor(private route: ActivatedRoute,
    private dataService: DataService,
    private stationDataService: StationDataService,
    private datePipe: DatePipe,
    private CumulativeService: CumulativeService ) {
    // Register all necessary Chart.js components
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
    this.dataService.getData(id).subscribe({
      next: (response) => {
        if (response.length > 0) {
          // Assume all timestamps are the same; get the first one
          this.latestTimestamp = response[0].timestamp;
        }

        // Populate the variables object based on the response
        Object.keys(this.variableMapping).forEach((key) => {
          const variableData = response.find(
            (item: any) => item.variable === this.variableMapping[key]
          );
          if (key === 'Temperature' && variableData) {
            // Convert temperature to Fahrenheit if key is 'Temperature'
            const celsius = parseFloat(variableData.value);
            const fahrenheit = (celsius * 1.8) + 32;
            this.variables[key] = `${fahrenheit.toFixed(1)}`;
          } 
          else if(key === 'Rainfall'&& variableData){
            const mm = parseFloat(variableData.value);
            const inches = (mm)/25.4;
            this.variables[key] = `${inches.toFixed(1)}`;
          }
          else if(key === 'Wind Speed'&& variableData){
            const mps = parseFloat(variableData.value);
            const mph = mps * 2.23694;
            this.variables[key] = `${mph.toFixed(1)}`;
          }
          else if (key=='Soil Moisture' && variableData){
            const sm_dec = parseFloat(variableData.value);
            const sm_pct = sm_dec * 100;
            this.variables[key] = `${Math.round(sm_pct)}`;
          }
          else if (key=='Relative Humidity' && variableData){
            this.variables[key] = `${Math.round(variableData.value)}`;
          }
          else if (key=='Solar Radiation' && variableData){
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

    this.stationDataService.getData(id).subscribe({
      next: (response) => {
        if (response.length > 0) {
          // Extract and assign the station name to the component property
          this.stationName = response[0].name;
          console.log('Station Name:', this.stationName); // Debugging log
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });


  }

  getFormattedTimestamp(): string {
    return this.latestTimestamp
      ? this.datePipe.transform(this.latestTimestamp, 'MMM d, y, h:mm a') || ''
      : 'No timestamp available';
  }

  ngAfterViewInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id = params['id'];
      if (this.id) {
        // Call the dataService with the id once it's captured
        this.fetchData(this.id);
        console.log(this.id)
      }
    });

  }

  ngOnInit(): void {
    this.CumulativeService.totalRainfall$.subscribe((total: number) => {
      this.totalRainfall = total;
      console.log('Dashboard Total Rainfall (in):', this.totalRainfall);
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
    this.queryData();
    setTimeout(() => {
      this.updateData();
    }, this.refreshIntervalMS);
  }


  getProgressValue(variableKey: string): number {
    if (variableKey && this.variables[variableKey]) {
      const value = parseFloat(this.variables[variableKey]?.replace(/[^\d.]/g, '') || '0');
      return isNaN(value) ? 0 : value; // Remove units and convert to a number
    }
    return 0;
  }


}
