import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReportsEmailService {
  private apiUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements/email';
  private apiToken = environment.apiToken;  // Or load from environment.ts

  constructor(private http: HttpClient) {}

  sendExportRequest(payload: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiToken}`
    });

    console.log('📤 Sending export payload:', payload);

    return this.http.post(this.apiUrl, payload, { headers }).pipe(
      tap({
        next: (response) => console.log('Export response:', response),
        error: (error) => console.error('Export error:', error)
      })
    );
  }
}




