import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';


@Component({
  selector: 'app-station-info',
  standalone: true,
  imports: [RouterModule, HeaderComponent, SidebarComponent,],
  templateUrl: './station-info.component.html',
  styleUrl: './station-info.component.css'
})
export class StationInfoComponent {

}
