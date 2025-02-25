import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DurationService } from '../../services/dashboard-chart-dropdown.service';

@Component({
  selector: 'app-duration-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duration-selector.component.html',
  styleUrls: ['./duration-selector.component.css']
})
export class DurationSelectorComponent {
  selectedDuration: string = '1'; // Default to Last 24 Hours

  durations = [
    { label: 'Last 24 Hours', value: '1' },
    { label: 'Last 3 Days', value: '3' },
    { label: 'Last 7 Days', value: '7' },
  ];

  durationLabels: Record<string, string> = {
    '1': 'Last 24 Hours',
    '3': 'Last 3 Days',
    '7': 'Last 7 Days',
  };

  constructor(private durationService: DurationService) {
    // Subscribe to changes in the service to update selectedDuration
    this.durationService.selectedDuration$.subscribe((duration) => {
      this.selectedDuration = duration;
    });
  }

  selectDuration(value: string): void {
    this.selectedDuration = value; // Update local state
    this.durationService.setSelectedDuration(value); 
  }

  getLabelForSelectedDuration(): string {
    const selected = this.durations.find(d => d.value === this.selectedDuration);
    return selected ? selected.label : 'Last 24 Hours'; // Use "Last 24 Hours" as the default instead of "Select Duration"
  }
}
