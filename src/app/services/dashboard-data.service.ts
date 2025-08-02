import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserIdService } from './user-id.service'; 

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?local_tz=True&source=dashboard';
  private defaultVars = '&var_ids=Tair_1_Avg,SWin_1_Avg,SM_1_Avg,WS_1_Avg,WDrs_1_Avg,RH_1_Avg&limit=7';
  private rainfallUrl = '&var_ids=RF_1_Tot300s&limit=288'; // 24-hour rainfall data (5 min intervals * 288 = 24 hours)

  constructor(private http: HttpClient, private userIdService: UserIdService) {}

  getData(id: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`);
    const locationParam = id.startsWith('1') ? '&location=american_samoa' : '';
    const userId = this.userIdService.getUserId();

    const isStreamStation = id.startsWith('14');
    const vars = isStreamStation
      ? '&var_ids=Twt_1_Avg,Wlvl_1_Avg'
      : '&var_ids=Tair_1_Avg,SWin_1_Avg,SM_1_Avg,WS_1_Avg,WDrs_1_Avg,RH_1_Avg';

    const url = `${this.baseUrl}${vars}&station_ids=${id}${locationParam}&user_id=${userId}`;
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
