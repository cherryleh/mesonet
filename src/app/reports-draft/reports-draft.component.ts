import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportsDraftService } from '../services/reports-draft.service'; 
import { StationDatesService } from '../services/station-dates.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-reports-draft',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    StationTitleComponent, 
    MatFormFieldModule, 
    MatSelectModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatNativeDateModule,
    MatPaginatorModule],
  templateUrl: './reports-draft.component.html',
  styleUrl: './reports-draft.component.css'
})
export class ReportsDraftComponent implements OnInit{
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  today = new Date();
  stationId: string = '';
  reportForm: FormGroup;
  timestamp: string = '';
  reportData: any[] = [];
  dataSource = new MatTableDataSource<any>();
  isLoading = false;
  
  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }

  variables = new FormControl<string[]>([]);

  filteredVariables: string[] = ['Rainfall','Maximum Rainfall Intensity', 'Air temperature, sensor 1', 'Air temperature, sensor 2',
    'Incoming Shortwave Radiation', 'Outgoing Shortwave Radiation',
    'Incoming Longwave Radiation', 'Outgoing longwave radiation',
    'Net shortwave radiation', 'Net longwave radiation', 'Net radiation', 'Albedo',
    'Surface temperature', 'Sky temperature', 'Relative humidity, sensor 1',
    'Relative humidity, sensor 2', 'Vapor pressure, sensor 1', 'Vapor pressure, sensor 2',
    'Saturation vapor pressure, sensor 1', 'Saturation vapor pressure, sensor 2',
    'Vapor pressure deficit, sensor 1', 'Vapor pressure deficit, sensor 2',
    'Mean wind speed', 'Unit vector average wind direction','Pressure',
    'Sea level pressure','Soil temperature, sensor 1',
    'Surface soil heat flux',
    'Soil moisture, sensor 1', 'Soil moisture, sensor 2','Soil moisture, sensor 3',
    'Soil temperature, sensor 2', 'Soil temperature, sensor 3', 'Soil temperature, sensor 4',
  ];
  maxSelection = 3;
  searchTerm: string = '';

  filterVariables() {
    if (this.searchTerm.trim() === '') {
      this.filteredVariables = [
        'Rainfall', 'Maximum Rainfall Intensity', 'Air temperature, sensor 1', 'Air temperature, sensor 2',
        'Incoming Shortwave Radiation', 'Outgoing Shortwave Radiation',
        'Incoming Longwave Radiation', 'Outgoing longwave radiation',
        'Net shortwave radiation', 'Net longwave radiation', 'Net radiation', 'Albedo',
        'Surface temperature', 'Sky temperature', 'Relative humidity, sensor 1',
        'Relative humidity, sensor 2', 'Vapor pressure, sensor 1', 'Vapor pressure, sensor 2',
        'Saturation vapor pressure, sensor 1', 'Saturation vapor pressure, sensor 2',
        'Vapor pressure deficit, sensor 1', 'Vapor pressure deficit, sensor 2',
        'Mean wind speed', 'Unit vector average wind direction', 'Pressure',
        'Sea level pressure', 'Soil temperature, sensor 1', 'Surface soil heat flux',
        'Soil moisture, sensor 1', 'Soil moisture, sensor 2', 'Soil moisture, sensor 3',
        'Soil temperature, sensor 2', 'Soil temperature, sensor 3', 'Soil temperature, sensor 4',
      ];
    } else {
      this.filteredVariables = this.filteredVariables.filter(variable =>
        variable.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  onSelectionChange(event: any) {
    const selectedValues = this.variables.value || [];
    if (selectedValues.length > this.maxSelection) {
      selectedValues.pop(); // Remove last selection if max exceeded
      this.variables.setValue(selectedValues);
    }
  }


  public minStartDate: Date = new Date(); // Default to today's date
  public maxDate: Date = new Date();
  public showExportButton: boolean = false;

  public headersMap: { [key: string]: string } = {
    timestamp: 'Timestamp',
    station_id: 'Station ID',
    SWin_1_Avg:	'Incoming Shortwave Radiation',
    SWout_1_Avg:	'Outgoing Shortwave Radiation',
    LWin_1_Avg:	'Incoming Longwave Radiation',
    LWout_1_Avg:	'Outgoing longwave radiation',
    SWnet_1_Avg:	'Net shortwave radiation',
    LWnet_1_Avg:	'Net longwave radiation',
    Rnet_1_Avg:	'Net radiation',
    Albedo_1_Avg:	'Albedo',
    Tsrf_1_Avg:	'Surface temperature',
    Tsky_1_Avg:	'Sky temperature',
    Tair_1_Avg:	'Air temperature, sensor 1',
    Tair_2_Avg:	'Air temperature, sensor 2',
    RH_1_Avg:	'Relative humidity, sensor 1',
    RH_2_Avg:	'Relative humidity, sensor 2',
    VP_1_Avg:	'Vapor pressure, sensor 1',
    VP_2_Avg:	'Vapor pressure, sensor 2',
    VPsat_1_Avg:	'Saturation vapor pressure, sensor 1',
    VPsat_2_Avg:	'Saturation vapor pressure, sensor 2',
    VPD_1_Avg:	'Vapor pressure deficit, sensor 1',
    VPD_2_Avg:	'Vapor pressure deficit, sensor 2',
    WS_1_Avg:	'Mean wind speed',
    WDuv_1_Avg:	'Unit vector average wind direction',
    P_1:	'Pressure',
    Psl_1:	'Sea level pressure',
    Tsoil_1_Avg:	'Soil temperature, sensor 1',
    SHFsrf_1_Avg:	'Surface soil heat flux',
    SM_1_Avg:	'Soil moisture, sensor 1',
    SM_2_Avg:	'Soil moisture, sensor 2',
    SM_3_Avg:	'Soil moisture, sensor 3',
    Tsoil_2:	'Soil temperature, sensor 2',
    Tsoil_3:	'Soil temperature, sensor 3',
    Tsoil_4:	'Soil temperature, sensor 4',
    RF_1_Tot300s:	'Rainfall',
    RFint_1_Max:	'Maximum Rainfall Intensity'
  };

  public headers = Object.keys(this.headersMap);   
  public displayHeaders = Object.values(this.headersMap);

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private reportsService: ReportsDraftService,
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
    this.isLoading = true;
    let { startDate, endDate } = this.reportForm.value;
    try {
      startDate = this.formatDateToHST(startDate, 'T00:00:00-10:00'); 
      endDate = this.formatDateToHST(endDate, 'T23:59:59-10:00'); 
    } catch (error) {
      console.error('Date processing error:', error);
      this.isLoading = false;
      return;
    }

    this.reportsService.getData(this.stationId, startDate, endDate).subscribe(
      (data) => {
        console.log('Raw Data Length:', data.length); 
        this.reportData = data;
        this.formatTableData();
        this.showExportButton = this.dataSource.data.length > 0;
        this.isLoading = false;      
      },
      (error) => {
        console.error('Error fetching report data:', error);
        this.isLoading = false;
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
    // Define the type for grouped data rows
    type GroupedRow = { [key: string]: any };

    // Reduce the report data into a grouped object
    const groupedData = this.reportData.reduce((acc: { [key: string]: GroupedRow }, row: any) => {
      const key = `${row.timestamp}-${row.station_id}`;
    
      // Initialize the key if not already present
      if (!acc[key]) {
        acc[key] = Object.keys(this.headersMap).reduce((obj: GroupedRow, header: string) => {
          obj[header] = null; // Initialize all keys to null
          return obj;
        }, {});
        acc[key]['timestamp'] = this.formatTimestampForTable(row.timestamp);
        acc[key]['station_id'] = row.station_id;
      }

      // Map the variable to its value if it exists in headersMap
      if (row.variable in this.headersMap) {
        let value = row.value;

        // Special formatting for soil moisture variables
        if (row.variable.startsWith('SM_') && row.variable.endsWith('_Avg')) {
          value = (value * 100).toFixed(2); // Convert to percentage
        }

        acc[key][row.variable] = value;
      }

      return acc;
    }, {});

    // Assign the grouped data to the dataSource
    this.dataSource.data = Object.values(groupedData);

    // Reset paginator after assigning data
    if (this.paginator) {
      setTimeout(() => this.paginator.firstPage());
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
