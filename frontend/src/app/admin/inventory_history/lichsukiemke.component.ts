import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-lichsukiemke',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lichsukiemke.component.html',
  styleUrls: ['./lichsukiemke.component.css']
})
export class LichsukiemkeComponent implements OnInit {
  private readonly BASE_URL = `${environment.apiUrl}`;

  danhSachDot: any[] = [];
  moChiTiet: { [dotId: number]: boolean } = {};
  chiTietTheoDot: { [dotId: number]: any[] } = {};

  boLoc = {
    maDot: '',
    tenDot: '',
    nguoiTao: '',
    ngayTao: '',
    stt: null, // Số sản phẩm kiểm kê
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.taiDanhSachDot();
  }

  /** 🔄 Tải danh sách đợt kiểm kê */
  taiDanhSachDot(): void {
    this.http.get<any>(`${this.BASE_URL}/kiem-ke/danh-sach-dot`).subscribe({
      next: res => {
        if (res.success) {
          this.danhSachDot = res.data;
        }
      },
      error: err => console.error('❌ Lỗi tải danh sách đợt:', err)
    });
  }

  /** 👁‍🗨 Mở/đóng chi tiết một đợt kiểm kê */
  toggleChiTiet(dot: any): void {
    const dotId = dot.id;

    // Nếu đang mở -> đóng lại
    if (this.moChiTiet[dotId]) {
      this.moChiTiet[dotId] = false;
      return;
    }

    // ❗ Đóng tất cả các đợt khác
    Object.keys(this.moChiTiet).forEach(id => {
      this.moChiTiet[+id] = false;
    });

    // Mở đợt được chọn
    this.moChiTiet[dotId] = true;

    // Nếu chưa có dữ liệu chi tiết, thì gọi API lấy
    if (!this.chiTietTheoDot[dotId]) {
      this.http.get<any>(`${this.BASE_URL}/kiem-ke/bao-cao-dot/${dotId}`).subscribe({
        next: res => {
          const danhSach = res.success ? this.gopSanPhamTheoMa(res.data) : [];
          this.chiTietTheoDot[dotId] = danhSach;
        },
        error: err => {
          console.error('❌ Lỗi khi lấy chi tiết đợt:', err);
          this.chiTietTheoDot[dotId] = [];
        }
      });
    }
  }


  /** 📦 Gộp các sản phẩm trùng mã trong 1 đợt */
  gopSanPhamTheoMa(danhSach: any[]): any[] {
    const map = new Map<string, any>();

    for (const sp of danhSach) {
      const key = sp.product_code;

      if (!map.has(key)) {
        map.set(key, { ...sp });
      } else {
        const spDaCo = map.get(key);

        // Gộp số lượng tồn hệ thống
        spDaCo.system_quantity += sp.system_quantity;

        // Gộp số lượng thực tế nếu có
        if (sp.actual_quantity !== null) {
          spDaCo.actual_quantity = (spDaCo.actual_quantity || 0) + sp.actual_quantity;
        }

        // Gộp ghi chú nếu khác
        if (sp.ghi_chu && sp.ghi_chu !== spDaCo.ghi_chu) {
          spDaCo.ghi_chu = (spDaCo.ghi_chu || '') + ' | ' + sp.ghi_chu;
        }

        // Gộp email người kiểm
        if (sp.checked_by_email && sp.checked_by_email !== spDaCo.checked_by_email) {
          spDaCo.checked_by_email = (spDaCo.checked_by_email || '') + ' | ' + sp.checked_by_email;
        }
      }
    }

    return Array.from(map.values());
  }

  /** 📤 Xuất Excel cho đợt kiểm kê */
  xuatExcel(dotId: number): void {
    window.open(`${this.BASE_URL}/xuat-excel/kiem-ke/${dotId}`, '_blank');
  }

  /** ✅ Kiểm tra mảng có dữ liệu hợp lệ */
  isValidArray(data: any): boolean {
    return Array.isArray(data) && data.length > 0;
  }

  /** 🔍 Lọc danh sách đợt theo các tiêu chí đã chọn */
  locDanhSachDot(): any[] {
    return this.danhSachDot.filter(dot => {
      const ngayDot = dot.created_at ? new Date(dot.created_at).toDateString() : '';
      const ngayTaoFilter = this.boLoc.ngayTao ? new Date(this.boLoc.ngayTao).toDateString() : null;

      const matchDot =
        (!this.boLoc.maDot || dot.batch_code?.toLowerCase().includes(this.boLoc.maDot.toLowerCase())) &&
        (!this.boLoc.tenDot || dot.batch_name?.toLowerCase().includes(this.boLoc.tenDot.toLowerCase())) &&
        (!this.boLoc.nguoiTao || dot.created_by_email?.toLowerCase().includes(this.boLoc.nguoiTao.toLowerCase())) &&
        (!this.boLoc.ngayTao || ngayDot === ngayTaoFilter);

      const soSP = Array.isArray(this.chiTietTheoDot[dot.id]) ? this.chiTietTheoDot[dot.id].length : 0;
      const matchStt = this.boLoc.stt == null || soSP === +this.boLoc.stt;

      return matchDot && matchStt;
    });
  }
}
