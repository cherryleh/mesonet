import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmericanSamoaDashboardSelectorComponent } from './american-samoa-dashboard-selector.component';

describe('AmericanSamoaDashboardSelectorComponent', () => {
  let component: AmericanSamoaDashboardSelectorComponent;
  let fixture: ComponentFixture<AmericanSamoaDashboardSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmericanSamoaDashboardSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmericanSamoaDashboardSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
