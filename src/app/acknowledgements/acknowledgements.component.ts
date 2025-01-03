import { Component } from '@angular/core';
// import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StationTitleComponent } from '../station-title/station-title.component';

@Component({
  selector: 'app-acknowledgements',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, StationTitleComponent],
  templateUrl: './acknowledgements.component.html',
  styleUrl: './acknowledgements.component.css'
})
export class AcknowledgementsComponent {
  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
}