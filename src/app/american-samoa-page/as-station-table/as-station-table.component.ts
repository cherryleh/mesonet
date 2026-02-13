import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MatSort, MatSortModule } from '@angular/material/sort';
import * as Papa from 'papaparse';

type StationRow = {
  station_id: string;
  status: string;
  full_name: string;
  lat: number;
  lng: number;
  elevation: number;
};

@Component({
  selector: 'app-as-station-table',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule
  ],
  templateUrl: './as-station-table.component.html',
  styleUrl: './as-station-table.component.css'
})
export class AsStationTableComponent {
  displayedColumns: string[] = ['id', 'name', 'lat', 'lng', 'elevation', 'type'];
  dataSource = new MatTableDataSource<any>([]);
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  constructor() {}

  ngOnInit(): void {
    this.fetchStationData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async fetchStationData(): Promise<void> {
    const csvUrl =
      `https://raw.githubusercontent.com/HCDP/loggernet_station_data/refs/heads/main/csv_data/stations/station_metadata.csv?t=${Date.now()}`;

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const rows = (results.data ?? []) as any[];

        const parsed: StationRow[] = rows
          .map((r) => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lng);
            const elevation = r.elevation !== undefined && r.elevation !== null && r.elevation !== ''
              ? parseFloat(r.elevation)
              : NaN;

            return {
              station_id: (r.station_id ?? '').toString().trim(),
              status: (r.status ?? '').toString().trim(),
              full_name: (r.full_name ?? r.name ?? '').toString().trim(),
              lat,
              lng,
              elevation: isNaN(elevation) ? NaN : elevation,
            };
          })
          .filter((s) => s.station_id && s.station_id.startsWith('1'))
          .filter((s) => s.station_id && !isNaN(s.lat) && !isNaN(s.lng));

        this.dataSource.data = parsed;

        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => {
        console.error('Error loading station CSV:', err);
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
