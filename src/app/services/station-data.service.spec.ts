import { TestBed } from '@angular/core/testing';

import { StationDataService } from './station-data.service';

describe('StationDataService', () => {
  let service: StationDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StationDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
