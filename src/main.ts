import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { apiLoggerInterceptor } from './app/interceptors/api-logger.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(
      withInterceptors([apiLoggerInterceptor]) // <-- this must be passed inside here
    ),
    provideAnimationsAsync()
  ],
}).catch((err) => console.error(err));
