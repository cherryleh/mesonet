import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  userEmail: string | null = null;

  isLoggedIn(): boolean {
    return !!this.userEmail;
  }

  setUser(email: string) {
    this.userEmail = email;
  }

  logout() {
    this.userEmail = null;
  }
}
