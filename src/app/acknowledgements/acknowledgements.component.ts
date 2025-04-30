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
      names: ["Tom Giambelluca", "Chris Shuler", "Han Tseng"]
    },
    {
      title: "Project Co-PIs",
      names: ["Yin-Phan Tsang", "Dave Beilman", "Alison Nugent", "Abby Frazier"]
    },
    {
      title: "Installation Team",
      names: ["Dylan Giardina", "Chris Shuler", "Sam Dodge", "Anke Krueger", "John DeLay"]
    },
    {
      title: "Data Management Team",
      names: ["Matty Lucas", "Jared McLean", "Sean Cleveland", "Ryan Longman", "Keri Kodama"]
    },
    {
      title: "Data Visualization Team",
      names: ["Cherryle Heu", "RJ Tabalba, Jr", "Nurit Kirshenbaum", "Marissa Halim", "Jason Leigh"]
    },
    {
      title: "Technical Support",
      names: ["Isaac Fjeldsted, Campbell Scientific", "Brian Olsen, Campbell Scientific", "Bart Nef, Campbell Scientific", "Brent Whittier, Campbell Scientific"],
    },
    {
      title: "Funding",
      content: "This work is supported by the National Science Foundation under award number 2117975, and by funding provided by the Honolulu Board of Water Supply, Hawaiʻi Commission on Water Resource Management, University of Hawaiʻi, Hawaiʻi State Legislature, and the National Oceanic and Atmospheric Administration through the National Mesonet Program."
    }
  ];


}