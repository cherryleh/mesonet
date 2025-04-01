import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { UserAgreementComponent } from './user-agreement/user-agreement.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router'; // ✅ Import this

declare let gtag: Function; // ✅ Needed for GA4 tracking if using gtag.js

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, UserAgreementComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  baseUrl = 'https://www.hawaii.edu/climate-data-portal/hawaii-mesonet-data/#';
  title = 'mesonet';
  showModal: boolean = false; 

  constructor(private router: Router, private route: ActivatedRoute) {
    this.showModal = localStorage.getItem('userAgreed') !== 'true';

    this.route.queryParams.subscribe(params => {
      const source = params['source'];
      if (source === 'iframe') {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

        if (source === 'iframe') {
          console.log('App loaded via iframe');

          if (typeof gtag === 'function') {
            gtag('event', 'iframe_view', {
              event_category: 'Engagement',
              event_label: 'App loaded in iframe',
              environment: isLocal ? 'development' : 'production', // 🔥 Custom param
            });
          }
        }

      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.parent.postMessage(window.location.hash, '*');
        this.updateLinkHrefs();
      }
    });
  }

  hideModal() {
    localStorage.setItem('userAgreed', 'true'); 
    this.showModal = false;
  }

  ngAfterViewInit() {
    this.updateLinkHrefs();
  }

  @HostListener('document:click', ['$event'])
  handleNavigation(event: MouseEvent) {
    const target = event.target as HTMLAnchorElement;

    if (target.tagName === 'A' && target.href) {
      const isMiddleClick = event.button === 1;
      const isCtrlClick = event.ctrlKey || event.metaKey;

      if (isMiddleClick || isCtrlClick) {
        event.preventDefault();
        const relativePath = target.getAttribute('href') || '';
        const correctUrl = this.baseUrl + relativePath.replace(/^#/, '');
        window.open(correctUrl, '_blank');
      }
    }
  }

  private updateLinkHrefs() {
    setTimeout(() => {
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          link.setAttribute('href', this.baseUrl + href.replace(/^#/, ''));
          link.setAttribute('target', '_blank');
        }
      });
    }, 100);
  }
}
