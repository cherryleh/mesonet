import { Component } from '@angular/core';
// import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-acknowledgements',
  standalone: true,
  imports: [HeaderComponent,  CommonModule],
  templateUrl: './acknowledgements.component.html',
  styleUrl: './acknowledgements.component.css'
})
export class AcknowledgementsComponent {
  isCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }

  acknowledgements = [
    {
      title: "Core Leadership Team",
      content: "X"
    },
    {
      title: "Station Stewards",
      content: "X"
    },
    {
      title: "IT",
      content: "X"
    },
    {
      title: "Funding Support",
      content: "This project has been supported by..."
    }
  ];

}