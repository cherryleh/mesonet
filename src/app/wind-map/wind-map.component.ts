import { Component, AfterViewInit, ViewEncapsulation } from '@angular/core';

declare var L: any;

@Component({
  selector: 'app-wind-map',
  standalone: true,
  imports: [],
  templateUrl: './wind-map.component.html',
  styleUrl: './wind-map.component.css',
  encapsulation: ViewEncapsulation.None
})
export class WindMapComponent implements AfterViewInit {
  private map: any;

  ngAfterViewInit(): void {
    this.waitForWindBarb().then(() => {
      this.initMap();
    }).catch((err) => {
      console.error('WindBarb plugin did not load properly:', err);
    });
  }


  private initMap(): void {
    this.map = L.map('map', {
      center: [20.493410, -158.064388],
      zoom: 8,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const meteoPoints = [
      [20.8415, -156.2948, 5, 190],
      [21.905295, -159.510395, 30, 90],
      [19.834341, -155.122435, 47, 170]
    ];

    meteoPoints.forEach(p => {
      const icon = L.WindBarb.icon({ deg: p[3], speed: p[2] });
      L.marker([p[0], p[1]], { icon: icon })
        .addTo(this.map)
        .bindPopup(`<p>Wind Speed: ${p[2]}</p><p>Wind Direction: ${p[3]}</p>`);
    });
  }


  private waitForWindBarb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptId = 'leaflet-windbarb-js';

      // If already loaded, just wait for it
      if ((window as any).L?.WindBarb) {
        console.log('✅ WindBarb already loaded');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'assets/libs/leaflet-windbarb.js';
      script.onload = () => {
        if ((window as any).L?.WindBarb) {
          console.log('✅ WindBarb plugin loaded dynamically');
          resolve();
        } else {
          reject('⚠️ WindBarb script loaded but did not attach to L');
        }
      };
      script.onerror = () => reject('❌ Failed to load leaflet-windbarb.js');
      document.body.appendChild(script);
    });
  }

}
