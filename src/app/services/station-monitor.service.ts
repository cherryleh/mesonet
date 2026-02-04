import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StationMonitorService {
  private apiUrl = `https://api.hcdp.ikewai.org/mesonet/db/stationMonitor?var_ids=RF_1_Tot300s,Tair_1_Avg,Tair_2_Avg,RH_1_Avg,RH_2_Avg,SWin_1_Avg,WS_1_Avg,SM_1_Avg,SM_2_Avg,SM_3_Avg,Tsoil_1_Avg,Tsoil_2_Avg,Tsoil_3_Avg,Tsoil_4_Avg,P_1_Avg`;

  constructor(private http: HttpClient) {}

  getStationData(): Observable<any> {
    return this.http.get<any>(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${environment.apiToken}` } // adjust if your key name is different
    });
  }
}
