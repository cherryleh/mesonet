import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportsService } from '../services/reports.service'; 
import { StationDatesService } from '../services/station-dates.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ViewChild } from '@angular/core';


@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    StationTitleComponent,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatNativeDateModule,
    MatPaginatorModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  today = new Date();
  stationId: string = '';
  reportForm: FormGroup;
  timestamp: string = '';
  reportData: any[] = [];
  dataSource = new MatTableDataSource<any>();

  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }

  public minStartDate: Date = new Date(); // Default to today's date
  public maxDate: Date = new Date();
  public showExportButton: boolean = false;

  public headersMap: { [key: string]: string } = {
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
    this.reportForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    const today = new Date();
    this.maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());


    console.log('Max Date String:', this.maxDate);
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id';
      this.initializeForm(); 
      this.fetchStationData(this.stationId);
    });

  }
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  initializeForm(): void {
    this.reportForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });

    this.reportForm.get('startDate')?.valueChanges.subscribe(startDate => {
      if (startDate) {
        const endDateControl = this.reportForm.get('endDate');
        endDateControl?.setValue('');
        endDateControl?.setValidators([
          (control) => control.value && control.value < startDate ? { invalidDate: true } : null
        ]);
        endDateControl?.updateValueAndValidity();
      }
    });
  }

  onSubmit(): void {
    let { startDate, endDate } = this.reportForm.value;
    try {
      startDate = this.formatDateToHST(startDate, 'T00:00:00-10:00'); 
      endDate = this.formatDateToHST(endDate, 'T23:59:59-10:00'); 
    } catch (error) {
      console.error('Date processing error:', error);
      return;
    }

    this.reportsService.getData(this.stationId, startDate, endDate).subscribe(
      (data) => {
        console.log('Raw Data Length:', data.length); 
        this.reportData = data;
        this.formatTableData();
        this.showExportButton = this.dataSource.data.length > 0;
      },
      (error) => {
        console.error('Error fetching report data:', error);
      }
    );
  }

  formatDateToHST(date: string, time: string): string {
    if (!date) {
      console.error('Invalid date:', date);
      throw new Error('Invalid date provided');
    }
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date format:', date);
      throw new Error('Invalid date format');
    }
    const localDateStr = dateObj.toISOString().split('T')[0];
    return `${localDateStr}${time}`;
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
      if (row.variable in acc[key]) {
        let value = row.value;

        if (row.variable === 'SM_1_Avg') {
          value = (value * 100).toFixed(2);
        }

        acc[key][row.variable] = value;
      }

      return acc;
    }, {});

    this.dataSource.data = Object.values(groupedData);
    console.log(this.dataSource.data.length);

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage(); // Reset to the first page
    });

    // Reset paginator after assigning data
    if (this.paginator) {
      this.paginator.firstPage(); // Reset to the first page
    }

  }


  formatTimestampForTable(timestamp: string): string {
    const dateObj = new Date(timestamp);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  exportToCSV(): void {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      console.warn('No data available to export.');
      return;
    }
    const csvRows = [];
    csvRows.push(this.displayHeaders.join(','));
    this.dataSource.data.forEach(row => {
      const rowData = this.headers.map(key => row[key] !== null && row[key] !== undefined ? row[key] : '');
      csvRows.push(rowData.join(','));
    });


    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${this.stationId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }


  fetchStationData(id: string): void {
    this.StationDatesService.getData(id).subscribe({
      next: (response) => {
        const date = response[0]?.timestamp ? new Date(response[0].timestamp) : null;
        if (date && !isNaN(date.getTime())) {
          this.minStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          console.log(this.minStartDate);
        } else {
          console.warn('Invalid timestamp received:', response[0]?.timestamp);
          this.minStartDate = this.maxDate;
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });
  }
}
