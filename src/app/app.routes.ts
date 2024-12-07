import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { StationMapComponent } from './station-map/station-map.component';
import { StationTableComponent } from './station-table/station-table.component';
import { DataDisplayComponent } from './data-display/data-display.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Root route displays Home
  { path: 'about', component: AboutComponent }, // About route
  { path: 'station-map', component: StationMapComponent},
  { path: 'station-table', component: StationTableComponent},
  { path: 'data-display', component: DataDisplayComponent},
  { path: 'dashboard', component: DashboardComponent},
  { path: 'dashboard-chart', component:DashboardChartComponent},
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
