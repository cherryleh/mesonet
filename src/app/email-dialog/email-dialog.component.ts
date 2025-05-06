import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-email-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Email Request Received</h2>
    <mat-dialog-content>
    A download request has been generated. You should receive an email with your download package shortly.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>OK</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule, MatButtonModule],
})
export class EmailDialogComponent {}
