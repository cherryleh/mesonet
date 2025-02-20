import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GraphingDataService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?local_tz=True';

  constructor(private http: HttpClient) {}

  getData(id: string, vars: string, start_date: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '&location=hawaii';
    const url = `${this.apiUrl}&station_ids=${id}&var_ids=${vars}&start_date=${start_date}${locationParam}`;
    console.log('API request for graphing: ',url);
    return this.http.get<any>(url, { headers });
  }
}
