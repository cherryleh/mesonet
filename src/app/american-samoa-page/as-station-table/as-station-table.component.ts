import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-as-station-table',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './as-station-table.component.html',
  styleUrl: './as-station-table.component.css'
})
export class AsStationTableComponent {
  displayedColumns: string[] = ['id', 'name', 'lat', 'lng', 'elevation', 'type'];
  dataSource = new MatTableDataSource<any>([]); 
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {}

  ngOnInit(): void {
    this.fetchStationData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async fetchStationData(): Promise<void> {
    const apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?location=american_samoa';
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
      console.log('Fetched data:', responseData);
      this.dataSource.data = responseData; // Update data source
    } catch (error) {
      console.error('Error fetching station data:', error);
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
