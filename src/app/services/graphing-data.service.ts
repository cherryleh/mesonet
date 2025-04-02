import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GraphingDataService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?local_tz=True&source=graphing&reverse=True&limit=100000';

  constructor(private http: HttpClient) {}

  getData(id: string, vars: string, start_date: string, duration: string, end_date?: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`);
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '&location=hawaii';

    let url = `${this.apiUrl}&station_ids=${id}&var_ids=${vars}&start_date=${start_date}${locationParam}`;

    if (end_date) {
      url += `&end_date=${end_date}`;
    } else {
      url += `&duration=${duration}`;
    }

    console.log('API request for graphing: ', url);
    return this.http.get<any>(url, { headers });
  }

}
