import { Component } from '@angular/core';
import { ErrorReportService, ErrorReport } from '../services/error-report.service';

@Component({
  selector: 'app-records-csv',
  standalone: true,
  template: ''   // no UI
})
export class RecordsComponent {

  constructor(private service: ErrorReportService) {
    this.downloadCsv();
  }

  downloadCsv() {
    const data: ErrorReport[] = this.service.getAll();

    const header: string[] = [
      "Username",
      "Station Number",
      "Variable ID",
      "Start Date",
      "End Date",
      "Notes"
    ];

    const rows: string[][] = data.map((item: ErrorReport) => [
      item.username,
      item.stationNumber,
      item.variableId,
      item.startDate,
      item.endDate,
      item.notes?.replace(/\n/g, ' ') ?? ''
    ]);

    const csv = [header, ...rows]
      .map((r: string[]) => r.map((v: string) => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'records.csv';
    link.click();

    URL.revokeObjectURL(url);
  }
}
