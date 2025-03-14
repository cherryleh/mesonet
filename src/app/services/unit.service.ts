import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UnitService {
  private unitSubject = new BehaviorSubject<'imperial' | 'metric'>('imperial');
  selectedUnit$ = this.unitSubject.asObservable(); // Observable for components

  setUnit(unit: 'imperial' | 'metric') {
    this.unitSubject.next(unit);
  }

  getUnit() {
    return this.unitSubject.getValue();
  }
}
