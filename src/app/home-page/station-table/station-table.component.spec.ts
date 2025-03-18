import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationTableComponent } from './station-table.component';

describe('StationTableComponent', () => {
  let component: StationTableComponent;
  let fixture: ComponentFixture<StationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
