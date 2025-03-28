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
  private windDataUrl = 'https://raw.githubusercontent.com/cherryleh/mesonet/refs/heads/data-branch/data/wind.json';

  ngAfterViewInit(): void {
    this.waitForWindBarb().then(() => {
      this.initMap();
      this.loadWindData();
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
  }

  private loadWindData(): void {
    fetch(this.windDataUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        this.plotWindBarbs(data);
      })
      .catch(error => {
        console.error('Error loading wind data:', error);
      });
  }

  private plotWindBarbs(data: any): void {
    Object.entries(data).forEach(([id, entry]: [string, any]) => {
      if (
        entry == null ||
        entry.lat == null ||
        entry.lon == null ||
        entry.value_WDrs == null
      ) {
        console.warn(`⚠️ Skipping entry ${id}:`, entry);
      }
    });

    Object.values(data).forEach((entry: any) => {
      if (
        entry == null ||
        entry.lat == null ||
        entry.lon == null ||
        entry.value_WDrs == null
      ) {
        return;
      }

      const lat = entry.lat;
      const lon = entry.lon;
      const direction = parseFloat(entry.value_WDrs);
      const speedMS = entry.value_WS !== null ? parseFloat(entry.value_WS) : 0;
      const speedKnots = speedMS * 1.94384;

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(direction)) {
        const icon = L.WindBarb.icon({ deg: direction, speed: speedKnots });
        L.marker([lat, lon], { icon: icon })
          .addTo(this.map)
          .bindPopup(`
            <p><strong>Wind Direction:</strong> ${direction}°</p>
            <p><strong>Wind Speed:</strong> ${speedMS.toFixed(2)} m/s (${speedKnots.toFixed(2)} knots)</p>
            <p><strong>Timestamp:</strong> ${entry.timestamp}</p>
          `);
      }

    });
  }

  private waitForWindBarb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptId = 'leaflet-windbarb-js';

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
