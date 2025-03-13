import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-user-agreement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-agreement.component.html',
  styleUrl: './user-agreement.component.css'
})
export class UserAgreementComponent {
  isChecked: boolean = false;

  @Output() agreementAccepted = new EventEmitter<void>(); 

  acceptAgreement() {
    if (this.isChecked) {
      localStorage.setItem('userAgreed', 'true'); 
      this.agreementAccepted.emit();
    }
  }
}
