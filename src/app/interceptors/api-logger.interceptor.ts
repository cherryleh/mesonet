// src/app/interceptors/api-logger.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const SHEETS_LOGGING_URL = 'https://script.google.com/macros/s/AKfycbx4wPV8A-nJbUp5VXlCTs6Kt-Df4n7eYh-ujbg5uKPNROdxU22jCcRTKl1FFrznyniFog/exec';

export const apiLoggerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const timestamp = new Date().toISOString();

  const logEntry = {
    url: encodeURIComponent(req.urlWithParams),
    method: req.method,
    time: new Date().toISOString()
  };

  console.log('[API LOGGER] Intercepted request:', logEntry); // <-- now it will run


  const excludedPatterns = [
    '/db/stations', // exclude station metadata API
    '/climos'
  ];

  const skipLogging = req.headers.has('X-Skip-Logging');

  const shouldLog = !skipLogging && !excludedPatterns.some(pattern => req.url.includes(pattern));
  console.log('[API LOGGER] Final logEntry sent to Google Sheets:', logEntry);
  if (shouldLog) {
    fetch(SHEETS_LOGGING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logEntry),
      mode: 'no-cors'  // keep this for now
    }).catch(err => console.error('[API LOGGER] Failed to log to Google Sheets:', err));

    console.log('[API LOGGER] Sent log to Google Sheets:', logEntry);
  } else {
    console.log('[API LOGGER] Skipped logging for:', req.url);
  }

  

  return next(req).pipe(
    tap({
      error: err => console.error('API error:', err)
    })
  );
};
