import { Component } from '@angular/core';
import * as AOS from 'aos';

@Component({
  selector: 'app-dichvu',
  imports: [],
  templateUrl: './dichvu.component.html',
  styleUrl: './dichvu.component.css'
})
export class DichvuComponent {
  
  ngOnInit(): void {
      // Khởi tạo hiệu ứng scroll
      AOS.init({
        duration: 1000,
        once: true
      });
    }
}
