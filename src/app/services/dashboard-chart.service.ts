import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardChartService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&var_ids=RF_1_Tot300s,Tair_1_Avg,SWin_1_Avg&local_tz=True';

  constructor(private http: HttpClient) {}

  getData(id: string,start_date: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    //const url = `${this.apiUrl}&station_ids=${id}&start_date=${start_date}`;
    const url = `${this.apiUrl}&station_ids=${id}&start_date=2025-01-01T06:00:00-10:00`;
    console.log('API request for dashboard chart: ',url);
    return this.http.get<any>(url, { headers });
  }
}
