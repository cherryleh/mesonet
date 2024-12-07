import { TestBed } from '@angular/core/testing';

import { DashboardChartService } from './dashboard-chart.service';

describe('DashboardChartService', () => {
  let service: DashboardChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
