import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dangnhap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dangnhap.component.html',
  styleUrls: ['./dangnhap.component.css']
})
export class DangnhapComponent {
  showRegisterPassword = false;
  showRegisterConfirm = false;
  showLoginPassword = false;


  activeTab: 'login' | 'register' = 'login';

  // Dữ liệu form đăng nhập
  loginData = { email: '', password: '' };

  // Dữ liệu form đăng ký
  registerData = { name: '', email: '', password: '', confirm: '' };

  constructor(private http: HttpClient, private router: Router) {}

  setTab(tab: 'login' | 'register') {
    this.activeTab = tab;
  }

  login() {
    this.http.post<{ token: string; role: string; name: string; email: string; id: number }>(
      `${environment.apiUrl}/login`,
      this.loginData
    ).subscribe({
      next: (res) => {
        sessionStorage.setItem('token', res.token);
        sessionStorage.setItem('role', res.role);
        sessionStorage.setItem('name', res.name);
        sessionStorage.setItem('email', res.email);
        sessionStorage.setItem('id', res.id.toString());

        if (res.role === 'admin') {
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
        } else {
          this.router.navigate(['/home']).then(() => window.location.reload());
        }
      },
      error: (err) => {
        // 🛠 Đọc message từ backend
        const message = err.error?.message || 'Đăng nhập thất bại! Vui lòng kiểm tra lại email và mật khẩu.';
        alert(message);
      }
    });
  }



 register() {
  const { name, email, password, confirm } = this.registerData;

  if (password !== confirm) {
    alert('❌ Mật khẩu xác nhận không khớp!');
    return;
  }

  // ✅ Kiểm tra mật khẩu có ít nhất 3 chữ cái và 3 chữ số
  const hasThreeLetters = (password.match(/[a-zA-Z]/g) || []).length >= 3;
  const hasThreeDigits = (password.match(/[0-9]/g) || []).length >= 3;

  if (!hasThreeLetters || !hasThreeDigits) {
    alert('⚠️ Mật khẩu phải chứa ít nhất 3 chữ cái và 3 chữ số!');
    return;
  }

  // ✅ Kiểm tra họ tên hợp lệ
  const namePattern = /^[A-Za-zÀ-ỹ\s]{2,50}$/; // Họ tên dài 2-50 ký tự, không số, không ký tự lạ

  if (!namePattern.test(name)) {
    alert('⚠️ Họ và tên phải là chữ cái, không chứa số hoặc ký tự đặc biệt, và ít nhất 2 ký tự!');
    return;
  }

  const payload = { name, email, password };

  this.http.post(`${environment.apiUrl}/register`, payload).subscribe({
    next: () => {
      alert('✅ Đăng ký thành công! Vui lòng đăng nhập.');
      this.setTab('login');
      this.registerData = { name: '', email: '', password: '', confirm: '' };
    },
    error: (err) => {
      alert(err.error?.message || '❌ Đăng ký thất bại! Email có thể đã tồn tại.');
    }
  });
}

}
