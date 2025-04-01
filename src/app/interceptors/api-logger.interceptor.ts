// src/app/interceptors/api-logger.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const SHEETS_LOGGING_URL = 'https://script.google.com/macros/s/AKfycbxgMD73ajk1EicL3W5pVZD2CPxirquVvEq6GcV5HLls7j_weYLtymMsZ_wwH4Euso-9Lg/exec';

export const apiLoggerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    url: req.urlWithParams,
    method: req.method,
    time: timestamp,
    body: req.body
  };

  // Send to Google Sheets Web App
  fetch(SHEETS_LOGGING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(logEntry)
  }).catch(err => console.error('Failed to log to Google Sheets:', err));

  return next(req).pipe(
    tap({
      error: err => console.error('API error:', err)
    })
  );
};
