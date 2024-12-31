import { Component, OnInit } from '@angular/core';
import { StationDataService } from '../services/station-info.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-station-title',
  standalone: true,
  imports: [],
  templateUrl: './station-title.component.html',
  styleUrls: ['./station-title.component.css'] // Fixed 'styleUrl' to 'styleUrls'
})
export class StationTitleComponent implements OnInit {
  stationName: string = ''; 
  timestamp: string = '';
  id: string | null = null; 

  constructor(
    private stationDataService: StationDataService,
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
          this.stationName = response[0].name;
          console.log('Station Name:', this.stationName);
        }
      },
      error: (error) => {
        console.error('Error fetching station data:', error);
      },
    });
  }
}
