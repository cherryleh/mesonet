import { Component, OnInit } from '@angular/core';
import { StationMonitorService } from '../services/station-monitor.service';
import { DatePipe, NgFor, NgIf, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';

interface StationRow {
  stationId: string;
  [key: string]: string | number | null; 
}

@Component({
  selector: 'app-diagnostic-table',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule],
  templateUrl: './diagnostic-table.component.html',
  styleUrl: './diagnostic-table.component.css'
})

export class DiagnosticTableComponent implements OnInit {
  stationData: StationRow[] = [];
  columns: string[] = [];
  loading = true;

  private stationVarsMap: Record<string, Set<string>> = {};

  constructor(
    private monitorService: StationMonitorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
  }

  reload() {
    this.loading = true;
    this.loadData();
  }


  passwordInput = '';
  authorized = false;
  error = false;

  checkPassword() {
    if (this.passwordInput === environment.sitePassword) {
      this.authorized = true;
      this.error = false;
      this.loadData();   // now fetch table data
    } else {
      this.error = true;
    }
  }

  private loadData() {
    this.http.get('station_variables.csv', { responseType: 'text' }).subscribe({
      next: (csv) => {
        this.parseStationVars(csv);

        this.monitorService.getStationData().subscribe({
          next: (data) => {
            const pivoted = this.pivotStationData(data);
            this.stationData = pivoted;
            this.columns = Object.keys(pivoted[0] || {}).filter(
              c => c !== 'stationId' && c !== 'Status'
            );
            this.loading = false;
          },
          error: (err) => {
            console.error('❌ API error:', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('❌ Failed to load station_variables.csv:', err);
        this.loading = false;
      }
    });
  }

  private parseStationVars(csvText: string) {
    const lines = csvText.trim().split('\n');
    lines.slice(1).forEach(line => {
      const [station, vars] = line.split(',');
      if (station && vars) {
        const varSet = new Set(vars.split(';').map(v => v.trim()));
        // Pad to 4 digits so "115" -> "0115" to match your API IDs
        this.stationVarsMap[station.padStart(4, '0')] = varSet;
      }
    });
  }

  //table sorting
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  sortBy(column: string) {
    if (this.sortColumn === column) {
      // toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // set new column
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.stationData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      // handle nulls and strings vs numbers
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return this.sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }


  private evaluateStatus(variable: string, numValue: number | null): string {
    if (numValue === null || numValue === undefined) return "No Data";

    switch (variable) {
      case "BattVolt":
        if (numValue === 0) return "No Data";
        if (numValue < 11.8) return "Critical";
        if (numValue < 12) return "Warning";
        if (numValue < 12.2) return "Caution";
        return "Good";

      case "RHenc_max":
        if (numValue >= 75) return "Critical";
        if (numValue >= 50) return "Caution";
        return "Good";

      case "RHenc_50":
        if (numValue >= 30) return "Critical";
        if (numValue > 10) return "Caution";
        return "Good";

      case "CellStr":
        if (numValue === 0) return "No Data";
        if (numValue < -115) return "Critical";
        if (numValue < -106) return "Warning";
        return "Good";

      case "CellQlt":
        if (numValue === 0) return "No Data";
        if (numValue < -12) return "Warning";
        return "Good";

      case "Tair_diff":
        if (numValue > 0.2) return "Critical";
        if (numValue > 0.1) return "Warning";
        return "Good";

      case "RH_diff":
        if (numValue > 2) return "Critical";
        if (numValue > 1.5) return "Warning";
        return "Good";

      default:
        return "No Data";
    }
  }

  evaluateCell(variable: string, value: any): string {
    if (value === null || value === undefined || value === '') return "No Data";

    // Map dataset columns to criteria keys
    const mappings: Record<string, string> = {
      "24hr_min_BattVolt": "BattVolt",
      "24hr_max_RHenc": "RHenc_max",
      "24hr_>50_RHenc": "RHenc_50",
      "24hr_min_CellStr": "CellStr",
      "24hr_min_CellQlt": "CellQlt",
      "24hr_avg_diff_Tair_Avg": "Tair_diff",
      "24hr_avg_diff_RH_Avg": "RH_diff"
    };

    const thresholdKey = mappings[variable];
    if (!thresholdKey) return ""; // skip non-diagnostic vars

    return this.evaluateStatus(thresholdKey, typeof value === "number" ? value : null);
  }


  private pivotStationData(raw: any): any[] {
    const rows: any[] = [];

    const expectedVars = [
      'P_1', 'RF_1_Tot300s', 'RH_1_Avg', 'RH_2_Avg',
      'SM_1_Avg', 'SM_2_Avg', 'SM_3_Avg',
      'SWin_1_Avg', 'Tair_1_Avg', 'Tair_2_Avg',
      'Tsoil_1_Avg', 'Tsoil_2', 'Tsoil_3', 'Tsoil_4',
      'WS_1_Avg'
    ];

    Object.entries(raw).forEach(([stationId, details]: [string, any]) => {
      const row: any = { stationId };

      // Add the summary sections
      ['24hr_min', '24hr_max', '24hr_>50', '24hr_avg_diff'].forEach(section => {
        const sectionData = details[section] || {};
        Object.entries(sectionData).forEach(([varName, val]: [string, any]) => {
          let newVal = val ?? null;

          if (
            (section === '24hr_avg_diff' && (varName === 'Tair_Avg' || varName === 'RH_Avg')) ||
            (section === '24hr_>50' && varName === 'RHenc')
          ) {
            if (typeof newVal === 'number') {
              newVal = Math.round(newVal * 100) / 100;
            }
          }

          row[`${section}_${varName}`] = newVal;
        });
      });

      // Filter Missing_Latest only by available vars
      const latest = details['24hr_latest'] || {};
      const availableVars = this.stationVarsMap[stationId] || new Set();
      const missing: string[] = [];

      expectedVars.forEach(varName => {
        if (availableVars.has(varName) && !latest[varName]) {
          missing.push(varName);
        }
      });

      row['Missing_Latest'] = missing.length > 0 ? missing.join(', ') : '';

      // ---- Status evaluation ----
      const mappings: Record<string, string> = {
        "24hr_min_BattVolt": "BattVolt",
        "24hr_max_RHenc": "RHenc_max",
        "24hr_>50_RHenc": "RHenc_50",
        "24hr_min_CellStr": "CellStr",
        "24hr_min_CellQlt": "CellQlt",
        "24hr_avg_diff_Tair_Avg": "Tair_diff",
        "24hr_avg_diff_RH_Avg": "RH_diff"
      };

      let hasCritical = false;

      // Threshold checks
      Object.entries(mappings).forEach(([colName, thresholdKey]) => {
        const val = row[colName] as number | null;
        const status = this.evaluateStatus(thresholdKey, typeof val === "number" ? val : null);
        if (status === "Critical") hasCritical = true;
      });

      // Missing variable check (also critical)
      if (missing.length > 0) {
        hasCritical = true;
      }

      // Final Status
      row["Status"] = hasCritical ? "Critical" : "OK";

      rows.push(row);
    });

    return rows;
  }

}
