import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CumulativeService {
  // Rainfall BehaviorSubject
  private totalRainfallSubject = new BehaviorSubject<number>(0); // Initialize with 0
  totalRainfall$ = this.totalRainfallSubject.asObservable(); // Expose observable for real-time updates

  // New Text BehaviorSubject
  private messageSubject = new BehaviorSubject<string>(''); // Initialize with empty string
  message$ = this.messageSubject.asObservable(); // Expose observable for real-time updates

  updateTotalRainfall(total: number): void {
    this.totalRainfallSubject.next(total);
  }

  updateMessage(message: string): void {
    this.messageSubject.next(message);
  }
}
