import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
  displayedColumns: string[] = ['id', 'status', 'full_name', 'island', 'lat', 'lng', 'elevation'];
  dataSource = new MatTableDataSource<StationRow>([]);
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item: StationRow, property: string) => {
      if (property === 'island') return this.getIsland(item.station_id);

      return (item as any)[property];
    };

    this.dataSource.filterPredicate = (data: StationRow, filter: string) => {
      const f = this.normalizeForSearch(filter);
      const fields = [
        data.station_id,
        data.status,
        data.full_name,
        this.getIsland(data.station_id),
        data.lat,
        data.lng,
        data.elevation,
      ];
      return fields.some((v) => this.normalizeForSearch(String(v ?? '')).includes(f));
    };

    this.fetchStationDataFromCsv();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  fetchStationDataFromCsv(): void {
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
          .filter((s) => s.station_id && s.station_id.startsWith('0'))
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

  getStationUrl(element: StationRow): string {
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
    return 'green';
  }

  // Lowercase and strip Hawaiian diacriticals (kahakō and other accents via
  // Unicode decomposition, plus ʻokina and apostrophe-like characters) so
  // "Kaneohe" matches "Kāneʻohe".
  private normalizeForSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u02BB\u02BC\u2018\u2019'`]/g, '')
      .trim()
      .toLowerCase();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value ?? '';
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
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
