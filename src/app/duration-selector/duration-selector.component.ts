import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DurationService } from '../../dashboard-chart-dropdown.service';

@Component({
  selector: 'app-duration-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duration-selector.component.html',
  styleUrls: ['./duration-selector.component.css']
})
export class DurationSelectorComponent {
  durations = [
    { label: 'Last 24 Hours', value: '1' },
    { label: 'Last 3 Days', value: '3' },
    { label: 'Last 7 Days', value: '7' },
  ];

  selectedDuration = '1'; 
  selectDuration(value: string): void {
    this.selectedDuration = value; 
    console.log(`Selected duration changed to: ${value}`);
  }

  
  constructor(private durationService: DurationService) {}

  onDurationChange(value: string): void {
    this.selectedDuration = value; // Update local selection
    console.log(`Selected duration changed to: ${value}`);
    this.durationService.setSelectedDuration(value); // Update shared state using the DurationService
  }

  getLabelForSelectedDuration(): string {
    const selected = this.durations.find(d => d.value === this.selectedDuration);
    return selected ? selected.label : 'Select Duration';
  }

}
