import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportsService } from '../reports.service'; // Adjust the import path as needed
import { CommonModule } from '@angular/common'; // Import CommonModule to use *ngIf
import { ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule to use formGroup

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  stationId: string = '';
  reportForm: FormGroup; // Declare reportForm without initialization to avoid TS2729 error

  reportData: any[] = [];
  formattedData: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private reportsService: ReportsService
  ) {
    this.reportForm = this.fb.group({ // Initialize form in constructor to ensure fb is available
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID:', this.stationId);
      this.initializeForm(); 
    });
  }

  initializeForm(): void {
    this.reportForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  onSubmit(): void {
    let { startDate, endDate } = this.reportForm.value;
    if (startDate && endDate) {
      const formatDateToHST = (date: string, time: string) => {
        const dateObj = new Date(date);
        const offsetDate = new Date(dateObj.getTime() - (10 * 60 * 60 * 1000)); // Subtract 10 hours for HST
        return offsetDate.toISOString().split('T')[0] + time;
      };
      
      startDate = formatDateToHST(startDate, 'T00:00:00-10:00'); // Format startDate to ISO 8601 at 12:00 AM HST
      endDate = formatDateToHST(endDate, 'T23:59:59-10:00'); // Format endDate to ISO 8601 at 11:59 PM HST
      
      this.reportsService.getData(this.stationId, startDate, endDate).subscribe(
        (data) => {
          this.reportData = data;
          this.formatTableData();
          console.log('Formatted Report Data:', this.formattedData);
        },
        (error) => {
          console.error('Error fetching report data:', error);
        }
      );
    } else {
      console.warn('Start Date and End Date are required.');
    }
  }

  formatTableData(): void {
    const groupedData = this.reportData.reduce((acc, row) => {
      const key = `${row.timestamp}-${row.station_id}`;
      if (!acc[key]) {
        // Create a new row for the unique combination of timestamp and station_id
        acc[key] = {
          timestamp: row.timestamp,
          station_id: row.station_id,
          RF_1_Tot300s: null,
          RH_1_Avg: null,
          SM_1_Avg: null,
          SWin_1_Avg: null,
          Tair_1_Avg: null,
          WS_1_Avg: null
        };
      }
      // Populate the correct field for the variable in the row
      if (row.variable in acc[key]) {
        acc[key][row.variable] = row.value;
      }
      return acc;
    }, {});

    this.formattedData = Object.values(groupedData);
  }

  getTableHeaders(): string[] {
    // Return keys as they exist in the formattedData, not as display headers
    return ['timestamp', 'station_id', 'RF_1_Tot300s', 'RH_1_Avg', 'SM_1_Avg', 'SWin_1_Avg', 'Tair_1_Avg', 'WS_1_Avg'];
  }

  exportToCSV(): void {
    if (!this.formattedData || this.formattedData.length === 0) {
      console.warn('No data available to export.');
      return;
    }

    const headers = this.getTableHeaders();
    const displayHeaders = ['Timestamp', 'Station ID', 'RF_1_Tot300s', 'RH_1_Avg', 'SM_1_Avg', 'SWin_1_Avg', 'Tair_1_Avg', 'WS_1_Avg'];
    const csvRows = [];

    // Add display headers to CSV
    csvRows.push(displayHeaders.join(','));

    // Add data rows to CSV
    this.formattedData.forEach(row => {
      const rowData = headers.map(key => row[key] !== null && row[key] !== undefined ? row[key] : ''); 
      csvRows.push(rowData.join(','));
    });

    // Create a Blob from CSV data
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    // Create an anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${this.stationId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    // Clean up the URL object
    window.URL.revokeObjectURL(url);
  }

}


