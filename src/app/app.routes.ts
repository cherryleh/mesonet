import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { StationMapComponent } from './station-map/station-map.component';
import { StationTableComponent } from './station-table/station-table.component';
import { DataDisplayComponent } from './data-display/data-display.component';
// import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardComponent } from './dashboard-page/dashboard/dashboard.component';
import { DashboardChartComponent } from './dashboard-page/dashboard-chart/dashboard-chart.component';
// import { TestComponent } from './test/test.component';
import { GraphingComponent } from './graphing/graphing.component';
import { ClimatologyComponent } from './climatology/climatology.component';
import { StationInfoComponent } from './station-info/station-info.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Root route displays Home
  { path: 'about', component: AboutComponent }, // About route
  { path: 'station-map', component: StationMapComponent},
  { path: 'station-table', component: StationTableComponent},
  { path: 'data-display', component: DataDisplayComponent},
  // { path: 'dashboard', component: DashboardComponent},
  { path: 'dashboard', component: DashboardComponent},
  { path: 'dashboard-chart', component:DashboardChartComponent},
  { path: 'graphing', component: GraphingComponent},
  { path: 'climatology', component: ClimatologyComponent},
  { path: 'station-info', component: StationInfoComponent},
  // { path: 'test', component: TestComponent},
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
