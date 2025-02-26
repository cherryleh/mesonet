import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimatologyComponent } from './climatology.component';

describe('ClimatologyComponent', () => {
  let component: ClimatologyComponent;
  let fixture: ComponentFixture<ClimatologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimatologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClimatologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
