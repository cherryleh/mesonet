import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, tap } from 'rxjs';
import { parse } from 'papaparse';
@Injectable({
  providedIn: 'root'
})
export class StationDataService {
  private csvUrl = 'https://raw.githubusercontent.com/HCDP/loggernet_station_data/refs/heads/main/csv_data/stations/station_metadata.csv';
  private cache: any[] | null = null; // in-memory cache

  constructor(private http: HttpClient) {}

  getStationData(id: string): Observable<any[]> {
    // If we already fetched the CSV, reuse it
    if (this.cache) {
      return of(this.cache.filter(row => row.station_id === id));
    }

    // Otherwise fetch and cache it
    return this.http.get(this.csvUrl, { responseType: 'text' }).pipe(
      map(csvText => {
        const parsed = parse(csvText, { header: true, skipEmptyLines: true }).data as any[];
        this.cache = parsed; // cache for reuse
        return parsed.filter(row => row.station_id === id);
      })
    );
  }
}
