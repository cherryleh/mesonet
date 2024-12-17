import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class cumulativeService {
  private totalRainfallSubject = new BehaviorSubject<number>(0); 
  totalRainfall$ = this.totalRainfallSubject.asObservable(); 

  private messageSubject = new BehaviorSubject<string>(''); 
  message$ = this.messageSubject.asObservable(); 
  updateTotalRainfall(total: number): void {
    this.totalRainfallSubject.next(total);
  }

  updateMessage(message: string): void {
    this.messageSubject.next(message);
  }
}
