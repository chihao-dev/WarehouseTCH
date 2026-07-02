import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';

@Component({
  selector: 'app-thongtinkho',
  templateUrl: './thongtinkho.component.html',
  styleUrls: ['./thongtinkho.component.css']
})
export class ThongtinkhoComponent implements OnInit {

  images: string[] = [
    'assets/img/anh2.jpg',
    'assets/img/anh3.jpg',
    'assets/img/anh4.jpg',
    'assets/img/anh5.jpg'
  ];

  currentIndex = 0;

  areaCount = 0;
  accuracyCount = 0;
  partnerCount = 0;

  constructor() {}

  ngOnInit(): void {
    // Khởi tạo hiệu ứng scroll
    AOS.init({
      duration: 1000,
      once: true
    });

    // Đếm số liệu
    this.animateCounter('areaCount', 15000, 50);
    this.animateCounter('accuracyCount', 98, 50);
    this.animateCounter('partnerCount', 150, 50);
  }

  nextSlide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prevSlide(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  animateCounter(field: 'areaCount' | 'accuracyCount' | 'partnerCount', target: number, speed: number) {
    let current = 0;
    const interval = setInterval(() => {
      if (current < target) {
        current++;
        this[field] = current;
      } else {
        clearInterval(interval);
      }
    }, speed);
  }
}
