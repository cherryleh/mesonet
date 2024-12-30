import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../header/header.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { StationTitleComponent } from '../../station-title/station-title.component';
import { StationSpecificMapComponent } from '../station-specific-map/station-specific-map.component';
import { StationDatesService } from '../../services/station-dates.service';
import { Subscription } from 'rxjs';

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

  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private stationDatesService: StationDatesService
  ) {}

  ngOnInit(): void {
    // Get station ID from query parameters
    this.route.queryParams.subscribe(params => {
      this.stationId = params['id'] || 'default_station_id'; // Default ID if none is provided
      console.log('Station ID from URL:', this.stationId);

      // Fetch data for the station
      this.fetchStationData();
    });
  }

  fetchStationData(): void {
    this.subscription.add(
      this.stationDatesService.getData(this.stationId).subscribe({
        next: (response) => {
          const date = response[0]?.timestamp ? new Date(response[0].timestamp) : null;
          if (date && !isNaN(date.getTime())) {
            this.startDate = date;
            this.stationStartDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            console.log('Formatted Start Date:', this.stationStartDate);
          } else {
            console.warn('Invalid timestamp received:', response[0]?.timestamp);

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
