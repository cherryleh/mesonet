import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GraphingMenuService {
  private selectedDurationSubject: BehaviorSubject<string> = new BehaviorSubject<string>('24h'); // Default to 24h
  private selectedVariableSubject: BehaviorSubject<string> = new BehaviorSubject<string>('RF_1_Tot300s'); // Default to Rainfall

  constructor() { }

  /**
   * Sets the selected duration.
   * @param duration The selected duration value (e.g., '24h', '7d', '30d').
   */
  setDuration(duration: string): void {
    this.selectedDurationSubject.next(duration);
  }

  /**
   * Gets the current selected duration as an observable.
   * @returns Observable of the selected duration.
   */
  getDuration(): Observable<string> {
    return this.selectedDurationSubject.asObservable();
  }

  /**
   * Sets the selected variable(s).
   * @param variable The selected variable value (e.g., 'RF_1_Tot300s', 'SM_1_Avg', or 'RF_1_Tot300s,SM_1_Avg').
   */
  setVariable(variable: string): void {
    this.selectedVariableSubject.next(variable);
  }

  /**
   * Gets the current selected variable(s) as an observable.
   * @returns Observable of the selected variable(s).
   */
  getVariable(): Observable<string> {
    return this.selectedVariableSubject.asObservable();
  }
  getDateMinusDaysInHST(days: number): string {
    const currentDate = new Date();
    const dateMinusHours = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const hawaiiTimeFormat = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = hawaiiTimeFormat.formatToParts(dateMinusHours).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}-10:00`;
  }
  
}
