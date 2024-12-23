import { TestBed } from '@angular/core/testing';

import { GraphingMenuService } from './graphing-menu.service';

describe('GraphingMenuService', () => {
  let service: GraphingMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphingMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
