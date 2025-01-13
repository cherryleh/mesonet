import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../header/header.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { StationTitleComponent } from '../../station-title/station-title.component';
import { StationSpecificMapComponent } from '../station-specific-map/station-specific-map.component';
import { StationDatesService } from '../../services/station-dates.service';
import { StationDataService } from '../../services/station-info.service';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-station-info',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, StationTitleComponent, StationSpecificMapComponent],
  templateUrl: './station-info.component.html',
  styleUrls: ['./station-info.component.css']
})
export class StationInfoComponent implements OnInit, OnDestroy {
  stationId: string = '';
  startDate: Date | null = null; // Original date object
  stationStartDate: string = ''; // Formatted date string
  elevation: number | null = null;
  lat: number | null = null;
  lon: number | null = null;

  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private stationDatesService: StationDatesService,
    private stationDataService: StationDataService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID from URL:', this.stationId);

      this.fetchStationData();
    });
  }


  fetchStationData(): void {
    // Combine multiple API calls using forkJoin
    this.subscription.add(
      forkJoin({
        // Fetch station start date
        dates: this.stationDatesService.getData(this.stationId),
        // Fetch station metadata
        metadata: this.stationDataService.getStationData(this.stationId)
      }).subscribe({
        next: (results) => {
          console.log('Combined API Results:', results);
          const datesResponse = results.dates;
          const date = datesResponse[0]?.timestamp ? new Date(datesResponse[0].timestamp) : null;
          if (date && !isNaN(date.getTime())) {
            this.stationStartDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            console.log('Formatted Start Date:', this.stationStartDate);
          } else {
            console.warn('Invalid timestamp received:', datesResponse[0]?.timestamp);
          }

          const metadataResponse = results.metadata;
          if (metadataResponse && metadataResponse.length > 0) {
            const station = metadataResponse[0];
            this.elevation = station.elevation;
            this.lat = station.lat.toFixed(2);
            this.lon = station.lng.toFixed(2);
            console.log('Elevation:', this.elevation);
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
