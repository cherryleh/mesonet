import { TestBed } from '@angular/core/testing';

import { ReportsDraftService } from './reports-draft.service';

describe('ReportsDraftService', () => {
  let service: ReportsDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportsDraftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
