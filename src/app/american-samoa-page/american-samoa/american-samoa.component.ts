import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsStationSelectionMapComponent } from '../as-station-selection-map/as-station-selection-map.component';
import { AsStationTableComponent } from '../as-station-table/as-station-table.component';
import { RouterModule } from '@angular/router';
import { HomeComponent } from '../../home-page/home/home.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-american-samoa',
  standalone: true,
  imports: [CommonModule, AsStationSelectionMapComponent, AsStationTableComponent, RouterModule, HomeComponent, MatButtonModule], 
  templateUrl: './american-samoa.component.html',
  styleUrl: './american-samoa.component.css'
})
export class AmericanSamoaComponent implements AfterViewInit {
  selectedView: 'map' | 'table' = 'map'; 

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
        this.stationMap?.invalidateSize(); 
      }, 600);
    }
  }
}
