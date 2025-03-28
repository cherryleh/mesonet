import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindMapComponent } from './wind-map.component';

describe('WindMapComponent', () => {
  let component: WindMapComponent;
  let fixture: ComponentFixture<WindMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
