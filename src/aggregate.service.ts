import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class aggregateService {
  private totalRainfallSubject = new BehaviorSubject<number>(0); 
  totalRainfall$ = this.totalRainfallSubject.asObservable(); 

  private durationTextSubject = new BehaviorSubject<string>(''); 
  durationText$ = this.durationTextSubject.asObservable(); 

  private meanTempSubject = new BehaviorSubject<string>(''); 
  meanTemp$ = this.meanTempSubject.asObservable(); 

  private minTempSubject = new BehaviorSubject<string>(''); 
  minTemp$ = this.minTempSubject.asObservable(); 

  private maxTempSubject = new BehaviorSubject<string>(''); 
  maxTemp$ = this.maxTempSubject.asObservable(); 

  updateTotalRainfall(total: number): void {
    this.totalRainfallSubject.next(total);
  }

  updateDurationText(durationText: string): void {
    this.durationTextSubject.next(durationText);
  }
}
