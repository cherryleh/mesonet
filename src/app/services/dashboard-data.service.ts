import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?local_tz=True&source=dashboard';
  private defaultVars = '&var_ids=Tair_1_Avg,SWin_1_Avg,SM_1_Avg,WS_1_Avg,WDrs_1_Avg,RH_1_Avg&limit=7';
  private rainfallUrl = '&var_ids=RF_1_Tot300s&limit=288'; // 24-hour rainfall data (5 min intervals * 288 = 24 hours)

  constructor(private http: HttpClient) {}

  getData(id: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`);
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '';
    const url = `${this.baseUrl}${this.defaultVars}&station_ids=${id}${locationParam}`;
    console.log('API request for general dashboard data: ', url);
    return this.http.get<any>(url, { headers });
  }

  get24HourRainfall(id: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true' 
    });
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '';
    const url = `${this.baseUrl}${this.rainfallUrl}&station_ids=${id}${locationParam}`;
    console.log('API request for 24-hour rainfall: ', url);
    return this.http.get<any>(url, { headers });
  }


}
