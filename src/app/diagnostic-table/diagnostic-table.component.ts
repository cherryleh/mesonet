import { Component, OnInit } from '@angular/core';
import { StationMonitorService } from '../services/station-monitor.service';
import { NgFor, NgIf, NgClass } from '@angular/common';
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
  imports: [NgFor, NgIf, NgClass, FormsModule],
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

  ngOnInit(): void {}

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
          next: (resp) => {
            const raw = resp?.data || {};
            const pivoted = this.pivotStationData(raw);
            this.stationData = pivoted;
            this.columns = Object.keys(pivoted[0] || {}).filter(
              c => c !== 'stationId' && c !== 'Status'
            );
            this.loading = false;
          },
          error: (err) => {
            console.error('API error:', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Failed to load station_variables.csv:', err);
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
        // Pad to 4 digits so "115" -> "0115" to match API IDs
        this.stationVarsMap[station.padStart(4, '0')] = varSet;
      }
    });
  }

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.stationData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Helper to convert values to numbers for sorting
      const getSortValue = (val: any) => {
        const isLowBad = column.includes('Cell') || column.includes('BattVolt');
        const isHighBad = column.includes('RHenc') || column.includes('diff');

        // Catch missing data strings
        if (val === 'No Data' || val === 'Missing' || val === '') {
          return isHighBad ? Infinity : -Infinity;
        }

        // Catch 0 as a critical error code for Cell and Battery columns
        if (val === 0 && isLowBad) {
          return -Infinity;
        }

        // Parse percentages
        if (typeof val === 'string' && val.endsWith('%')) {
          return parseFloat(val);
        }

        return val;
      };

      const aCompare = getSortValue(aVal);
      const bCompare = getSortValue(bVal);

      // Compare as numbers if both are valid numbers (including Infinity)
      if (typeof aCompare === 'number' && typeof bCompare === 'number' && !isNaN(aCompare) && !isNaN(bCompare)) {
        if (aCompare === bCompare) return 0; // Prevents NaN when subtracting Infinity from Infinity
        return this.sortDirection === 'asc' ? aCompare - bCompare : bCompare - aCompare;
      }

      // Fallback to alphabetical sorting for anything else
      return this.sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  private evaluateStatus(variable: string, numValue: any): string {
    if (
      numValue === "Missing" ||
      numValue === null ||
      numValue === undefined ||
      numValue === "No Data" ||
      numValue === ""
    ) {
      return "Critical";
    }

    switch (variable) {
      case "BattVolt":
        if (numValue === 0) return "No Data";
        if (numValue < 11.8) return "Critical";
        if (numValue < 12.2) return "Warning";
        return "Good";

      case "RHenc_max":
        if (numValue >= 80) return "Critical";
        if (numValue >= 60) return "Warning";
        return "Good";

      case "RHenc_50":
        if (numValue >= 30) return "Critical";
        if (numValue > 10) return "Warning";
        return "Good";

      case "CellStr":
        if (numValue === 0 || numValue === -130) return "Critical";
        if (numValue < -120) return "Warning";
        return "Good";

      case "CellQlt":
        if (numValue === 0 || numValue === -99) return "Critical";
        if (numValue < -18) return "Warning";
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
    if (value === "Missing") {
      const mappings: Record<string, string> = { "24hr_min_CellStr": "CellStr" };
      return this.evaluateStatus(mappings[variable] || "", value);
    }

    if (value === null || value === undefined || value === '' || value === "No Data") {
      return "No Data";
    }

    const mappings: Record<string, string> = {
      "24hr_min_CellStr": "CellStr",
      "24hr_min_CellQlt": "CellQlt",
      "24hr_min_BattVolt": "BattVolt",
      "24hr_max_RHenc": "RHenc_max",
      "24hr_>50_RHenc": "RHenc_50",
      "24hr_avg_diff_Tair_Avg": "Tair_diff",
      "24hr_avg_diff_RH_Avg": "RH_diff"
    };

    const thresholdKey = mappings[variable];
    if (!thresholdKey) return "";

    let evalValue = value;
    if (typeof value === 'string' && value.endsWith('%')) {
      evalValue = parseFloat(value);
    }

    return this.evaluateStatus(thresholdKey, evalValue);
  }

  // ---------- Pivot ----------
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
      const row: any = {
        stationId,
        '24hr_min_CellStr': 'No Data',
        '24hr_min_CellQlt': 'No Data',
        '24hr_min_BattVolt': 'No Data',
        '24hr_max_RHenc': 'No Data',
        '24hr_>50_RHenc': 'No Data',
        '24hr_avg_diff_Tair_Avg': 'No Data',
        '24hr_avg_diff_RH_Avg': 'No Data',
        'Missing_Latest': 'No Data'
      };

      ['24hr_min', '24hr_max', '24hr_>50', '24hr_avg_diff'].forEach(section => {
        const sectionData = details[section] || {};
        Object.entries(sectionData).forEach(([varName, val]: [string, any]) => {
        let newVal = (val === null || val === undefined || val === '')
        ? "No Data"
        : val;
        if (section === '24hr_avg_diff' && (varName === 'Tair_Avg' || varName === 'RH_Avg')) {
          if (typeof newVal === 'number') {
            newVal = Math.abs(newVal);
            newVal = Math.round(newVal * 100) / 100;
          }
        } else if (section === '24hr_>50' && varName === 'RHenc') {
          if (typeof newVal === 'number') {
            newVal = (Math.round(newVal * 100) / 100) + '%';
          }
        }

        row[`${section}_${varName}`] = newVal;
        });
      });

      const latest = details['24hr_latest'] || {};
      const availableVars = this.stationVarsMap[stationId] || new Set();
      const missing: string[] = [];

      expectedVars.forEach(varName => {
        if (availableVars.has(varName) && !latest[varName]) {
          missing.push(varName);
        }
      });

      row['Missing_Latest'] = missing.length > 0 ? missing.join(', ') : '';

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
      let hasWarning = false;

        Object.entries(mappings).forEach(([colName, thresholdKey]) => {
        const val = row[colName];

        let numVal: number | null = null;
        if (typeof val === "number") {
          numVal = val;
        } else if (typeof val === "string" && val.endsWith('%')) {
          numVal = parseFloat(val);
        }

        const status = this.evaluateStatus(thresholdKey, numVal);
        if (status === "Critical") hasCritical = true;
        if (status === "Warning") hasWarning = true;
      });

      // Missing latest counts as warning
      if (missing.length > 0) {
        hasWarning = true;
      }

      if (hasCritical) {
        row["Status"] = "Critical";
      } else if (hasWarning) {
        row["Status"] = "Warning";
      } else {
        row["Status"] = "OK";
      }


      rows.push(row);
    });

    return rows;
  }

  showCriteria = false;

  criteriaReference = [
    { variable: '24hr_min_CellStr', description: '24-hour minimum Cell String', critical: '< -130, 0, or NAN', warning: '< 120' },
    { variable: '24hr_min_CellQlt', description: '24-hour minimum Cell Quality', critical: '-99, 0, or NAN', warning: '< -18' },
    { variable: '24hr_min_BattVolt', description: '24-hour minimum Battery Voltage', critical: '< 11.8', warning: '< 12.2' },
    { variable: '24hr_max_RHenc', description: '24-hour maximum Relative Humidity Enclosure', critical: '≥ 80', warning: '≥ 60' },
    { variable: '24hr_>50_RHenc', description: 'Percent time RHenc is over 50% in the last 24 hours', critical: '≥ 30', warning: '> 10' },
    { variable: '24hr_avg_diff_Tair_Avg', description: '24-hour average difference Temperature Air Average', critical: '> 0.2', warning: '> 0.1' },
    { variable: '24hr_avg_diff_RH_Avg', description: '24-hour average difference Relative Humidity Average', critical: '> 2', warning: '> 1.5' }
  ];


  selectedCriteriaRef: { variable: string; critical: string; warning: string } | null = null;
}
