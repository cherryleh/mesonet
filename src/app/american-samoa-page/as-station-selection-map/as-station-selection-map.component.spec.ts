import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsStationSelectionMapComponent } from './as-station-selection-map.component';

describe('AsStationSelectionMapComponent', () => {
  let component: AsStationSelectionMapComponent;
  let fixture: ComponentFixture<AsStationSelectionMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsStationSelectionMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsStationSelectionMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
