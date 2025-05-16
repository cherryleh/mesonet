import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserIdService {
  private readonly key = 'mesonet_user_id';

  getUserId(): string {
    let userId = localStorage.getItem(this.key);

    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(this.key, userId);
    }

    return userId;
  }
}
