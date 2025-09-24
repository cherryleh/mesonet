import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagnosticTableComponent } from './diagnostic-table.component';

describe('DiagnosticTableComponent', () => {
  let component: DiagnosticTableComponent;
  let fixture: ComponentFixture<DiagnosticTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagnosticTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagnosticTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
