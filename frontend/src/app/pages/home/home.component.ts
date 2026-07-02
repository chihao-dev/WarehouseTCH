import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: [
    '../../../assets/css/animated.css',
    '../../../assets/css/owl.css',
    '../../../assets/css/templatemo-seo-dream.css'
  ]
})
export class HomeComponent implements OnInit, AfterViewInit {
  sanPhamList: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/products-detail/filter`)
      .subscribe({
        next: (data) => {
          this.sanPhamList = data;
        },
        error: (err) => {
          console.error('❌ Lỗi khi gọi API:', err);
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      new Swiper('.swiper-container', {
        slidesPerView: 4,
        spaceBetween: 20,
        loop: true,
        autoplay: { delay: 2500 },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        breakpoints: {
          320: { slidesPerView: 1.2 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
          1280: { slidesPerView: 4 }
        }
      });
    }, 0);
  }
}
