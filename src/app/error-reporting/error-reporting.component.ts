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

  formData: {
    username: string;
    screenStartDate: string;
    screenEndDate: string;
    stationNumber: string;
    variableId: string[];
    startDate: string;
    endDate: string;
    notes: string;
  } = {
    username: '',
    screenStartDate: '',
    screenEndDate: '',
    stationNumber: '',
    variableId: [],
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

  public variableList: string[] = [
    "Incoming Solar Radiation (W/m2) - 'SWin_1_Avg'",
    "Outgoing Solar Radiation (W/m2) - 'SWout_1_Avg'",
    "Incoming Longwave Radiation (W/m2) - 'LWin_1_Avg'",
    "Outgoing Longwave Radiation (W/m2) - 'LWout_1_Avg'",
    "Net Solar Radiation (W/m2) - 'SWnet_1_Avg'",
    "Net Longwave Radiation (W/m2) - 'LWnet_1_Avg'",
    "Net Radiation (W/m2) - 'Rnet_1_Avg'",
    "Albedo - 'Albedo_1_Avg'",
    "Surface Temperature (C) - 'Tsrf_1_Avg'",
    "Sky Temperature (C) - 'Tsky_1_Avg'",

    "Temperature Sensor 1 (C) - 'Tair_1_Avg'",
    "Temperature Sensor 2 (C) - 'Tair_2_Avg'",

    "Relative Humidity Sensor 1 (%) - 'RH_1_Avg'",
    "Relative Humidity Sensor 2 (%) - 'RH_2_Avg'",

    "Vapor Pressure Sensor 1 (hPa) - 'VP_1_Avg'",
    "Vapor Pressure Sensor 2 (hPa) - 'VP_2_Avg'",

    "Saturation Vapor Pressure Sensor 1 (hPa) - 'VPsat_1_Avg'",
    "Saturation Vapor Pressure Sensor 2 (hPa) - 'VPsat_2_Avg'",

    "Vapor Pressure Deficit Sensor 1 (hPa) - 'VPD_1_Avg'",
    "Vapor Pressure Deficit Sensor 2 (hPa) - 'VPD_2_Avg'",

    "Wind Speed (m/s) - 'WS_1_Avg'",
    "Wind Direction (degrees) - 'WDrs_1_Avg'",

    "Pressure (kPa) - 'P_1'",
    "Sea Level Pressure (hPa) - 'Psl_1'",

    "Soil Temperature 1 (C) - 'Tsoil_1_Avg'",
    "Soil Temperature 2 (C) - 'Tsoil_2'",
    "Soil Temperature 3 (C) - 'Tsoil_3'",
    "Soil Temperature 4 (C) - 'Tsoil_4'",

    "Soil Moisture 1 (%) - 'SM_1_Avg'",
    "Soil Moisture 2 (%) - 'SM_2_Avg'",
    "Soil Moisture 3 (%) - 'SM_3_Avg'",

    "Soil Heat Flux (W/m2) - 'SHFsrf_1_Avg'",

    "Rainfall (mm) - 'RF_1_Tot300s'",
    "Rainfall Intensity (mm/hr) - 'RFint_1_Max'"
  ];


  filteredVariables: string[] = [...this.variableList];
  variableSearch = '';
  varDropdownOpen = false;

  filterVariables() {
    const q = this.variableSearch.toLowerCase();
    this.filteredVariables = this.variableList.filter(v =>
      v.toLowerCase().includes(q)
    );
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
    this.submitToGoogleSheet(this.formData)
    .then(() => {
      alert('Report submitted successfully.');

      this.formData = {
        username: '',
        screenStartDate: '',
        screenEndDate: '',
        stationNumber: '',
        variableId: [],
        startDate: '',
        endDate: '',
        notes: ''
      };
    })
    .catch(() => {
      alert('Submission failed. Please try again.');
    });
  
  }
  toggleVariable(v: string) {
    if (this.formData.variableId.includes(v)) {
      this.formData.variableId = this.formData.variableId.filter(x => x !== v);
    } else {
      this.formData.variableId.push(v);
    }
  }


  submitToGoogleSheet(record: any) {
    const url = 'https://script.google.com/macros/s/AKfycbybVw0OZ7Lw7nL1Ryb03co8u5_sq_jZmV7J8m2l4erqq_1jrrL63pS-qMbJuACsaXKq/exec';

  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(record)
  }).then(() => {});
  }
}
