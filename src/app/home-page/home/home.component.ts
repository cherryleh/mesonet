import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationSelectionMapComponent } from '../station-selection-map/station-selection-map.component';
import { StationTableComponent } from '../station-table/station-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BannerComponent } from '../../banner/banner.component';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, StationSelectionMapComponent, StationTableComponent, MatButtonModule,
    MatIconModule,RouterModule, BannerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  showAgreement: boolean = false;
  constructor(private bannerService: BannerService) {}

  bannerMessage: string | null = null
  ngOnInit() {
    this.bannerService.banner$.subscribe(msg => {
      this.bannerMessage = msg;
    });
    this.bannerService.set(this.bannerService.messages.maintenance);
    
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
