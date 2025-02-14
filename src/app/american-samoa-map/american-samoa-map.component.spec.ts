import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmericanSamoaComponent } from './american-samoa-map.component';

describe('AmericanSamoaComponent', () => {
  let component: AmericanSamoaComponent;
  let fixture: ComponentFixture<AmericanSamoaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmericanSamoaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmericanSamoaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
