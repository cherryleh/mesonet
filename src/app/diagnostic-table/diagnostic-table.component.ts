import { Component, OnInit } from '@angular/core';
import { StationMonitorService } from '../services/station-monitor.service';
import { DatePipe, NgFor, NgIf } from '@angular/common';

interface StationRow {
  stationId: string;
  [key: string]: string | number | null; 
}



@Component({
  selector: 'app-diagnostic-table',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  templateUrl: './diagnostic-table.component.html',
  styleUrl: './diagnostic-table.component.css'
})
export class DiagnosticTableComponent {
  stationData: StationRow[] = [];
  columns: string[] = [];
  loading = true;

  constructor(private monitorService: StationMonitorService) {}

  ngOnInit(): void {
    this.monitorService.getStationData().subscribe({
      next: (data) => {
        const pivoted = this.pivotStationData(data);
        this.stationData = pivoted;

        // collect dynamic column names
        this.columns = Object.keys(pivoted[0] || {}).filter(c => c !== 'stationId');


        this.loading = false;
      },
      error: (err) => {
        console.error('❌ API error:', err);
        this.loading = false;
      }
    });
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

          // Round specific fields
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

      // Track missing variables
      const latest = details['24hr_latest'] || {};
      const missing: string[] = [];

      expectedVars.forEach(varName => {
        if (!latest[varName]) {
          missing.push(varName);
        }
      });

      row['Missing_Latest'] = missing.length > 0 ? missing.join(', ') : '';
      rows.push(row);
    });

    return rows;
  }



}
