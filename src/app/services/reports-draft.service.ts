import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsDraftService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&reverse=true&local_tz=True&limit=1000000&var_ids=SWin_1_Avg,SWout_1_Avg,LWin_1_Avg,LWout_1_Avg,SWnet_1_Avg,LWnet_1_Avg,Rnet_1_Avg,Albedo_1_Avg,Tsrf_1_Avg,Tsky_1_Avg,Tair_1_Avg,Tair_2_Avg,RH_1_Avg,RH_2_Avg,VP_1_Avg,VP_2_Avg,VPsat_1_Avg,VPsat_2_Avg,VPD_1_Avg,VPD_2_Avg,WS_1_Avg,WDuv_1_Avg,P_1,Psl_1,Tsoil_1_Avg,Tsoil_2,Tsoil_3,Tsoil_4,SHFsrf_1_Avg,SM_1_Avg,SM_2_Avg,SM_3_Avg,RF_1_Tot300s,RFint_1_Max';

  constructor(private http: HttpClient) {}

  getData(id: string, start_date: string, end_date: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const url = `${this.apiUrl}&station_ids=${id}&start_date=${start_date}&end_date=${end_date}`;
    console.log('API request for report: ',url);
    return this.http.get<any>(url, { headers });
  }
}
