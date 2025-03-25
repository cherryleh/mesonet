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
      title: "Funding Support",
      content: "This project has been supported by the National Science Foundation (NSF) Award #XXXXXXX and additional funding from the University of Hawaii and local stakeholders."
    },
    {
      title: "Collaborators",
      content: "We acknowledge the contributions of the Hawaii Data Science Institute, the University of Hawaii at Manoa, and various research institutions that have supported climate data collection and dissemination."
    },
    {
      title: "Data Providers",
      content: "We sincerely appreciate the efforts of the Hawaii Climate Data Portal team, the National Weather Service, and other agencies that provide continuous climate and meteorological data."
    },
    {
      title: "Funding Support",
      content: "This project has been supported by the National Science Foundation (NSF) Award #XXXXXXX and additional funding from the University of Hawaii and local stakeholders."
    }
  ];

}