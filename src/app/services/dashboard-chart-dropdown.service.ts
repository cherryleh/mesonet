import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DurationService {
  private selectedDurationSource = new BehaviorSubject<string>('1'); // Default duration is '1' (Last 24 hours)
  selectedDuration$ = this.selectedDurationSource.asObservable(); // Observable to subscribe to

  setSelectedDuration(duration: string) {
    this.selectedDurationSource.next(duration); // Update the selected duration
  }
}
