import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileGuard implements CanActivate {
  constructor(private http: HttpClient, private router: Router) {}

  canActivate(): Observable<boolean> {
    const userId = sessionStorage.getItem('id');
    const role = sessionStorage.getItem('role');

    if (!userId) {
      this.router.navigate(['/login']);
      return of(false);
    }

    if (role === 'admin') {
      return of(true);
    }

    return this.http.get<any>(`${environment.apiUrl}/user-info/${userId}`).pipe(
      map(userInfo => {
        if (
          userInfo &&
          userInfo.full_name?.trim() &&
          userInfo.date_of_birth?.trim() &&
          userInfo.gender?.trim() &&
          userInfo.address?.trim() &&
          userInfo.phone?.trim()
        ) {
          sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
          return true;
        } else {
          alert('⚠️ Vui lòng cập nhật đầy đủ thông tin cá nhân.');
          this.router.navigate(['/staff/thongtin']);
          return false;
        }
      }),
      catchError(err => {
        console.error(err);
        alert('⚠️ Lỗi kiểm tra thông tin cá nhân.');
        this.router.navigate(['/staff/thongtin']);
        return of(false);
      })
    );
  }


  private dieuHuongTheoVaiTro(role: string | null) {
    if (role === 'admin') {
      this.router.navigate(['/admin/account-manager']);
    } else {
      this.router.navigate(['/staff/thongtin']);
    }
  }
}
