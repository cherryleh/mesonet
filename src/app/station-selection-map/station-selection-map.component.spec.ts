import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationSelectionMapComponent } from './station-selection-map.component';

describe('StationSelectionMapComponent', () => {
  let component: StationSelectionMapComponent;
  let fixture: ComponentFixture<StationSelectionMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationSelectionMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationSelectionMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
