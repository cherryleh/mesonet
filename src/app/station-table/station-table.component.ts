import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';  // Import environment
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-station-table',
  standalone:true,
  templateUrl: './station-table.component.html',
  styleUrls: ['./station-table.component.css'],
  imports: [FormsModule,CommonModule]
})
export class StationTableComponent implements OnInit {
  data: any[] = [];
  filteredData: any[] = [];
  searchTerm: string = '';

  constructor() { }

  ngOnInit(): void {
    this.fetchStationData();
  }

  // Fetch data using fetch API
  async fetchStationData(): Promise<void> {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations'; // Get the API URL from the environment
    const apiToken = environment.apiToken; // Get the API token from the environment

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`, // Add the Authorization header with the token
          'Content-Type': 'application/json'
        }
      });

      // Check if the response is OK (status 200)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Fetched data:', responseData);
      this.data = responseData;  // Store the fetched data
      this.filteredData = responseData;  // Initialize filtered data
    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  // Filter data based on search input
  onSearch(): void {
    if (this.searchTerm) {
      this.filteredData = this.data.filter(item => {
        return Object.values(item).some((value: unknown) => {
          // Assert that value is a string
          return (value as string).toString().toLowerCase().includes(this.searchTerm.toLowerCase());
        });
      });
    } else {
      this.filteredData = this.data;
    }
  }

}
