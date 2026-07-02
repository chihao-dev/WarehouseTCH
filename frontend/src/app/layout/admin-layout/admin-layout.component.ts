import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: [
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/kaiadmin.min.css',
    '../../../assets/css/demo.css',
    './admin-layout.component.css'
  ]
})
export class AdminLayoutComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;
  isSidebarCollapsed: boolean = false; // ✅ Biến điều khiển sidebar

  soPhieuNhapChoDuyet = 0;
  soPhieuXuatChoDuyet = 0;
  
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const userId = sessionStorage.getItem('id');
    this.isLoggedIn = !!sessionStorage.getItem('token');

    if (userId) {
      this.http.get<any>(`${environment.apiUrl}/users/${userId}`).subscribe({
        next: (data) => {
          this.userName = data.name?.trim() || 'Admin';
          sessionStorage.setItem('name', this.userName);
        },
        error: () => {
          this.userName = 'Admin';
        }
      });
    } else {
      this.userName = 'Admin';
    }

    this.getSoPhieuNhapChoDuyet();
    this.getSoPhieuXuatChoDuyet();
  }

  getSoPhieuNhapChoDuyet() {
    this.http.get<any[]>(`${environment.apiUrl}/phieu-nhap`).subscribe(ds => {
      this.soPhieuNhapChoDuyet = ds.filter(p => p.trang_thai === 'Đã gửi phiếu').length;
    });
  }

  getSoPhieuXuatChoDuyet() {
    this.http.get<any[]>(`${environment.apiUrl}/phieu-xuat`).subscribe(ds => {
      this.soPhieuXuatChoDuyet = ds.filter(p => p.trang_thai === 'Đã gửi phiếu').length;
    });
  }


  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    sessionStorage.clear();
    window.location.href = '/dangnhap';
  }
}
