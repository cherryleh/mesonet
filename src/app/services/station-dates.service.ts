import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StationDatesService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=RF_1_Tot300s&local_tz=True&limit=1&reverse=True';

  constructor(private http: HttpClient) {}

  getData(id: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const url = `${this.apiUrl}&station_ids=${id}`;
    console.log(url);
    return this.http.get<any>(url, { headers });
  }
}
