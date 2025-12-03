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
    stationNumber: string;
    variableId: string[];
    startDate: string;
    endDate: string;
    notes: string;
  } = {
    username: '',
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

  variableList: string[] = [
    "SWin_1_Avg","SWout_1_Avg","LWin_1_Avg","LWout_1_Avg","SWnet_1_Avg",
    "LWnet_1_Avg","Rnet_1_Avg","Albedo_1_Avg","Tsrf_1_Avg","Tsky_1_Avg",
    "Tair_1_Avg","Tair_2_Avg","RH_1_Avg","RH_2_Avg","VP_1_Avg",
    "VP_2_Avg","VPsat_1_Avg","VPsat_2_Avg","VPD_1_Avg","VPD_2_Avg",
    "WS_1_Avg","WDrs_1_Avg","P_1","Psl_1","Tsoil_1_Avg",
    "SHFsrf_1_Avg","SM_1_Avg","SM_2_Avg","SM_3_Avg",
    "Tsoil_2","Tsoil_3","Tsoil_4","RF_1_Tot300s","RFint_1_Max"
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
    this.submitToGoogleSheet(this.formData);

    this.formData = {
      username: '',
      stationNumber: '',
      variableId: [] as string[],
      startDate: '',
      endDate: '',
      notes: ''
    };
  }
  toggleVariable(v: string) {
    if (this.formData.variableId.includes(v)) {
      this.formData.variableId = this.formData.variableId.filter(x => x !== v);
    } else {
      this.formData.variableId.push(v);
    }
  }


  submitToGoogleSheet(record: any) {
    const url = 'https://script.google.com/macros/s/AKfycbzT1GnXos5ahoeJAyDTBx73NmntjIovI49UbYgs_HM9RUK0cPpxaNIHUosD40EE9U6Q/exec';

    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });
  }

}
