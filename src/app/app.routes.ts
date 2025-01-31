import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { StationSelectionMapComponent } from './station-selection-map/station-selection-map.component';
import { StationTableComponent } from './station-table/station-table.component';
import { DataDisplayComponent } from './data-display/data-display.component';
import { DashboardComponent } from './dashboard-page/dashboard/dashboard.component';
import { DashboardChartComponent } from './dashboard-page/dashboard-chart/dashboard-chart.component';
// import { StationTitleComponent } from './station-title/station-title.component';
import { GraphingComponent } from './graphing/graphing.component';
import { ClimatologyComponent } from './climatology/climatology.component';
import { StationInfoComponent } from './station-info-page/station-info/station-info.component';
import { ReportsComponent } from './reports/reports.component';
import { AcknowledgementsComponent } from './acknowledgements/acknowledgements.component';
import { ReportsDraftComponent } from './reports-draft/reports-draft.component';
import { HighchartMapComponent } from './highchart-map/highchart-map.component';

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
  { path: 'reports-draft', component: ReportsDraftComponent},
  { path: 'highchart-map', component: HighchartMapComponent},
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
