import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class StationDatesService {
  private baseUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements?var_ids=RF_1_Tot300s&local_tz=True&limit=1';

  constructor(private http: HttpClient) {}

  public getMinDate(id: string): Observable<any> {
    return this.getDateFromApi(id, true);
  }

  public getMaxDate(id: string): Observable<any> {
    return this.getDateFromApi(id, false);
  }

  getData(id: string): Observable<{ minDate: Date | null, maxDate: Date | null }> {
    console.log(`[StationDatesService] getData called for ${id}`);
    return forkJoin({
      minDate: this.getMinDate(id).pipe(
        map((res: any[]) => res[0]?.timestamp ? new Date(res[0].timestamp) : null)

      ),
      maxDate: this.getMaxDate(id).pipe(
        map((res: any[]) => res[0]?.timestamp ? new Date(res[0].timestamp) : null)

      )
    });
  }


  private getDateFromApi(id: string, isMin: boolean): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.apiToken}`,
      'X-Skip-Logging': 'true'
    });

    const params = new URLSearchParams({
      var_ids: 'RF_1_Tot300s',
      local_tz: 'True',
      limit: '1',
      station_ids: id,
      location: id.startsWith('1') ? 'american_samoa' : 'hawaii'
    });

    if (isMin) {
      params.append('reverse', 'True');
    }

    const url = `https://api.hcdp.ikewai.org/mesonet/db/measurements?${params.toString()}`;
    console.log(`Fetching for station date information`, url);

    return this.http.get<any>(url, { headers });
  }



}
