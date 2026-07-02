import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;
  soHoaDon: number = 0;

  canhBaoKiemKe: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const userId = sessionStorage.getItem('id');
    this.isLoggedIn = !!sessionStorage.getItem('token');

    if (userId) {
      this.http.get<any>(`${environment.apiUrl}/users/${userId}`).subscribe({
        next: (data) => this.userName = data.name?.trim() || 'Người dùng',
        error: () => this.userName = 'Người dùng'
      });

      // ✅ Kiểm tra hóa đơn chưa xuất
      this.http.get<any[]>(`${environment.apiUrl}/hoa-don/${userId}`).subscribe({
        next: (data) => this.soHoaDon = data.filter(p => p.trang_thai === 'Đã duyệt' && !p.da_xuat_hoa_don).length,
        error: () => {}
      });

      // ✅ Gọi API kiểm kê chưa làm
      this.http.get<{ count: number }>(`${environment.apiUrl}/kiem-ke/chua-kiem`)
        .subscribe({
          next: res => this.canhBaoKiemKe = res.count > 0,
          error: err => console.warn('❌ Lỗi kiểm tra kiểm kê:', err)
        });
    }
  }


  logout() {
    sessionStorage.clear();
    window.location.href = '/';
  }
}
