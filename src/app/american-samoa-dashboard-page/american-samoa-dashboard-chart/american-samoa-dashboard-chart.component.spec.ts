import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmericanSamoaDashboardChartComponent } from './american-samoa-dashboard-chart.component';

describe('AmericanSamoaDashboardChartComponent', () => {
  let component: AmericanSamoaDashboardChartComponent;
  let fixture: ComponentFixture<AmericanSamoaDashboardChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmericanSamoaDashboardChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmericanSamoaDashboardChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
