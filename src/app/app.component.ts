import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone:true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  baseUrl = 'https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#';
  title = 'mesonet';

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.parent.postMessage(window.location.hash, '*');
      }
    });
  }

  @HostListener('document:click', ['$event'])
  handleNavigation(event: MouseEvent) {
    const target = event.target as HTMLAnchorElement;

    // Ensure the target is an <a> element with an href
    if (target.tagName === 'A' && target.href) {
      const isMiddleClick = event.button === 1;
      const isCtrlClick = event.ctrlKey || event.metaKey; // MetaKey for macOS Cmd + Click

      // Force navigation to stay within Hawaii.edu
      if (isMiddleClick || isCtrlClick) {
        event.preventDefault();
        const relativePath = target.getAttribute('href') || '';
        const correctUrl = this.baseUrl + relativePath.replace(/^#/, '');
        window.open(correctUrl, '_blank'); // Open new tab within correct domain
      }
    }
  }
}
