import { Component, ViewChild, OnInit } from '@angular/core';
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
  showAgreement: boolean = false;

  ngOnInit() {
    const userAgreed = localStorage.getItem('userAgreed');
    if (!userAgreed) {
      this.showAgreement = true; 
    }
  }

  onAgreementAccepted() {
    this.showAgreement = false; 
  }

  selectedView: 'map' | 'table' = 'map'; 

  @ViewChild(StationSelectionMapComponent) stationMap!: StationSelectionMapComponent;

  toggleView(view: 'map' | 'table') {
    this.selectedView = view;

    if (view === 'map') {
      setTimeout(() => {
        this.stationMap?.invalidateMapSize();
      }, 600); 
    }
  }

}
