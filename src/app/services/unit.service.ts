import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UnitService {
  private unitSubject = new BehaviorSubject<'standard' | 'metric'>('standard');
  selectedUnit$ = this.unitSubject.asObservable(); // Observable for components

  setUnit(unit: 'standard' | 'metric') {
    this.unitSubject.next(unit);
  }

  getUnit(): Observable<string> { 
    return this.unitSubject.asObservable(); // Ensure it returns an observable
  }

}
