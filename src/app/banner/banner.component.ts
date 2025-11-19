import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div
    class="banner"
    [class.sidebar]="sidebar"
    [class.collapsed]="collapsed"
    *ngIf="message"
  >
    {{ message }}
  </div>

  `,
  styleUrls: ['./banner.component.css']
})
export class BannerComponent {
  @Input() message: string | null = null;
  @Input() collapsed: boolean = false;
  @Input() sidebar: boolean = false;
}
