import { Component,ViewEncapsulation } from '@angular/core';
import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component'; // Import the standalone component


@Component({
  selector: 'app-test',
  standalone: true,
  imports: [DashboardChartComponent],
  templateUrl: './test.component.html',
  styleUrl: './test.component.css'
})
export class TestComponent {

}
