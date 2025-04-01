import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardChartService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?var_ids=RF_1_Tot300s,Tair_1_Avg,SWin_1_Avg&local_tz=True';

  constructor(private http: HttpClient) {}

  getData(id: string,start_date: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true' 
    });
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '&location=hawaii';
    const url = `${this.apiUrl}&station_ids=${id}&start_date=${start_date}${locationParam}`;
    console.log('API request for dashboard chart: ',url);
    return this.http.get<any>(url, { headers });
  }


}
