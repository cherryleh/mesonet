import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Root route displays Home
  { path: 'about', component: AboutComponent }, // About route
  { path: '**', redirectTo: '' } // Wildcard route redirects to Home
];
