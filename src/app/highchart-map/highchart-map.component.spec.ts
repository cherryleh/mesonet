import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HighchartMapComponent } from './highchart-map.component';

describe('HighchartMapComponent', () => {
  let component: HighchartMapComponent;
  let fixture: ComponentFixture<HighchartMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HighchartMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HighchartMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
