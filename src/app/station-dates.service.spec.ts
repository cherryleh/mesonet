import { TestBed } from '@angular/core/testing';

import { StationDatesService } from './station-dates.service';

describe('StationDatesService', () => {
  let service: StationDatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StationDatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
