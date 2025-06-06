import { Component, OnInit, Input } from '@angular/core';
import { StationDataService } from '../services/station-info.service';
import { StationDatesService } from '../services/station-dates.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-station-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-title.component.html',
  styleUrls: ['./station-title.component.css'] // Fixed 'styleUrl' to 'styleUrls'
})
export class StationTitleComponent implements OnInit {
  stationName: string = ''; 
  stationID: string = ''; 
  timestamp: string = '';
  status: string = '';
  isInactive: boolean = false;
  isPlanned: boolean = false;
  id: string | null = null;

  @Input() isCollapsed: boolean = false;

  constructor(
    private stationDataService: StationDataService,
    private stationDatesService: StationDatesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this.fetchStationData(this.id);
      }
    });
  }

  fetchStationData(id: string): void {
    this.stationDataService.getStationData(id).subscribe({
      next: (response) => {
        if (response.length > 0) {
          const station = response[0];
          this.stationName = station.full_name;
          this.stationID = station.station_id;
          this.status = station.status;
          const statusLower = station.status?.toLowerCase();
          this.isInactive = statusLower === 'inactive';
          this.isPlanned = statusLower === 'planned';

          if (this.isInactive || this.isPlanned) {
            this.stationDatesService.getData(id).subscribe({
              next: (res) => {
                if (res.maxDate) {
                  this.timestamp = res.maxDate.toISOString();
                }
              },
              error: (err) => console.error('Error fetching timestamp:', err)
            });
          }
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });
  }



  
}

