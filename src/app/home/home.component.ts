import { Component } from '@angular/core';
import { StationMapComponent } from '../station-map/station-map.component';
import { StationTableComponent } from '../station-table/station-table.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [StationMapComponent, StationTableComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
