import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-station-table',
  standalone: true,
  templateUrl: './station-table.component.html',
  styleUrls: ['./station-table.component.css'],
  imports: [
    FormsModule,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule
  ],
})
export class StationTableComponent implements OnInit {
  displayedColumns: string[] = ['id', 'status','full_name', 'island', 'lat', 'lng','elevation']; // Define columns to display
  dataSource = new MatTableDataSource<any>([]); // Initialize data source
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  constructor() {}

  ngOnInit(): void {
    this.fetchStationData();

    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'island') {
        return this.getIsland(item.station_id); // use derived value
      }
      return item[property];
    };
  }


  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator; 
    this.dataSource.sort = this.sort; 
  }

  async fetchStationData(): Promise<void> {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=hawaii';
    const apiToken = environment.apiToken;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // Filter out stations with missing lat or lng
      const filteredData = responseData.filter(
        (station: any) => station.lat !== null && station.lng !== null
      );

      console.log('Filtered data:', filteredData);
      this.dataSource.data = filteredData;

      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  getStationUrl(element: any): string {
    const status = element.status?.toLowerCase();
    const id = element.station_id;

    if (status === 'planned') {
      return `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/station-info?id=${id}`;
    } else if (status === 'inactive') {
      return `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/graphing?id=${id}`;
    } else {
      return `https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#/dashboard?id=${id}`;
    }
  }

  getStatusColor(status: string): string {
    const normalized = status?.toLowerCase();
    if (normalized === 'planned') return 'orange';
    if (normalized === 'inactive') return 'gray';
    return 'green'; // treating "active" and others as green
  }


  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getIsland(stationId: string): string {
    if (!stationId) return '';
    const firstDigit = stationId[1];
    switch (firstDigit) {
      case '1': return 'Maui';
      case '2': return 'Hawaii';
      case '4': return 'Molokai';
      case '5': return 'Oahu';
      case '6': return 'Kauai';
      default: return 'Unknown';
    }
  }

}
