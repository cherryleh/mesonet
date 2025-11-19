import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { BannerComponent } from '../../banner/banner.component';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-station-info',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    StationTitleComponent,
    StationSpecificMapComponent,
    BannerComponent
  ],
  templateUrl: './station-info.component.html',
  styleUrls: ['./station-info.component.css']
})
export class StationInfoComponent implements OnInit, OnDestroy {
  stationId: string = '';
  stationStartDate: string = ''; 
  elevationFeet: number | null = null;
  elevationMeters: number | null = null;
  lat: number | null = null;
  lon: number | null = null;
  status: string = '';
  isCollapsed = false;
  bannerMessage: string | null = null;
  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private stationDatesService: StationDatesService,
    private stationDataService: StationDataService,
    private sidebarService: SidebarService,
    private bannerService: BannerService
  ) {}

  ngOnInit(): void {
    this.bannerService.banner$.subscribe(msg => {
      this.bannerMessage = msg;
    });
    this.bannerService.set(this.bannerService.messages.maintenance);
    console.log('[StationInfoComponent] ngOnInit');
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || '';
      if (this.stationId) {
        this.fetchStationData();
      }
    });

    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(value => {
        this.isCollapsed = value;
      })
    );
  }

  fetchStationData(): void {
    console.log('FETCHING STATION DATA');
    this.subscription.add(
      forkJoin({
        minDate: this.stationDatesService.getMinDate(this.stationId).pipe(
          map((res: any[]) => res[0]?.timestamp ? new Date(res[0].timestamp) : null)
        ),
        metadata: this.stationDataService.getStationData(this.stationId)
      }).subscribe({
        next: (results) => {
          /** ---------- HANDLE MIN DATE ---------- */
          const date = results.minDate;
          if (date && !isNaN(date.getTime())) {
            this.stationStartDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } else {
            console.warn('Invalid or missing timestamp:', date);
          }

          /** ---------- HANDLE METADATA ---------- */
          const metadataResponse = results.metadata;
          if (metadataResponse && metadataResponse.length > 0) {
            const station = metadataResponse[0];

            // Convert strings → numbers safely
            this.elevationMeters = station.elevation ? +station.elevation : null;
            this.elevationFeet = this.elevationMeters !== null
              ? Math.round(this.elevationMeters * 3.28084)
              : null;

            this.lat = station.lat ? +station.lat : null;
            this.lon = station.lng ? +station.lng : null;
            this.status = station.status || '';

            console.log('[StationInfoComponent] Metadata loaded:', {
              id: this.stationId,
              name: station.full_name,
              status: this.status,
              lat: this.lat,
              lon: this.lon
            });
          } else {
            console.warn('No metadata found for ID:', this.stationId);
          }
        },
        error: (error) => {
          console.error('Error fetching station data:', error);
        }
      })
    );
  }

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
