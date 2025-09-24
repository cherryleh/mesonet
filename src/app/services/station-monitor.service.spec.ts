import { TestBed } from '@angular/core/testing';

import { StationMonitorService } from './station-monitor.service';

describe('StationMonitorService', () => {
  let service: StationMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StationMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
