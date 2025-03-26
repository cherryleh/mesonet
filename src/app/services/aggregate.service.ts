import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class aggregateService {
  private totalRainfallSubject = new BehaviorSubject<number>(0);
  totalRainfall$ = this.totalRainfallSubject.asObservable();

  private durationTextSubject = new BehaviorSubject<string>('24-hour');
  durationText$ = this.durationTextSubject.asObservable();

  setDurationText(duration: string) {
    let displayText = '';
    switch (duration) {
      case '24-hour':
        displayText = '24-hour';
        break;
      case '3-day':
        displayText = '3-day';
        break;
      case '7-day':
        displayText = '7-day';
        break;
      default:
        displayText = duration;
    }
    this.durationTextSubject.next(displayText);
  }

  private meanTempSubject = new BehaviorSubject<number>(0);
  meanTemp$ = this.meanTempSubject.asObservable();

  private minTempSubject = new BehaviorSubject<number>(0);
  minTemp$ = this.minTempSubject.asObservable();

  private maxTempSubject = new BehaviorSubject<number>(0);
  maxTemp$ = this.maxTempSubject.asObservable();

  private meanSolarRadSubject = new BehaviorSubject<number>(0);
  meanSolarRad$ = this.meanSolarRadSubject.asObservable();

  updateTotalRainfall(totalRainfall: number): void {
    this.totalRainfallSubject.next(totalRainfall);
  }

  updateMeanTemp(meanTemp: number): void {
    this.meanTempSubject.next(meanTemp);
  }

  updateMinTemp(minTemp: number): void {
    this.minTempSubject.next(minTemp);
  }

  updateMaxTemp(maxTemp: number): void {
    this.maxTempSubject.next(maxTemp);
  }

  updateMeanSolarRad(meanSolarRad: number): void {
    this.meanSolarRadSubject.next(meanSolarRad);
  }

  updateDurationText(durationText: string): void {
    this.durationTextSubject.next(durationText);
  }
}
