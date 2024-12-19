import { TestBed } from '@angular/core/testing';

import { GraphingDataService } from './graphing-data.service';

describe('GraphingDataService', () => {
  let service: GraphingDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphingDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
