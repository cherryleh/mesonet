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

  stationHosts = [
    {
      island: "Oʻahu",
      entries: [
        "Honolulu Board of Water Supply - Ernie Lau, Barry Usagawa, Michael Matsuo",
        "Harold L. Lyon Arboretum",
        "Oahu Country Club - Ryan Borris",
        "Hiʻipaka LLC dba Waimea Valley - Parker Powell and field team",
        "Kualoa Ranch - Taylor Kellerman"
      ]
    },
    {
      island: "Kauaʻi",
      entries: [
        "The Hanalei Initiative",
        "Waipā Foundation",
        "Limahuli Garden & Preserve, National Tropical Botanical Garden",
        "Allerton Garden, National Tropical Botanical Garden - Tobias Koehler",
        "Common Ground",
        "Grove Farm - Kevin Reyes and Braden Kobayashi",
        "Kaua‘i Ranch - Jeff Rivera",
        "Kauaʻi Department of Land and Natural Resources"
      ]
    },
    {
      island: "Maui",
      entries: [
        "The Nature Conservancy of Maui",
        "Haleakalā Ranch",
        "Chris Bachaus, Mae Nakahata, and HI DOE",
        "Ulupalakua Ranch",
        "Puu Kukui Watershed",
        "Kipuka Olowalu",
        "Maui Department of Water Supply",
        "East Maui Irrigation",
        "Haleakalā National Park",
        "Donna Sterling, Ernie Domingo, and the Kahikinui Community",
        "CTHAR, UHM",
        "DLNR Division of Forestry and Wildlife: Native Ecosystems Protection & Management"
      ]
    },
    {
      island: "Molokaʻi",
      entries: [
        "Puʻu O Hoku Ranch",
        "Molokaʻi Land Trust",
        "The Nature Conservancy of Molokaʻi",
        "Maui Department of Water Supply",
        "Bayer"
      ]
    },
    {
      island: "Hawaiʻi Island",
      entries: [
        "Institute of Pacific Islands Forestry, USDA Forest Service",
        "Hawaiʻi County Department of Water Supply - Greg Goodale",
        "Hawaiʻi Volcanoes National Park - Sierra McDaniel",
        "The Nature Conservancy - Christopher Balzotti and Shalyn Crysdale",
        "ʻIole Hawaiʻi - Aubrie Christensen",
        "Parker Ranch - Zachary Judd",
        "Kealakekua Ranch - Greg Hendrickson",
        "Ponoholo Ranch - John Richards",
        "Queen Emma Foundation - Kauilehuamelemele Kauhane",
        "Forest Solutions - Robbie Justice",
        "The Fish and Wildlife Service",
        "Hawaiʻi Island Natural Area Reserve - Nicholas Agorastos",
        "Kohala Watershed Partnership - Mahina Patterson",
        "Hawaiʻi Academy of Arts and Science - McLean Eames",
        "Akaka Foundation - Nehu Shaw",
        "Department of Hawaiian Homelands - Kūaliʻi Kamara",
        "Pōhakuloa Training Area",
        "Punahoa Heritage Forest - Toni Bissen"
      ]
    }
  ];


  acknowledgements = [
    {
      title: "Core Leadership Team",
      names: ["Tom Giambelluca", "Chris Shuler", "Han Tseng"]
    },
    {
      title: "Project Co-PIs",
      names: ["Yinphan Tsang", "Dave Beilman", "Alison Nugent", "Abby Frazier"]
    },
    {
      title: "Installation Team",
      names: ["Dylan Giardina", "Cory Yap", "Chris Shuler", "Sam Dodge", "Anke Krueger", "John DeLay"]
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