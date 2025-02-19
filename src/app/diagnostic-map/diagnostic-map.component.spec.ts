import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagnosticMapComponent } from './diagnostic-map.component';

describe('DiagnosticMapComponent', () => {
  let component: DiagnosticMapComponent;
  let fixture: ComponentFixture<DiagnosticMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagnosticMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagnosticMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
