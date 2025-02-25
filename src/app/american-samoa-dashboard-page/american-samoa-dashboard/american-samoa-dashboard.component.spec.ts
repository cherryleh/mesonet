import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmericanSamoaDashboardComponent } from './american-samoa-dashboard.component';

describe('AmericanSamoaDashboardComponent', () => {
  let component: AmericanSamoaDashboardComponent;
  let fixture: ComponentFixture<AmericanSamoaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmericanSamoaDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmericanSamoaDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
