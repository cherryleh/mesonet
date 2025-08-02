import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardChartService {
  private baseUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements';

  constructor(private http: HttpClient) {}

  getData(id: string, start_date: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true' 
    });

    const isStreamStation = id.startsWith('14');
    const var_ids = isStreamStation
      ? 'RF_1_Tot300s,Twt_1_Avg,Wlvl_1_Avg'
      : 'RF_1_Tot300s,Tair_1_Avg,SWin_1_Avg';

    const location = id.startsWith('1') ? 'american_samoa' : 'hawaii';

    const url = `${this.baseUrl}?station_ids=${id}&start_date=${start_date}&var_ids=${var_ids}&local_tz=True&location=${location}`;
    console.log('API request for dashboard chart: ', url);

    return this.http.get<any>(url, { headers });
  }
}
