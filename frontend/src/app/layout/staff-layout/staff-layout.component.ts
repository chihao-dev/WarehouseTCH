import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // ✅ import HttpClient
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css'
})
export class StaffLayoutComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;

  constructor(private http: HttpClient) {} // ✅ inject HttpClient

  ngOnInit(): void {
    const userId = sessionStorage.getItem('id');
    const nameFromStorage = sessionStorage.getItem('name');
    this.isLoggedIn = !!sessionStorage.getItem('token');

    if (userId) {
      this.http.get<any>(`${environment.apiUrl}/users/${userId}`).subscribe({
        next: (data) => {
          // Ưu tiên tên trong DB, fallback session
          this.userName = data.name?.trim() || nameFromStorage || 'Nhân viên';
          sessionStorage.setItem('name', this.userName); // cập nhật lại
        },
        error: (err) => {
          console.error('Lỗi lấy tên staff:', err);
          this.userName = nameFromStorage || 'Nhân viên';
        }
      });
    } else {
      this.userName = 'Nhân viên';
    }
  }

  logout(): void {
    sessionStorage.clear();
    window.location.href = '/dangnhap';
  }
}
