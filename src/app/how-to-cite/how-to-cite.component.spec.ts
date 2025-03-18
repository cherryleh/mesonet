import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowToCiteComponent } from './how-to-cite.component';

describe('HowToCiteComponent', () => {
  let component: HowToCiteComponent;
  let fixture: ComponentFixture<HowToCiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowToCiteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HowToCiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
