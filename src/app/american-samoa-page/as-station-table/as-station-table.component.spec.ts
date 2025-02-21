import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsStationTableComponent } from './as-station-table.component';

describe('AsStationTableComponent', () => {
  let component: AsStationTableComponent;
  let fixture: ComponentFixture<AsStationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsStationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsStationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
