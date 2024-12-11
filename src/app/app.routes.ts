import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { StationMapComponent } from './station-map/station-map.component';
import { StationTableComponent } from './station-table/station-table.component';
import { DataDisplayComponent } from './data-display/data-display.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { Dashboard2Component } from './dashboard-2/dashboard-2.component';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { TestComponent } from './test/test.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Root route displays Home
  { path: 'about', component: AboutComponent }, // About route
  { path: 'station-map', component: StationMapComponent},
  { path: 'station-table', component: StationTableComponent},
  { path: 'data-display', component: DataDisplayComponent},
  { path: 'dashboard', component: DashboardComponent},
  { path: 'dashboard2', component: Dashboard2Component},
  { path: 'dashboard-chart', component:DashboardChartComponent},
  { path: 'test', component: TestComponent},
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
