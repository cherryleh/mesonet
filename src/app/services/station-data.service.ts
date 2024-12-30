import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StationDataService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/stations?&reverse=True';

  constructor(private http: HttpClient) {}

  getStationData(id: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const url = `${this.apiUrl}&station_ids=${id}`;
    console.log(url);
    return this.http.get<any>(url, { headers });
  }
}
