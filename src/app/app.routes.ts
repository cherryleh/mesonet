import { Routes } from '@angular/router';
import { HomeComponent } from './home-page/home/home.component';
import { AboutComponent } from './about/about.component';
import { StationSelectionMapComponent } from './home-page/station-selection-map/station-selection-map.component';
import { StationTableComponent } from './home-page/station-table/station-table.component';
import { DataDisplayComponent } from './data-display/data-display.component';
import { DashboardComponent } from './dashboard-page/dashboard/dashboard.component';
import { DashboardChartComponent } from './dashboard-page/dashboard-chart/dashboard-chart.component';
import { GraphingComponent } from './graphing/graphing.component';
import { ClimatologyComponent } from './climatology/climatology.component';
import { StationInfoComponent } from './station-info-page/station-info/station-info.component';
import { ReportsComponent } from './reports/reports.component';
import { DataMapComponent } from './data-map/data-map.component';
import { AmericanSamoaComponent } from './american-samoa-page/american-samoa/american-samoa.component'
import { DiagnosticMapComponent } from './diagnostic-map/diagnostic-map.component';
import { AcknowledgementsComponent } from './acknowledgements/acknowledgements.component';
import { HowToCiteComponent } from './how-to-cite/how-to-cite.component';
import { WindMapComponent } from './wind-map/wind-map.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Root route displays Home
  { path: 'about', component: AboutComponent }, // About route
  { path: 'station-map', component: StationSelectionMapComponent},
  { path: 'station-table', component: StationTableComponent},
  { path: 'data-display', component: DataDisplayComponent},
  { path: 'dashboard', component: DashboardComponent},
  { path: 'dashboard-chart', component:DashboardChartComponent},
  { path: 'graphing', component: GraphingComponent},
  { path: 'climatology', component: ClimatologyComponent},
  { path: 'station-info', component: StationInfoComponent},
  { path: 'reports', component: ReportsComponent},
  { path: 'acknowledgements', component: AcknowledgementsComponent},
  { path: 'data-map', component: DataMapComponent},
  { path: 'american-samoa', component: AmericanSamoaComponent},
  { path: 'diagnostic-map', component: DiagnosticMapComponent},
  { path: 'acknowledgements', component: AcknowledgementsComponent},
  { path: 'how-to-cite', component: HowToCiteComponent},
  { path: 'wind-map', component: WindMapComponent},
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
