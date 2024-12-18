import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DurationSelectorComponent } from './duration-selector.component';

describe('DurationSelectorComponent', () => {
  let component: DurationSelectorComponent;
  let fixture: ComponentFixture<DurationSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DurationSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DurationSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
