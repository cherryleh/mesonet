import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isCollapsed = false; // Default state

  constructor(private sidebarService: SidebarService) {
    this.isCollapsed = this.sidebarService.getCollapsed();
  }

  // Emit toggle event to parent
  @Output() toggle = new EventEmitter<boolean>();

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarService.setCollapsed(this.isCollapsed); // keep service updated
    this.toggle.emit(this.isCollapsed); // still emit if parent needs it
  }

}
