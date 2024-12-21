import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportsService } from '../reports.service'; 
import { StationDatesService } from '../station-dates.service';
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
  timestamp: string = '';
  reportData: any[] = [];
  formattedData: any[] = [];
  public minStartDate: string = '';

  private headersMap = {
    timestamp: 'Timestamp',
    station_id: 'Station ID',
    RF_1_Tot300s: 'Rainfall (mm)',
    RH_1_Avg: 'Relative Humidity (%)',
    SM_1_Avg: 'Soil Moisture (%)',
    SWin_1_Avg: 'Solar Radiation (W/m2)',
    Tair_1_Avg: 'Temperature (C)',
    WS_1_Avg: 'Wind Speed (m/s)'
  };

  public headers = Object.keys(this.headersMap);   
  public displayHeaders = Object.values(this.headersMap);

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private reportsService: ReportsService,
    private StationDatesService: StationDatesService
  ) {
    this.reportForm = this.fb.group({ // Initialize form in constructor to ensure fb is available
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    console.log('Headers:', this.headers);
    console.log('Display Headers:', this.displayHeaders);

    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID:', this.stationId);
      this.initializeForm(); 
      this.fetchStationData(this.stationId);
    });
  }


  initializeForm(): void {
    this.reportForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });

    this.reportForm.get('startDate')?.valueChanges.subscribe(startDate => {
      if (startDate) {
        // Set the minimum date for endDate to the selected startDate
        const endDateControl = this.reportForm.get('endDate');
        endDateControl?.setValue(''); // Clear endDate value if startDate changes
        endDateControl?.setValidators([
          (control) => control.value && control.value < startDate ? { invalidDate: true } : null
        ]);
        endDateControl?.updateValueAndValidity(); // Trigger validation
      }
    });
  }

  onSubmit(): void {
    let { startDate, endDate } = this.reportForm.value;
    if (startDate && endDate) {
      const formatDateToHST = (date: string, time: string) => {
        // Append 'T00:00:00' to prevent timezone shifts
        const dateObj = new Date(`${date}T00:00:00`); // Force local time without UTC conversion
        const localDateStr = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
        return `${localDateStr}${time}`; // Append time with HST offset
      };




      startDate = formatDateToHST(startDate, 'T00:00:00-10:00'); 
      endDate = formatDateToHST(endDate, 'T23:59:59-10:00'); 
      console.log(startDate);
      
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
        acc[key] = {
          timestamp: this.formatTimestampForTable(row.timestamp),
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

    // Convert grouped data to an array and sort by 'timestamp'
    this.formattedData = Object.values(groupedData).sort((a: any, b: any) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    console.log('Formatted Data:', this.formattedData);

  }

  formatTimestampForTable(timestamp: string): string {
    const dateObj = new Date(timestamp); // Parse ISO timestamp
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`; // Excel-friendly format
  }


  getTableHeaders(): string[] {
    return this.headers; 
  }

  exportToCSV(): void {
    if (!this.formattedData || this.formattedData.length === 0) {
      console.warn('No data available to export.');
      return;
    }

    // Prepare CSV rows
    const csvRows = [];

    // Add display headers from headersMap
    csvRows.push(this.displayHeaders.join(',')); // Use dynamic headers

    // Add data rows
    this.formattedData.forEach(row => {
      const rowData = this.headers.map(key => 
        row[key] !== null && row[key] !== undefined ? row[key] : ''
      );
      csvRows.push(rowData.join(','));
    });

    // Generate CSV file
    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for UTF-8 encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${this.stationId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);

    console.log('Headers:', this.headers);
    console.log('Display Headers:', this.displayHeaders);

  }

  fetchStationData(id: string): void {
    this.StationDatesService.getData(id).subscribe({
      next: (response) => {
        if (response.length > 0) {
          // Format timestamp to 'YYYY-MM-DD'
          const date = new Date(response[0].timestamp);
          this.minStartDate = date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
          console.log('Min Start Date:', this.minStartDate);
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });
  }


}


