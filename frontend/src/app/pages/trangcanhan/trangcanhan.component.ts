import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-trangcanhan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trangcanhan.component.html',
  styleUrl: './trangcanhan.component.css'
})
export class TrangcanhanComponent implements OnInit{
  userInfo: any = null;
  userId = sessionStorage.getItem('id');
  showForm = false;
  today = new Date().toISOString().split('T')[0]; // để dùng trong template [max]

  formData = {
    full_name: '',
    date_of_birth: '',
    gender: '',
    address: '',
    phone: ''
  };

  selectedFile: File | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/user-info/${this.userId}`).subscribe((data: any) => {
      this.userInfo = data;

      // Nếu đã có dữ liệu thì bind ngược về form để sửa
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

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

submitInfo() {
  const birthDate = new Date(this.formData.date_of_birth);
  const today = new Date();

  // ✅ Tính tuổi
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  const isUnder20 = age < 20 || (age === 20 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));

  if (isUnder20) {
    alert('⚠️ Người dùng phải đủ 20 tuổi trở lên!');
    return;
  }

  // ✅ Kiểm tra số điện thoại
  const phonePattern = /^\d{1,11}$/;
  if (!phonePattern.test(this.formData.phone)) {
    alert('⚠️ Số điện thoại không hợp lệ (tối đa 11 số và chỉ chứa số).');
    return;
  }

  // ✅ Kiểm tra họ tên hợp lệ
  const namePattern = /^[A-Za-zÀ-ỹ\s]{2,50}$/;
  if (!namePattern.test(this.formData.full_name.trim())) {
    alert('⚠️ Họ và tên phải chỉ chứa chữ cái, không có số hoặc ký tự đặc biệt, và ít nhất 2 ký tự!');
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
    this.showForm = false;
    this.selectedFile = null;
    this.ngOnInit();
  });
}

}
