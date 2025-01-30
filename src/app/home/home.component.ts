import { Component } from '@angular/core';
import { StationSelectionMapComponent } from '../station-selection-map/station-selection-map.component';
import { StationTableComponent } from '../station-table/station-table.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [StationSelectionMapComponent, StationTableComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
