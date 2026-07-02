import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-manager.component.html',
  styleUrls: ['./account-manager.component.css']
})
export class AccountManagerComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = []; // 👈 dùng để hiển thị

  searchKeyword: string = '';
  selectedRole: string = '';

  constructor(private http: HttpClient) {}

  // Quản lý form
  showUserInfoForm = false;
  showAccountForm = false;

  // Thông tin người dùng hiện tại
  userInfo: any = null;
  userId = sessionStorage.getItem('id');
  today = new Date().toISOString().split('T')[0];
  selectedUser: any = null;

  formData = {
    full_name: '',
    date_of_birth: '',
    gender: '',
    address: '',
    phone: ''
  };

  selectedFile: File | null = null;

  // Dữ liệu thêm tài khoản mới
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'user'
  };

  selectedStatus: string = '';

  ngOnInit(): void {
    this.loadUsers();
    this.loadUserInfo();
  }

  loadUsers() {
    this.http.get<any[]>(`${environment.apiUrl}/users`).subscribe({
    next: data => {
      this.users = data;
      this.filteredUsers = data; // ban đầu hiển thị tất cả
    },
    error: err => console.error('Lỗi lấy dữ liệu user:', err)
  });
  }

  loadUserInfo() {
    this.http.get(`${environment.apiUrl}/user-info/${this.userId}`).subscribe((data: any) => {
      this.userInfo = data;
      if (data) {
        this.formData = {
          full_name: data.full_name || '',
          date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
          gender: data.gender || '',
          address: data.address || '',
          phone: data.phone || ''
        };
      }
    });
  }

  // Bộ lọc
  filterUsers() {
    const keyword = this.searchKeyword.trim().toLowerCase();
    const role = this.selectedRole;
    const status = this.selectedStatus; // lấy trạng thái

    this.filteredUsers = this.users.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(keyword);
      const roleMatch = !role || user.role === role;
      const statusMatch = !status || user.status === status; // so sánh trạng thái

      return nameMatch && roleMatch && statusMatch;
    });
  }
  
  toggleUserInfoForm() {
    this.showUserInfoForm = !this.showUserInfoForm;
  }

  toggleAccountForm() {
    this.showAccountForm = !this.showAccountForm;
  }

  submitForm() {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password || !this.newUser.role) {
      alert('⚠️ Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    this.http.post(`${environment.apiUrl}/users`, this.newUser).subscribe({
      next: (res: any) => {
        alert('✅ Đã thêm tài khoản!');
        this.users.push(res.user);
        this.showAccountForm = false;
        this.newUser = { name: '', email: '', password: '', role: 'user' };
        window.location.reload();
      },
      error: () => alert('❌ Lỗi khi thêm tài khoản.')
    });
  }

  themTaiKhoan() {
    const { name, email, password, role } = this.newUser;

    if (!name || !email || !password || !role) {
      alert('⚠️ Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    this.http.post(`${environment.apiUrl}/users`, { name, email, password, role })
      .subscribe({
        next: (res: any) => {
          alert('✅ Đã thêm tài khoản!');
          this.users.unshift(res.user); // thêm lên đầu cho dễ thấy
          this.showAccountForm = false;
          this.newUser = { name: '', email: '', password: '', role: 'user' };
        },
        error: (err) => {
          console.error('❌ Lỗi khi thêm tài khoản:', err);
          alert(err.error?.message || '❌ Lỗi khi thêm tài khoản.');
        }
      });
  }


  xemThongTin(user: any) {
    // Gọi API để lấy thông tin chi tiết từ bảng user_info (liên kết với users qua user_id)
    this.http.get(`${environment.apiUrl}/user-info/${user.id}`).subscribe({
      next: (userInfo: any) => {
        // Gộp thông tin từ bảng `users` và bảng `user_info`
        this.selectedUser = {
          ...user,
          full_name: userInfo?.full_name,
          date_of_birth: userInfo?.date_of_birth ? userInfo.date_of_birth.split('T')[0] : '',
          gender: userInfo?.gender,
          address: userInfo?.address,
          phone: userInfo?.phone,
          image_url: userInfo?.image_url
        };
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy thông tin chi tiết:', err);
        // Nếu không có user_info, vẫn hiển thị thông tin cơ bản
        this.selectedUser = user;
      }
    });
  }

  xoaTaiKhoan(userId: number) { 
    const currentUserId = Number(sessionStorage.getItem('id'));

    // ✅ Kiểm tra không tự xóa mình ở frontend
    if (userId === currentUserId) {
      alert('⚠️ Bạn không thể xoá chính tài khoản đang đăng nhập!');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      this.http.delete(
        `${environment.apiUrl}/users/${userId}?currentUserId=${currentUserId}`
      ).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
          alert('✅ Đã xóa tài khoản!');
          window.location.reload(); // ✅ Chỉ reload sau khi alert hiện xong
        },
        error: (err) => {
          console.error('❌ Lỗi xóa tài khoản:', err);
          alert(err.error?.message || '❌ Lỗi khi xóa tài khoản.');
        }
      });
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  submitInfo() {
      const birthDate = new Date(this.formData.date_of_birth);
      const today = new Date();

      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      const isUnder20 = age < 20 || (age === 20 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
      if (isUnder20) {
        alert('⚠️ Người dùng phải đủ 20 tuổi trở lên!');
        return;
      }

      const namePattern = /^[A-Za-zÀ-ỹ\s]{2,50}$/;
      if (!namePattern.test(this.formData.full_name.trim())) {
        alert('⚠️ Họ và tên phải là chữ cái, không chứa số hoặc ký tự đặc biệt, và ít nhất 2 ký tự!');
        return;
      }

      const phonePattern = /^\d{1,11}$/;
      if (!phonePattern.test(this.formData.phone)) {
        alert('⚠️ Số điện thoại không hợp lệ (tối đa 11 số và chỉ chứa số).');
        return;
      }

      const form = new FormData();
      form.append('user_id', this.userId!);
      form.append('full_name', this.formData.full_name);
      form.append('date_of_birth', this.formData.date_of_birth);
      form.append('gender', this.formData.gender);
      form.append('address', this.formData.address);
      form.append('phone', this.formData.phone);

      if (this.selectedFile) {
        form.append('avatar', this.selectedFile);
      }

      this.http.post(`${environment.apiUrl}/user-info`, form).subscribe(() => {
        alert('✅ Cập nhật thông tin thành công!');
        window.location.reload();
        this.showUserInfoForm = false;
        this.selectedFile = null;

        // 🔁 Cập nhật lại sessionStorage sau khi cập nhật thông tin thành công
        this.http.get(`${environment.apiUrl}/user-info/${this.userId}`).subscribe((updatedInfo: any) => {
          sessionStorage.setItem('userInfo', JSON.stringify(updatedInfo)); // ✅ Lưu lại
          this.userInfo = updatedInfo;
          this.ngOnInit();
        });
      });
  }

  updateStatus(user: any) {
  this.http.put(`${environment.apiUrl}/users/${user.id}/status`, { status: user.status })
    .subscribe({
      next: () => {
        alert('✅ Cập nhật trạng thái thành công!');
      },
      error: (err) => {
        console.error('❌ Lỗi cập nhật trạng thái:', err);
        alert('❌ Cập nhật trạng thái thất bại!');
      }
    });
  }

}
