import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';


@Component({
  selector: 'app-climatology',
  standalone: true,
  imports: [RouterModule, HeaderComponent, SidebarComponent, StationTitleComponent],
  templateUrl: './climatology.component.html',
  styleUrl: './climatology.component.css'
})
export class ClimatologyComponent {

}
