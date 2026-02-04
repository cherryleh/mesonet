import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ReportsEmailService } from '../services/reports-email.service'; 
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { SidebarService } from '../services/sidebar.service';
import { ReportsApiService } from '../services/reports-api.service';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { BannerComponent } from '../banner/banner.component';
import { BannerService } from '../services/banner.service';

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
    MatPaginatorModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatOptionModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    EmailDialogComponent,
    BannerComponent
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class ReportsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  today = new Date();
  stationId: string = '';
  reportForm: FormGroup;
  timestamp: string = '';
  reportData: any[] = [];
  dataSource = new MatTableDataSource<any>();
  isLoading = false;
  isCollapsed = false;

  isLongRangeRequired = false;
  isAutoChecked = false;
  checkboxTooltip = ""; 

  hasSubmitted: boolean = false;

  intervalOptions = [
    { value: '5-minute', label: '5-Minute' },
    { value: 'hourly', label: 'Hourly' }
  ];

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }

  public minStartDate: Date = new Date(); // Default to today's date
  public maxDate: Date = new Date();
  public showExportButton: boolean = false;

  public headersMap: { [key: string]: string } = {
    timestamp: 'Timestamp',
    station_id: 'Station ID',
    Tair_1_Avg: 'Temperature Sensor 1 (C)',
    Tair_2_Avg: 'Temperature Sensor 2 (C)',
    RF_1_Tot300s: 'Rainfall, 5-minute total (mm)',
    RFint_1_Max: 'Maximum rain intensity (mm/hr)',
    SWin_1_Avg: 'Incoming Shortwave radiation (W/m2)',
    SWout_1_Avg: 'Outgoing Shortwave Radiation (W/m2)',
    LWin_1_Avg: 'Incoming Longwave Radiation (W/m2)',
    LWout_1_Avg: 'Outgoing Longwave Radiation (W/m2)',
    SWnet_1_Avg: 'Net Solar Radiation (W/m2)',
    LWnet_1_Avg: 'Net Longwave Radiation (W/m2)',
    Rnet_1_Avg: 'Net Radiation (W/m2)',
    Albedo_1_Avg: 'Albedo (unitless)',
    Tsrf_1_Avg: 'Surface Temperature (C)',
    Tsky_1_Avg: 'Sky Temperature (C)',
    RH_1_Avg: 'Relative Humidity Sensor 1 (%)',
    RH_2_Avg: 'Relative Humidity Sensor 2 (%)',
    VP_1_Avg: 'Vapor Pressure Sensor 1 (hPa)',
    VP_2_Avg: 'Vapor Pressure Sensor 2 (hPa)',
    VPsat_1_Avg: 'Saturation Vapor Pressure Sensor 1 (hPa)',
    VPsat_2_Avg: 'Saturation Vapor Pressure Sensor 2 (hPa)',
    VPD_1_Avg: 'Vapor Pressure Deficit Sensor 1 (hPa)',
    VPD_2_Avg: 'Vapor Pressure Deficit Sensor 2 (hPa)',
    WS_1_Avg: 'Wind Speed (m/s)',
    WDrs_1_Avg: 'Wind Direction (degrees)',
    P_1_Avg: 'Air Pressure (kPa)',
    Psl_1_Avg: 'Sea Level Pressure (hPa)',
    Tsoil_1_Avg: 'Soil Temperature 1 (C)',
    Tsoil_2_Avg: 'Soil Temperature 2 (C)',
    Tsoil_3_Avg: 'Soil Temperature 3 (C)',
    Tsoil_4_Avg: 'Soil Temperature 4 (C)',
    SM_1_Avg: 'Soil Moisture (%)',
    SM_2_Avg: 'Soil Moisture 2 (%)',
    SM_3_Avg: 'Soil Moisture 3 (%)',
    SHFsrf_1_Avg: 'Soil Heat Flux (W/m2)',
  };

  public headers = Object.keys(this.headersMap);   
  public displayHeaders = Object.values(this.headersMap);
  bannerMessage: string | null = null;
  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private reportsEmailService: ReportsEmailService,
    private StationDatesService: StationDatesService,
    private sidebarService: SidebarService,
    private reportsApiService: ReportsApiService,
    private dialog: MatDialog,
    private bannerService: BannerService
  ) {
    this.reportForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      confirmLongRange: [false] ,
      confirmSubmission: [false, Validators.requiredTrue]
    });
  }
  private sidebarSubscription!: Subscription;

  ngOnInit(): void {
    // this.bannerService.banner$.subscribe(msg => {
    //   this.bannerMessage = msg;
    // });
    // this.bannerService.set(this.bannerService.messages.maintenance);
    this.bannerService.set(null);
    const today = new Date();
    this.maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id';
      this.initializeForm(); 
      this.fetchStationData(this.stationId);
    });

    this.sidebarSubscription = this.sidebarService.isCollapsed$.subscribe((value: boolean) => {
      this.isCollapsed = value;
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  initializeForm(): void {
    this.reportForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      interval: ['hourly'],
      email: ['', [Validators.required, Validators.email]],
      confirmLongRange: new FormControl({ value: false, disabled: false }),
      confirmSubmission: [false, Validators.requiredTrue]
    });

    this.reportForm.get('startDate')?.valueChanges.subscribe(() => this.checkDateRange());
    this.reportForm.get('endDate')?.valueChanges.subscribe(() => this.checkDateRange());
  }


  validateAndSubmit(): void {
    this.hasSubmitted = true;  
    this.checkDateRange();  

    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched(); 
      return;
    }

    this.onSubmit();
    console.log('Checkbox checked:', this.reportForm.get('confirmLongRange')?.value);

  }

  onSubmit(): void {
    this.isLoading = true;

    const formValues = this.reportForm.getRawValue();
    let { startDate, endDate, email, interval, confirmLongRange } = this.reportForm.getRawValue();



    try {
      startDate = this.formatDateToHST(startDate, 'T00:00:00-10:00');
      endDate = this.formatDateToHST(endDate, 'T23:59:59-10:00');
    } catch (error) {
      console.error('Date processing error:', error);
      this.isLoading = false;
      return;
    }

    const exportPayload = {
      email: email,
      data: {
        station_ids: [this.stationId],
        var_ids: ["Tair_1_Avg", "Tair_2_Avg", "RF_1_Tot300s","RFint_1_Max", "SWin_1_Avg", "SWout_1_Avg", "LWin_1_Avg", "LWout_1_Avg", "SWnet_1_Avg", "LWnet_1_Avg", "Rnet_1_Avg", "Albedo_1_Avg", "Tsrf_1_Avg", "Tsky_1_Avg", "RH_1_Avg", "RH_2_Avg", "VP_1_Avg", "VP_2_Avg", "VPsat_1_Avg", "VPsat_2_Avg", "VPD_1_Avg", "VPD_2_Avg", "WS_1_Avg", "WDrs_1_Avg", "P_1_Avg", "Psl_1_Avg", "Tsoil_1_Avg", "SHFsrf_1_Avg", "SM_1_Avg", "SM_2_Avg", "SM_3_Avg", "Tsoil_2_Avg", "Tsoil_3_Avg","Tsoil_4_Avg"],
        start_date: startDate,
        end_date: endDate,
        local_tz: "true",
        reverse: "true"
      },
      outputName: `${this.stationId}_${this.formatShortDate(startDate)}_${this.formatShortDate(endDate)}.csv`
    };

    const start = new Date(this.reportForm.get('startDate')?.value);
    const end = new Date(this.reportForm.get('endDate')?.value);
    const dateDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    this.isLongRangeRequired = dateDiff > 30;
    const mustUseEmail = dateDiff > 30;
    const shouldEmail = mustUseEmail || confirmLongRange;

    if (shouldEmail) {
      this.reportsEmailService.sendExportRequest(exportPayload).subscribe({
        next: () => {
          this.isLoading = false;
          const dialogRef = this.dialog.open(EmailDialogComponent, { width: '400px' });
          dialogRef.afterClosed().subscribe(() => {
            console.log('Dialog closed');
          });

        },
        error: err => {
          if (err.status === 202 && typeof err.error === 'string' && err.error.includes('Request received')) {
            console.warn('Received 202 response, treating as success.');
            this.isLoading = false;
            this.dialog.open(EmailDialogComponent, { width: '400px' });
          } else {
            console.error('Email export failed:', err);
            this.isLoading = false;
          }
        }
      });
    }

    const logUrl = `https://api.hcdp.ikewai.org/mesonet/db/measurements/email?source=reports&station_ids=${this.stationId}&start_date=${startDate}&end_date=${endDate}&var_ids=${exportPayload.data.var_ids.join(';')}&email=${email}`;

    fetch('https://script.google.com/macros/s/AKfycbx4wPV8A-nJbUp5VXlCTs6Kt-Df4n7eYh-ujbg5uKPNROdxU22jCcRTKl1FFrznyniFog/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: logUrl,
        method: 'POST',
        time: new Intl.DateTimeFormat('en-US', {
          timeZone: 'Pacific/Honolulu',
          dateStyle: 'short',
          timeStyle: 'medium',
          hour12: false
        }).format(new Date())
      }),
      mode: 'no-cors'
    });


    if (!mustUseEmail) {
      this.reportsApiService.getData(this.stationId, startDate, endDate, email).subscribe({
        next: (data) => {
          this.reportData = data;
          this.formatTableData();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('API fetch failed:', err);
          this.isLoading = false;
        }
      });
    }
  }



  formatShortDate(date: string): string {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
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
          Tair_1_Avg: null,
          Tair_2_Avg: null,
          RF_1_Tot300s: null,
          RFint_1_Max: null,
          SWin_1_Avg: null,
          SWout_1_Avg: null,
          LWin_1_Avg: null,
          LWout_1_Avg: null,
          SWnet_1_Avg: null,
          LWnet_1_Avg: null,
          Rnet_1_Avg: null,
          Albedo_1_Avg: null,
          Tsrf_1_Avg: null,
          Tsky_1_Avg: null,
          RH_1_Avg: null,
          RH_2_Avg: null,
          VP_1_Avg: null,
          VP_2_Avg: null,
          VPsat_1_Avg: null,
          VPsat_2_Avg: null,
          VPD_1_Avg: null,
          VPD_2_Avg: null,
          WS_1_Avg: null,
          WDrs_1_Avg: null,
          P_1_Avg: null,
          Psl_1_Avg: null,
          Tsoil_1_Avg: null,
          Tsoil_2_Avg: null,
          Tsoil_3_Avg: null,
          Tsoil_4_Avg: null,
          SM_1_Avg: null,
          SM_2_Avg: null,
          SM_3_Avg: null,
          SHFsrf_1_Avg: null
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
    const start = this.reportForm.get('startDate')?.value;
    const end = this.reportForm.get('endDate')?.value;
    const startShort = this.formatShortDate(start);
    const endShort = this.formatShortDate(end);

    a.download = `${this.stationId}_${startShort}_${endShort}.csv`;

    a.click();
    window.URL.revokeObjectURL(url);
  }


  fetchStationData(id: string): void {
    this.StationDatesService.getData(id).subscribe({
      next: (response) => {
        const date = response.minDate ? new Date(response.minDate) : null;

        if (date && !isNaN(date.getTime())) {
          this.minStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        } else {
          console.warn('Invalid timestamp received:', response.minDate);

          this.minStartDate = this.maxDate;
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });
  }

  checkDateRange(): void {
    const startDateControl = this.reportForm.get('startDate');
    const endDateControl = this.reportForm.get('endDate');
    const confirmLongRangeControl = this.reportForm.get('confirmLongRange'); 

    if (startDateControl?.value && endDateControl?.value) {
      const startDate = new Date(startDateControl.value);
      const endDate = new Date(endDateControl.value);
      const dateDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24); // Days difference

      if (dateDiff > 30) {
        if (!confirmLongRangeControl?.disabled) {
          confirmLongRangeControl?.patchValue(true, { emitEvent: false });
          confirmLongRangeControl?.disable({ emitEvent: false });
          this.isAutoChecked = true;  
        }
      } else {
        if (confirmLongRangeControl?.disabled) {
          confirmLongRangeControl?.enable({ emitEvent: false });
          confirmLongRangeControl?.patchValue(false, { emitEvent: false });
          this.isAutoChecked = false;  
        }
      }

    }
  }

}
