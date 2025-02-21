import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsStationSelectionMapComponent } from '../as-station-selection-map/as-station-selection-map.component';
import { AsStationTableComponent } from '../as-station-table/as-station-table.component';

@Component({
  selector: 'app-american-samoa',
  standalone: true,
  imports: [CommonModule, AsStationSelectionMapComponent, AsStationTableComponent], // Added CommonModule
  templateUrl: './american-samoa.component.html',
  styleUrl: './american-samoa.component.css'
})
export class AmericanSamoaComponent implements AfterViewInit {
  selectedView: 'map' | 'table' = 'map'; // Default to the map view

  @ViewChild(AsStationSelectionMapComponent) stationMap!: AsStationSelectionMapComponent;

  ngAfterViewInit() {
    if (this.selectedView === 'map') {
      setTimeout(() => {
        this.stationMap?.invalidateSize();
      }, 600);
    }
  }

  toggleView(view: 'map' | 'table') {
    this.selectedView = view;

    if (view === 'map') {
      setTimeout(() => {
        this.stationMap?.invalidateSize(); // Updated method name
      }, 600);
    }
  }
}
