import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../header/header.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { StationTitleComponent } from '../../station-title/station-title.component';
import { StationSpecificMapComponent } from '../station-specific-map/station-specific-map.component';
import { StationDatesService } from '../../services/station-dates.service';
import { StationDataService } from '../../services/station-info.service';
import { SidebarService } from '../../services/sidebar.service';
import { Subscription, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';


@Component({
  selector: 'app-station-info',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidebarComponent, StationTitleComponent, StationSpecificMapComponent],
  templateUrl: './station-info.component.html',
  styleUrls: ['./station-info.component.css']
})
export class StationInfoComponent implements OnInit, OnDestroy {
  stationId: string = '';
  startDate: Date | null = null; 
  stationStartDate: string = ''; 
  elevation: number | null = null;
  elevationMeters: number | null = null;
  lat: number | null = null;
  lon: number | null = null;
  status: string = '';
  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private stationDatesService: StationDatesService,
    private stationDataService: StationDataService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    console.log('[StationInfoComponent] ngOnInit');
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; 

      this.fetchStationData();
    });

    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(value => {
        this.isCollapsed = value;
      })
    );
  }


  fetchStationData(): void {
    console.log('FETCHING STATION DATA'),
    this.subscription.add(
      forkJoin({
        minDate: this.stationDatesService.getMinDate(this.stationId).pipe(
          map((res: any[]) => res[0]?.timestamp ? new Date(res[0].timestamp) : null)
        ),

        metadata: this.stationDataService.getStationData(this.stationId)
      }).subscribe({
        next: (results) => {
          const date = results.minDate;
          if (date && !isNaN(date.getTime())) {
            this.stationStartDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } else {
            console.warn('Invalid timestamp received:', date);
          }


          const metadataResponse = results.metadata;
          if (metadataResponse && metadataResponse.length > 0) {
            const station = metadataResponse[0];
            this.elevation = station.elevation;
            this.elevationMeters = this.elevation !== null ? +(this.elevation * 0.3048).toFixed(0) : null; 
            this.lat = station.lat.toFixed(2);
            this.lon = station.lng.toFixed(2);
            this.status = station.status;
          } else {
            console.warn('No station data found for ID:', this.stationId);
          }
        },
        error: (error) => {
          console.error('Error fetching station data:', error);
        }
      })
    );
  }




  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
