import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UnitService {
  private unitSubject = new BehaviorSubject<'standard' | 'metric'>('standard');
  selectedUnit$ = this.unitSubject.asObservable(); // Observable for components

  setUnit(unit: 'standard' | 'metric') {
    this.unitSubject.next(unit);
  }

  getUnit() {
    return this.unitSubject.getValue();
  }
}
