import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationSpecificMapComponent } from './station-specific-map.component';

describe('StationSpecificMapComponent', () => {
  let component: StationSpecificMapComponent;
  let fixture: ComponentFixture<StationSpecificMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationSpecificMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationSpecificMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
