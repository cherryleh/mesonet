import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&local_tz=True&var_ids=RF_1_Tot300s,Tair_1_Avg,SWin_1_Avg,SM_1_Avg,WS_1_Avg,RH_1_Avg';

  constructor(private http: HttpClient) {}

  getData(id: string, start_date: string, end_date: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`); // Your API token here
    const url = `${this.apiUrl}&station_ids=${id}&start_date=${start_date}&end_date=${end_date}`;
    console.log(url);
    return this.http.get<any>(url, { headers });
  }
}
