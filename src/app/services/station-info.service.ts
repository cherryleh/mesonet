import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StationDataService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?';

  constructor(private http: HttpClient) {}

  getStationData(id: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true' 
    });
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '&location=hawaii';
    const url = `${this.apiUrl}&station_ids=${id}${locationParam}`;
    console.log('Fetching for station metadata: ',url);
    return this.http.get<any>(url, { headers });
  }
}
