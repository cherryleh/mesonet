import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { Chart, registerables } from 'chart.js';

import { DataService } from '../data.service';
import { StationDataService } from '../station-data.service';
import { DatePipe } from '@angular/common';

export interface Tile {
  color: string;
  cols: number;
  rows: number;
  text: string;
  variableKey?: string | null; // Add this property
}


/**
 * @title Dynamic grid-list
 */


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatGridListModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [DatePipe]
})
export class DashboardComponent implements AfterViewInit {
  columnCount = 2;
  rowCount = 2;

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
    private datePipe: DatePipe) {
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

  tiles: Tile[] = [
    { text: 'Graph', cols: 8, rows: 6, color: 'lightblue', variableKey: null },
    { text: 'Hourly Rainfall', cols: this.columnCount, rows: this.rowCount, color: 'lightpink', variableKey: 'Rainfall' },
    { text: 'Air Temperature', cols: this.columnCount, rows: this.rowCount, color: 'lightpink', variableKey: 'Temperature' },
    { text: 'Wind', cols: this.columnCount, rows: this.rowCount, color: 'lightpink', variableKey: 'Wind Speed' },
    { text: 'Soil Moisture', cols: this.columnCount, rows: this.rowCount, color: '#DDBDF1', variableKey: 'Soil Moisture' },
    { text: 'Relative Humidity', cols: this.columnCount, rows: this.rowCount, color: '#DDBDF1', variableKey: 'Relative Humidity' },
    { text: 'Solar Radiation', cols: this.columnCount, rows: this.rowCount, color: '#DDBDF1', variableKey: 'Solar Radiation' },
  ];


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
            this.variables[key] = `${fahrenheit.toFixed(1)} °F`;
          } 
          else if(key === 'Rainfall'&& variableData){
            const mm = parseFloat(variableData.value);
            const inches = (mm)/25.4;
            this.variables[key] = `${inches.toFixed(1)} in`;
          }
          else if(key === 'Wind Speed'&& variableData){
            const mps = parseFloat(variableData.value);
            const mph = mps * 2.23694;
            this.variables[key] = `${mph.toFixed(1)} mph`;
          }
          else if (key=='Soil Moisture' && variableData){
            const sm_dec = parseFloat(variableData.value);
            const sm_pct = sm_dec * 100;
            this.variables[key] = `${Math.round(sm_pct)}%`;
          }
          else if (key=='Relative Humidity' && variableData){
            this.variables[key] = `${Math.round(variableData.value)}%`;
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
}
