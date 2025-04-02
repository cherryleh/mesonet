// src/app/interceptors/api-logger.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const SHEETS_LOGGING_URL = 'https://script.google.com/macros/s/AKfycbx4wPV8A-nJbUp5VXlCTs6Kt-Df4n7eYh-ujbg5uKPNROdxU22jCcRTKl1FFrznyniFog/exec';

export const apiLoggerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  
  const formatToHST = () => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Pacific/Honolulu',
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false
    }).format(new Date());
  };

  const timestamp = formatToHST();

  const logEntry = {
    url: req.urlWithParams,
    method: req.method,
    time: timestamp
  };

  const excludedPatterns = [
    '/climos'
  ];

  const skipLogging = req.headers.has('X-Skip-Logging');
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';

  const shouldLog = !isLocalhost && !skipLogging && !excludedPatterns.some(pattern => req.url.includes(pattern));

  if (shouldLog) {
    fetch(SHEETS_LOGGING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logEntry),
      mode: 'no-cors'
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

