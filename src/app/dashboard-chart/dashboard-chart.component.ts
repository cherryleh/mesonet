import { Component, OnInit, AfterViewInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import * as Highcharts from 'highcharts';
import { DashboardChartService } from '../dashboard-chart.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 


@Component({
  selector: 'app-dashboard-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule], 
  templateUrl: './dashboard-chart.component.html',
  styleUrls: ['./dashboard-chart.component.css'],
  providers: [DashboardChartService], 
})

export class DashboardChartComponent implements OnInit {
  refreshIntervalMS = 30000; 
  isLoading = false;
  id: string | null = null;
  selectedDuration = '1080';
  durations = [
    { label: 'Last 24 Hours', value: '1080' },
    { label: 'Last 3 Days', value: '3240' },
    { label: 'Last 7 Days', value: '7560' },
  ];
  Highcharts = Highcharts;
  chartRef!: Highcharts.Chart; // Reference to the chart
  
  // ViewChild to access the chart container in the DOM
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      height:'500px'
    },
    

    title: {
      text: ''
    },
    xAxis: {
      type: 'datetime',
    },
    yAxis: [
      {
        title: { text: 'Temperature (°F)' },
      },
      {
        title: { text: '5-min Rainfall (in)' }, 
        opposite: true,
      },
      {
        title: { text: 'Solar Radiation (W/m²)' }, 
        opposite: true,
        min: 0
      },
    ],
    tooltip: {
      shared: true,
      valueDecimals: 2, 
      xDateFormat: '%b %e, %Y %l:%M%p'
    },
    time: {
      timezoneOffset: 600, // To display in Hawaii time
    },
    series: [], 
    exporting: {
      enabled: true, // Enables the export button
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'separator', 'downloadCSV', 'downloadXLS']
        }
      }
    }
  };

  constructor(
    private route: ActivatedRoute, 
    private dataService: DashboardChartService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // 🛠️ Dynamically import the modules
      import('highcharts/modules/exporting').then((module) => {
        module.default(Highcharts);
      });

      import('highcharts/modules/export-data').then((module) => {
        module.default(Highcharts);
      });

      // 🛠️ Get ID from query params
      const params = this.route.snapshot.queryParams;
      this.id = params['id'];

      if (this.id) {
        console.log('✅ ID from query params:', this.id);
        
        // 3️⃣ Initialize the chart once ID is available
        if (this.chartContainer) {
          this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
        }

        // 4️⃣ Fetch the data
        this.fetchData(this.id, this.selectedDuration);
      } else {
        console.error('❌ ID not found in query params. Redirecting...');
        // this.router.navigate(['/error-page']); // Redirect if no ID is found
      }
    } catch (error) {
      console.error('❌ Error loading Highcharts modules:', error);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.chartRef) {
      console.log('Resizing chart...');
      this.chartRef.reflow();
    }
  }

  fetchData(id: string, limit: string): void {
    console.log('Fetching data...');
    this.isLoading = true; 
    this.dataService.getData(id, limit).subscribe(
      (data: any[]) => {
        let temperatureData: [number, number][] = [];
        let rainfallData: [number, number][] = [];
        let radData: [number, number][] = [];

        data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);

          if (item.variable === 'Tair_1_Avg') {
            temperatureData.push([timestamp, (value * 1.8) + 32]); 
          } else if (item.variable === 'RF_1_Tot300s') {
            rainfallData.push([timestamp, value / 25.4]); 
          } else if (item.variable === 'SWin_1_Avg') {
            radData.push([timestamp, value]); 
          }
        });

        this.chartOptions.series = [
          { 
            name: 'Temperature (°F)', 
            data: temperatureData, 
            yAxis: 0, 
            type: 'line', 
            color: '#FC7753',
            zIndex: 3
          },
          { 
            name: 'Rainfall (in)', 
            data: rainfallData, 
            yAxis: 1, 
            type: 'column', 
            color: '#058DC7',
            maxPointWidth: 5, // Sets the width of each bar to 10px
            groupPadding: 0.05, // Space between groups of columns
            pointPadding: 0.05, // Space between individual columns
          },
          { 
            name: 'Solar Radiation (W/m²)', 
            data: radData, 
            yAxis: 2, 
            type: 'line', 
            color: '#FFC914' 
          }
        ] as Highcharts.SeriesOptionsType[];

        if (this.chartContainer) {
          this.chartRef = Highcharts.chart(this.chartContainer.nativeElement, this.chartOptions);
          console.log('Chart initialized successfully.');
        }
        this.isLoading = false; 
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false; 
      }
    );
  }

  updateData(): void {
    setTimeout(() => {
      this.updateData();
    }, this.refreshIntervalMS);
  }

  selectDuration(value: string): void {
    this.selectedDuration = value;
    this.onDurationChange();
  }

  onDurationChange(): void {
    if (this.id) {
      this.fetchData(this.id, this.selectedDuration); 
    }
  }

  getLabelForSelectedDuration(): string {
    const selected = this.durations.find(d => d.value === this.selectedDuration);
    return selected ? selected.label : 'Select Duration';
  }
}
