import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GraphingDataService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&local_tz=True';

  constructor(private http: HttpClient) {}

  getData(id: string, vars: string, start_date: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const url = `${this.apiUrl}&station_ids=${id}&var_ids=${vars}&start_date=${start_date}`;
    console.log(start_date);
    console.log(url);
    return this.http.get<any>(url, { headers });
  }
}
