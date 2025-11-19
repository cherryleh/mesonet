import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BannerService {

  messages = {
    maintenance: 'System maintenance is scheduled for November 20, 2025. Data access may be interrupted for a few hours during the day.',
    apiError: 'Error retrieving data. Please try again later.',
  };

  private bannerSubject = new BehaviorSubject<string | null>(null);
  banner$ = this.bannerSubject.asObservable();

  set(message: string | null) {
    this.bannerSubject.next(message);
  }

  clear() {
    this.bannerSubject.next(null);
  }
}
