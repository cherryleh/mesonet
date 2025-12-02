import { Injectable } from '@angular/core';

export interface ErrorReport {
  id: string; 
  username: string;
  stationNumber: string;
  variableId: string;
  startDate: string;
  endDate: string;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorReportService {
  private storageKey = 'form_submissions';

  getAll() {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  add(record: Omit<ErrorReport, 'id'>) {
    const newRecord: ErrorReport = {
      id: crypto.randomUUID(),
      ...record
    };

    const existing = this.getAll();
    existing.push(newRecord);
    localStorage.setItem(this.storageKey, JSON.stringify(existing));
  }

}