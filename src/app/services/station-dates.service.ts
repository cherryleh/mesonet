import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StationDatesService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?var_ids=RF_1_Tot300s&local_tz=True&limit=1&reverse=True';

  constructor(private http: HttpClient) {}

  getData(id: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true'  
    });
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '&location=hawaii';
    const url = `${this.apiUrl}&station_ids=${id}${locationParam}`;
    console.log(url);
    return this.http.get<any>(url, { headers });
  }

}
