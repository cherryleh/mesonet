import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserIdService } from './user-id.service';

@Injectable({
  providedIn: 'root'
})
export class ReportsApiService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&source=reports-api&reverse=true&local_tz=True&var_ids=Tair_1_Avg,Tair_2_Avg,RF_1_Tot300s,RFint_1_Max,SWin_1_Avg,SWout_1_Avg,LWin_1_Avg,LWout_1_Avg,SWnet_1_Avg,LWnet_1_Avg,Rnet_1_Avg,Albedo_1_Avg,Tsrf_1_Avg,Tsky_1_Avg,RH_1_Avg,RH_2_Avg,VP_1_Avg,VP_2_Avg,VPsat_1_Avg,VPsat_2_Avg,VPD_1_Avg,VPD_2_Avg,WS_1_Avg,WDrs_1_Avg,P_1_Avg,Psl_1_Avg,Tsoil_1_Avg,SHFsrf_1_Avg,SM_1_Avg,SM_2_Avg,SM_3_Avg,Tsoil_2_Avg,Tsoil_3_Avg,Tsoil_4_Avg&limit=1000000';

  constructor(private http: HttpClient, private userIdService: UserIdService) {}

  getData(id: string, startDate: string, endDate: string, email?: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`);
    const userId = this.userIdService.getUserId();
    let url = `${this.apiUrl}&station_ids=${id}&start_date=${startDate}&end_date=${endDate}&local_tz=True&user_id=${userId}`;
    
    if (email) {
      url += `&email=${encodeURIComponent(email)}`;
    }
    console.log('API request for report: ',url);
    return this.http.get<any>(url, { headers });
  }
}
