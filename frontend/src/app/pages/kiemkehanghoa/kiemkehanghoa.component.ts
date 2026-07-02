import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-kiemkehanghoa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kiemkehanghoa.component.html',
  styleUrls: ['./kiemkehanghoa.component.css']
})
export class KiemkehanghoaComponent implements OnInit {
  danhSachCanDem: any[] = [];
  dotId: number = 0;
  tenDot: string = ''; // ✅ Thêm biến tên đợt kiểm kê
  email: string = '';
  popupChiTiet = false;
  sanPhamDangXem: any = null;

  maDot: string = '';
  ngayTaoDot: string = '';

  filter = {
    ma: '',
    ten: '',
    khuVuc: '',
    tinhTrang: '',
    email: ''
  };

  danhSachCanDemGoc: any[] = []; // chứa bản gốc không lọc

  danhSachKhuVuc: string[] = []; // để populate dropdown khu vực

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.email = sessionStorage.getItem('email') || '';

    this.route.queryParams.subscribe(params => {
      if (params['dot_id']) {
        this.dotId = +params['dot_id'];
        if (this.dotId > 0) {
          this.loadDanhSachCanDem();
          this.layTenDot();
        }
      } else {
        this.http.get<any>(`${environment.apiUrl}/kiem-ke/dot-dang-kiem`)
          .subscribe({
            next: (response) => {
              if (response.success && response.data) { // ✅ FIX
                const dot = response.data; // ✅ FIX
                this.dotId = dot.id;
                this.tenDot = dot.ten_dot || '';
                this.maDot = dot.ma_dot || '';
                this.ngayTaoDot = dot.created_at?.substring(0, 10) || '';
                this.loadDanhSachCanDem();
              } else {
                this.dotId = 0;
                this.danhSachCanDem = [];
              }
            },
            error: (err) => {
              console.error('❌ Lỗi lấy đợt kiểm kê:', err);
              alert('Không thể tải danh sách đợt kiểm kê.');
            }
          });
      }
    });
  }

  layTenDot() {
    this.http.get<any>(`${environment.apiUrl}/kiem-ke/dot-dang-kiem`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) { // ✅ FIX
            const dot = response.data;             // ✅ FIX
            if (dot.id === this.dotId) {
              this.tenDot = dot.ten_dot || '';
              this.maDot = dot.ma_dot || '';
              this.ngayTaoDot = dot.created_at?.substring(0, 10) || '';
            }
          }
        }
      });
  }


  loadDanhSachCanDem() {
    this.http.get<any>(`${environment.apiUrl}/kiem-ke/dot/${this.dotId}/san-pham`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            const ds = response.data.map((sp: any) => {
              const key = `kiemke_${this.dotId}_${sp.kiem_ke_chi_tiet_id}`;
              const savedRaw = localStorage.getItem(key);

              let actual_quantity = sp.actual_quantity ?? null;
              let ghi_chu = sp.ghi_chu ?? '';
              let temp_email = null;

              if (savedRaw) {
                try {
                  const saved = JSON.parse(savedRaw);
                  actual_quantity = saved.actual_quantity ?? actual_quantity;
                  ghi_chu = saved.ghi_chu ?? ghi_chu;
                  temp_email = saved.temp_email ?? null;
                } catch {
                  actual_quantity = +savedRaw;
                }
              }

              return {
                ...sp,
                actual_quantity,
                ghi_chu,
                checked_by_email: sp.checked_by_email ?? null,
                temp_email
              };
            });

            this.danhSachCanDemGoc = ds;
            this.danhSachCanDem = [...ds];

            this.danhSachKhuVuc = Array.from(
              new Set<string>(ds.map((sp: any) => sp.ten_khu_vuc).filter(Boolean))
            );

            this.locDanhSach();
          } else {
            alert('Lỗi: ' + response.message);
          }
        },
        error: (err) => {
          console.error('❌ Lỗi tải dữ liệu kiểm kê:', err);
          alert('❌ Không thể tải dữ liệu kiểm kê. Vui lòng thử lại sau.');
        }
      });
  }


  xacNhanMotSanPham(sp: any) {
    if (sp.actual_quantity === null || sp.actual_quantity === '') {
      return alert('⚠️ Vui lòng nhập số lượng thực tế!');
    }

    this.http.post<any>(`${environment.apiUrl}/kiem-ke/cap-nhat-chi-tiet`, {
      kiem_ke_chi_tiet_id: sp.kiem_ke_chi_tiet_id,
      actual_quantity: sp.actual_quantity,
      ghi_chu: sp.ghi_chu || '',
      checked_by_email: this.email
    }).subscribe({
      next: (response) => {
        if (response.success) {
          alert('✅ Đã lưu dữ liệu sản phẩm!');
          sp.checked_by_email = this.email;
          sp.temp_email = null; // ✅ xoá temp
          const key = `kiemke_${this.dotId}_${sp.kiem_ke_chi_tiet_id}`;
          localStorage.removeItem(key);
        } else {
          alert('Lỗi: ' + response.message);
        }
      },
      error: (err) => {
        console.error('❌ Lỗi gửi kiểm kê:', err);
        alert('❌ Gửi thất bại!');
      }
    });
  }

  guiToanBoKetQua() {
    const dataToSubmit = this.danhSachCanDem
      .filter(sp => sp.actual_quantity !== null && sp.actual_quantity !== '' && !sp.checked_by_email)
      .map(sp => ({
        kiem_ke_chi_tiet_id: sp.kiem_ke_chi_tiet_id,
        actual_quantity: sp.actual_quantity,
        ghi_chu: sp.ghi_chu || ''
      }));

    if (dataToSubmit.length === 0) {
      alert('Không có sản phẩm nào để gửi hoặc tất cả đã được lưu.');
      return;
    }

    const requests = dataToSubmit.map(item =>
      this.http.post<any>(`${environment.apiUrl}/kiem-ke/cap-nhat-chi-tiet`, {
        kiem_ke_chi_tiet_id: item.kiem_ke_chi_tiet_id,
        actual_quantity: item.actual_quantity,
        ghi_chu: item.ghi_chu,
        checked_by_email: this.email
      })
    );

    Promise.all(requests.map(req => req.toPromise()))
      .then(() => {
        alert('✅ Đã gửi toàn bộ kết quả kiểm kê thành công!');
        this.loadDanhSachCanDem();
      })
      .catch(error => {
        console.error('❌ Lỗi khi gửi toàn bộ kết quả kiểm kê:', error);
        alert('❌ Có lỗi xảy ra khi gửi toàn bộ kết quả kiểm kê.');
      });
  }

  daNhapDayDu(): boolean {
    return this.danhSachCanDem.every(sp =>
      sp.actual_quantity !== null && sp.actual_quantity !== '' && sp.checked_by_email
    );
  }

  getClassTinhTrang(sp: any): string {
    if (sp.actual_quantity == null || sp.actual_quantity === '') return 'text-muted';
    const actual = +sp.actual_quantity || 0;
    const system = +sp.system_quantity || 0;
    const diff = actual - system;
    if (diff > 0) return 'text-warning';
    if (diff < 0) return 'text-danger';
    return 'text-success';
  }

  tinhTrang(sp: any): string {
    if (sp.actual_quantity == null || sp.actual_quantity === '') return '⏳ Chưa đếm';
    const actual = +sp.actual_quantity || 0;
    const system = +sp.system_quantity || 0;
    const diff = actual - system;
    if (diff > 0) return `🟡 Dư ${diff}`;
    if (diff < 0) return `🔴 Thiếu ${Math.abs(diff)}`;
    return `🟢 Đủ`;
  }

  tinhThatThoat(sp: any): number | null {
    if (sp.actual_quantity == null || sp.actual_quantity === '') return null;
    const actual = +sp.actual_quantity || 0;
    const system = +sp.system_quantity || 0;
    const diff = actual - system;
    return diff * sp.unit_price;
  }

  moPopupChiTiet(sp: any) {
    this.sanPhamDangXem = sp;
    this.popupChiTiet = true;

    this.http.get<any[]>(`${environment.apiUrl}/products-detail/all-by-code/${sp.product_code}`).subscribe({
      next: (data) => {
        this.sanPhamDangXem.pallets = data;
      },
      error: (err) => {
        console.error('❌ Lỗi khi tải pallet chứa sản phẩm:', err);
        this.sanPhamDangXem.pallets = [];
      }
    });
  }

  onChangeSoLuong(sp: any) {
    const key = `kiemke_${this.dotId}_${sp.kiem_ke_chi_tiet_id}`;

    if (sp.actual_quantity === null || sp.actual_quantity === '') {
      // Nếu chưa nhập số lượng, xóa hết localStorage
      localStorage.removeItem(key);
      sp.temp_email = null;
    } else {
      // Nếu đã nhập thì lưu cả ghi chú và temp_email (nếu khác người)
      const dataToSave = {
        actual_quantity: sp.actual_quantity,
        ghi_chu: sp.ghi_chu || '',
        temp_email: (sp.checked_by_email !== this.email) ? this.email : null
      };

      localStorage.setItem(key, JSON.stringify(dataToSave));
      sp.temp_email = dataToSave.temp_email;
    }
  }


  locDanhSach() {
    this.danhSachCanDem = this.danhSachCanDemGoc.filter(sp => {
      const actual = +sp.actual_quantity;
      const system = +sp.system_quantity;
      const diff = actual - system;

      let matchTinhTrang = true;
      switch (this.filter.tinhTrang) {
        case 'du':
          matchTinhTrang = (actual === system && actual !== 0);
          break;
        case 'thieu':
          matchTinhTrang = actual < system;
          break;
        case 'du_thua':
          matchTinhTrang = actual > system;
          break;
        case 'chua_kiem':
          matchTinhTrang = sp.actual_quantity == null;
          break;
      }

      return (
        (!this.filter.ma || sp.product_code?.toLowerCase().includes(this.filter.ma.toLowerCase())) &&
        (!this.filter.ten || sp.product_name?.toLowerCase().includes(this.filter.ten.toLowerCase())) &&
        (!this.filter.khuVuc || sp.ten_khu_vuc === this.filter.khuVuc) &&
        (!this.filter.email || (sp.checked_by_email || '').toLowerCase().includes(this.filter.email.toLowerCase())) &&
        matchTinhTrang
      );
    });
  }

}
