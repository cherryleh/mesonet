import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationSelectionMapComponent } from '../station-selection-map/station-selection-map.component';
import { StationTableComponent } from '../station-table/station-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, StationSelectionMapComponent, StationTableComponent, MatButtonModule,
    MatIconModule,RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  selectedView: 'map' | 'table' = 'map'; // Default to the map view

  @ViewChild(StationSelectionMapComponent) stationMap!: StationSelectionMapComponent;

  toggleView(view: 'map' | 'table') {
    this.selectedView = view;

    // Wait for the CSS transition to finish before resizing the map
    if (view === 'map') {
      setTimeout(() => {
        this.stationMap?.invalidateMapSize();
      }, 600); // Increased delay to match CSS transition time (0.5s)
    }
  }

}
