import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CumulativeService {
  private totalRainfallSubject = new BehaviorSubject<number>(0); // Initialize with 0
  totalRainfall$ = this.totalRainfallSubject.asObservable(); // Expose observable for real-time updates

  updateTotalRainfall(total: number): void {
    this.totalRainfallSubject.next(total);
  }
}
