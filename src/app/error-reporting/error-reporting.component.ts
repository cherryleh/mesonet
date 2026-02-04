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
    flag: string;
    severity: '' | 'suspect' | 'bad';
    notes: string;
  } = {
    username: '',
    screenStartDate: '',
    screenEndDate: '',
    stationNumber: '',
    variableId: [],
    startDate: '',
    endDate: '',
    flag: '',
    severity: '',
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

  public flagOptions: string[] = [
    "No flags - screening period clean",
    "No data (blank, NaN, other missing code)",
    "Out of range - high",
    "Out of range - low",
    "Inconsistent with related variable(s)",
    "Inconsistent with nearby station",
    "Timestamp error",
    "Stuck at a constant value",
    "Clogged rain gauge",
    "Upspike",
    "Downspike",
    "Erratic",
    "Other"
  ];

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
  authorized = false;
  passwordInput = '';
  authError = false;

  private readonly PAGE_PWRD = 'Halenet1988';

  checkPassword() {
    if (this.passwordInput === this.PAGE_PWRD) {
      this.authorized = true;
      this.authError = false;
    } else {
      this.authError = true;
    }
  }

  public severityOptions: Array<'suspect' | 'bad'> = ['suspect', 'bad'];

  private readonly FLAGS_REQUIRING_SEVERITY = new Set<string>([
    'Out of range - high',
    'Out of range - low',
    'Inconsistent with related variable(s)',
    'Inconsistent with nearby station'
  ]);

  severityRequired(): boolean {
    return this.FLAGS_REQUIRING_SEVERITY.has(this.formData.flag);
  }


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

    if (!this.hasRequiredFields()) {
      alert(
        'Please complete all required fields: Username, Station, Variable, and Flag Start Date.'
      );
      return;
    }

    if (!this.isFlagDateWithinScreening()) {
      alert(
        'Flag start and end dates must fall within the screening date range.'
      );
      return;
    }

    this.submitToGoogleSheet(this.formData);

    alert('Report submitted successfully.');

    this.formData = {
      username: this.formData.username,
      screenStartDate: this.formData.screenStartDate,
      screenEndDate: this.formData.screenEndDate,
      stationNumber: this.formData.stationNumber,
      variableId: [],
      startDate: '',
      endDate: '',
      flag: '',
      severity: '',
      notes: ''
    };
  }


  toggleVariable(v: string) {
    const match = v.match(/'([^']+)'/);
    const id = match ? match[1] : v; 

    if (this.formData.variableId.includes(id)) {
      this.formData.variableId = this.formData.variableId.filter(x => x !== id);
    } else {
      this.formData.variableId.push(id);
    }
  }

  submitToGoogleSheet(record: any) {
    const url =
      'https://script.google.com/macros/s/AKfycbybVw0OZ7Lw7nL1Ryb03co8u5_sq_jZmV7J8m2l4erqq_1jrrL63pS-qMbJuACsaXKq/exec';

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(record),
      keepalive: true
    }).catch(() => {
    });
  }

  private isFlagDateWithinScreening(): boolean {
    const {
      screenStartDate,
      screenEndDate,
      startDate,
      endDate
    } = this.formData;

    if (!screenStartDate || !screenEndDate || !startDate || !endDate) {
      return true; 
    }

    const screenStart = new Date(screenStartDate);
    const screenEnd   = new Date(screenEndDate);
    const flagStart   = new Date(startDate);
    const flagEnd     = new Date(endDate);

    return (
      flagStart >= screenStart &&
      flagEnd   <= screenEnd &&
      flagStart <= flagEnd
    );
  }

  private hasRequiredFields(): boolean {
    const {
      username,
      stationNumber,
      variableId,
      flag
    } = this.formData;

    return (
      !!username?.trim() &&
      !!stationNumber &&
      Array.isArray(variableId) &&
      variableId.length > 0 &&
      !!flag
    );
  }

  selectAllVariables(checked: boolean) {
    if (checked) {
      this.formData.variableId = [...this.variableList];
    } else {
      this.formData.variableId = [];
    }
  }


  allVariablesSelected(): boolean {
    return (
      this.formData.variableId.length === this.variableList.length
    );
  }

  getVariableSummary(): string {
    const selected = this.formData.variableId;
    const total = this.variableList.length;

    if (!selected || selected.length === 0) {
      return 'Select variables...';
    }

    if (selected.length === total) {
      return `${total} variables selected`;
    }

    if (selected.length <= 3) {
      return selected.join(', ');
    }

    return `${selected.length} variables selected`;
  }




}
