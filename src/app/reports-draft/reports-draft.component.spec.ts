import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsDraftComponent } from './reports-draft.component';

describe('ReportsDraftComponent', () => {
  let component: ReportsDraftComponent;
  let fixture: ComponentFixture<ReportsDraftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDraftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsDraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
