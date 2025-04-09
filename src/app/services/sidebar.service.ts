// sidebar.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private collapsed$ = new BehaviorSubject<boolean>(false);
  isCollapsed$ = this.collapsed$.asObservable();

  toggle() {
    this.collapsed$.next(!this.collapsed$.value);
  }

  setCollapsed(value: boolean) {
    this.collapsed$.next(value);
  }

  getCollapsed(): boolean {
    return this.collapsed$.value;
  }

  
}
