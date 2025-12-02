import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ErrorReportService } from '../services/error-report.service';
import { CommonModule } from '@angular/common';

interface StationMeta {
  station_id: string;
  name: string;
  status: string;
}

@Component({
  selector: 'app-error-reporting',
  standalone: true,
  imports: [FormsModule, HttpClientModule, CommonModule],
  templateUrl: './error-reporting.component.html',
  styleUrls: ['./error-reporting.component.css']
})
export class ErrorReportingComponent {

  stations: StationMeta[] = [];
  filteredStations: StationMeta[] = [];
  dropdownOpen = false;
  stationSearch = '';

  formData = {
    username: '',
    stationNumber: '',
    variableId: '',
    startDate: '',
    endDate: '',
    notes: ''
  };

  private stationCsvUrl =
    'https://raw.githubusercontent.com/HCDP/loggernet_station_data/refs/heads/db-old/csv_data/stations/station_metadata.csv';

  constructor(
    private http: HttpClient,
    private errorService: ErrorReportService
  ) {
    this.loadStations();
  }

  loadStations() {
    this.http.get(this.stationCsvUrl, { responseType: 'text' })
      .subscribe(csv => {
        const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
        const header = lines[0].split(',');

        const parsed = lines.slice(1).map(line => {
          const cols = line.split(',');
          const obj: any = {};
          header.forEach((h, i) => obj[h] = cols[i]);
          return obj;
        });

        const active = parsed.filter((s: any) => s.status === 'active');
        this.stations = active;
        this.filteredStations = active;
      });
  }

  filterStations() {
    const q = this.stationSearch.toLowerCase();
    this.filteredStations = this.stations.filter(st =>
      st.station_id.includes(q) ||
      st.name.toLowerCase().includes(q)
    );
  }

  selectStation(st: StationMeta) {
    this.formData.stationNumber = st.station_id;
    this.dropdownOpen = false;
  }

  submitForm() {
    this.errorService.add(this.formData);
    alert('Submitted. CSV available at /records.csv');
    this.formData = {
      username: '',
      stationNumber: '',
      variableId: '',
      startDate: '',
      endDate: '',
      notes: ''
    };
  }
}
