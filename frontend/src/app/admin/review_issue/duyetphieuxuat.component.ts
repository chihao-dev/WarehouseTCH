
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-duyetphieuxuat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duyetphieuxuat.component.html',
  styleUrls: ['./duyetphieuxuat.component.css']
})
export class DuyetphieuxuatComponent implements OnInit {
  danhSachPhieu: any[] = [];
  danhSachPhieuGoc: any[] = []; // ✅ THÊM DÒNG NÀY

  selectedPhieu: any = null;
  popupNhapKhoMo: boolean = false;
  danhSachSanPhamNhap: any[] = [];
  filterCode: string = '';
  danhSachKhuVuc: any[] = [];
  danhSachMaTrung: string[] | null = null; // null: chưa kiểm tra, []: không trùng, ['A1']...

  maCanKiemTra: string = '';
  ketQuaSanPham: any = null;

  // Lấy thông tin người duyệt (admin hiện tại)
  adminName = sessionStorage.getItem('name') || '';
  adminEmail = sessionStorage.getItem('email') || '';

  // Phản hồi hệ thống nhập vào
  phanHoiHeThong: string = '';

  filter = {
  keyword: '',
  ngayBatDau: '',
  ngayKetThuc: '',
  trangThai: ''
};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
  }

  loadPhieu() {
    this.http.get<any[]>(`${environment.apiUrl}/phieu-xuat`).subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.danhSachPhieu = [...data];
    });
  }

  locPhieu() {
  const { keyword, ngayBatDau, ngayKetThuc, trangThai } = this.filter;

  this.danhSachPhieu = this.danhSachPhieuGoc.filter(p => {
    const matchKeyword = !keyword ||
      p.receipt_code.toLowerCase().includes(keyword.toLowerCase()) ||
      p.receiver_name.toLowerCase().includes(keyword.toLowerCase());

    const matchTrangThai = !trangThai || p.trang_thai === trangThai;

    const created = new Date(p.created_date);
    const matchNgayBatDau = !ngayBatDau || created >= new Date(ngayBatDau);
    const matchNgayKetThuc = !ngayKetThuc || created <= new Date(ngayKetThuc);

    return matchKeyword && matchTrangThai && matchNgayBatDau && matchNgayKetThuc;
  });
}


  xemChiTiet(phieu: any) {
    this.selectedPhieu = phieu;
    this.phanHoiHeThong = phieu.note_admin || '';

    // 👇 Lấy sản phẩm chi tiết của phiếu
    this.http.get<any[]>(`${environment.apiUrl}/phieu-xuat/${phieu.id}/san-pham`)
      .subscribe(data => {
        this.selectedPhieu.products = data.map(sp => ({
          ...sp,
          manufacture_date: sp.manufacture_date?.slice(0, 10),
          expiry_date: sp.expiry_date?.slice(0, 10),
          total_price: sp.unit_price * sp.quantity
        }));
      }, err => {
        console.error('❌ Không lấy được danh sách sản phẩm của phiếu xuất', err);
        this.selectedPhieu.products = []; // để tránh lỗi undefined
      });
  }


  dongChiTiet() {
    this.selectedPhieu = null;
    this.phanHoiHeThong = '';
  }

  hoanTatKiemTra() {
    if (!this.selectedPhieu || !this.selectedPhieu.products || this.selectedPhieu.products.length === 0) {
      alert('❌ Không có sản phẩm nào để kiểm tra.');
      return;
    }

    const checkPromises = this.selectedPhieu.products.map((sp: any) => {
      return this.http.get<any>(`${environment.apiUrl}/products-detail/check-available/${sp.product_code}/${sp.quantity}`).toPromise();
    });

    Promise.all(checkPromises).then(results => {

      let loiHetHan: string[] = [];
      let loiKhongDuHanHopLe: string[] = [];
      let loiKhongDuTong: string[] = [];

      results.forEach((r) => {
        // ✅ BACKEND TRẢ VỀ CÁC TRẠNG THÁI:
        // expired_only = hoàn toàn hết hạn
        // not_enough_valid = còn hàng nhưng số lượng hợp lệ > thời hạn không đủ
        // not_enough_total = tổng tồn kho < yêu cầu

        if (r.expired_only) {
          loiHetHan.push(r.product_code);
        } 
        else if (r.not_enough_valid) {
          loiKhongDuHanHopLe.push(`${r.product_code} (Hợp lệ còn: ${r.valid_quantity}/${r.required})`);
        }
        else if (r.not_enough_total) {
          loiKhongDuTong.push(`${r.product_code} (Tồn kho thực tế chỉ còn: ${r.total_available}, Yêu cầu: ${r.required})`);
        }
      });

      // ⚠ Ưu tiên báo lỗi theo mức độ nghiêm trọng
      if (loiHetHan.length > 0) {
        alert(`❌ Không thể duyệt phiếu vì các sản phẩm sau đã hết hạn hoàn toàn: ${loiHetHan.join(', ')}`);
        return;
      }

      if (loiKhongDuHanHopLe.length > 0) {
        alert(`⚠ Không đủ số lượng hợp lệ (hết hạn một phần): \n${loiKhongDuHanHopLe.join('\n')}`);
        return;
      }

      if (loiKhongDuTong.length > 0) {
        alert(`⚠ Tồn kho không đủ để xuất (dù có thể còn hạn): \n${loiKhongDuTong.join('\n')}`);
        return;
      }

      // ✅ Tất cả hợp lệ → cập nhật trạng thái
      const newStatus = 'Đã duyệt';
      this.http.put(`${environment.apiUrl}/phieu-xuat/${this.selectedPhieu.id}/admin-cap-nhat`, {
        trang_thai: newStatus,
        note_admin: this.phanHoiHeThong,
        admin_account_email: this.adminEmail,
        admin_account_name: this.adminName
      }).subscribe(() => {
        alert('✅ Kiểm tra hoàn tất! Trạng thái đã cập nhật sang "Đã duyệt". Bạn có thể xuất hàng.');
        this.selectedPhieu.trang_thai = newStatus;
        this.selectedPhieu.note_admin = this.phanHoiHeThong;
        this.selectedPhieu.admin_account_email = this.adminEmail;
        this.selectedPhieu.admin_account_name = this.adminName;
        this.popupNhapKhoMo = false;
      });

    }).catch(err => {
      console.error('❌ Lỗi kiểm tra số lượng sản phẩm:', err);
      alert('❌ Lỗi khi kiểm tra số lượng sản phẩm.');
    });
  }

  capNhatThanhTien(sp: any) {
    const unitPrice = Number(sp.unit_price) || 0;
    const quantity = Number(sp.quantity ?? 1); // nếu undefined thì mặc định là 1
    sp.total_price = unitPrice * quantity;
    this.capNhatTongTien();
  }

  capNhatTongTien() {
    let total = 0;
    for (let sp of this.danhSachSanPhamNhap) {
      total += sp.total_price || 0;
    }
    if (this.selectedPhieu) {
      this.selectedPhieu.total_amount = total;
    }
  }

  kiemTraTrongKho() {
      if (!this.maCanKiemTra) {
        this.ketQuaSanPham = null;
        return;
      }

      this.http.get<any>(`${environment.apiUrl}/products-detail/check-ma/${this.maCanKiemTra}`).subscribe(res => {
        if (res.exists) {
          const product = res.product;

          // 👇 Chuyển kiểu rõ ràng, tránh undefined hoặc string
          product.quantity = Number(product.quantity) || 0;
          product.unit_price = Number(product.unit_price) || 0;
          product.weight_per_unit = Number(product.weight_per_unit) || 0;

          // 👇 Tính tổng khối lượng và tổng tiền
          product.total_weight = product.quantity * product.weight_per_unit;
          product.total_price = product.quantity * product.unit_price;

          this.ketQuaSanPham = product;
        } else {
          this.ketQuaSanPham = {};
        }
      }, err => {
        console.error('Lỗi kiểm tra sản phẩm:', err);
        this.ketQuaSanPham = {};
      });
    }


  // Xác nhận xuất kho chính thức
  xacNhanXuatKhoChinhThuc() {
    if (!this.selectedPhieu) return;

    const id = this.selectedPhieu.id;
    this.http.post(`${environment.apiUrl}/phieu-xuat/xac-nhan-xuat-kho/${id}`, {}).subscribe({
      next: (res: any) => {
        alert(res.message || '✔️ Xác nhận thành công');
        this.selectedPhieu.trang_thai = 'Đã xuất hàng khỏi kho';
        this.popupNhapKhoMo = false;
        
      },
      error: (err) => {
        alert(err.error?.message || '❌ Lỗi khi xác nhận xuất kho');
      }
    });
  }

//Những chức năng này chưa kiểm chứng

  // Gọi API để mở popup xác nhận
  moPopupNhapKho() {
    console.log('📢 Đã gọi mở popup');
    this.popupNhapKhoMo = true;

    // Lấy danh sách sản phẩm của phiếu nhập
    this.http.get<any[]>(`${environment.apiUrl}/phieu-xuat/${this.selectedPhieu.id}/san-pham`)
      .subscribe(data => {
        this.danhSachSanPhamNhap = data.map(sp => ({
          ...sp,
          old_product_code: sp.product_code, // 👈 lưu mã cũ
          trung_ma: false,
          // Định dạng lại ngày để phù hợp với input type="date"
          manufacture_date: sp.manufacture_date ? sp.manufacture_date.slice(0, 10) : '',
          expiry_date: sp.expiry_date ? sp.expiry_date.slice(0, 10) : ''
        }));
      }, err => {
        console.error('❌ Lỗi khi lấy sản phẩm phiếu:', err);
      });

    // Lấy danh sách khu vực kho
    this.http.get<any[]>(`${environment.apiUrl}/khu-vuc`)
      .subscribe(data => {
        this.danhSachKhuVuc = data;
      }, err => {
        console.error('❌ Lỗi khi lấy khu vực:', err);
      });
  }

  // Đóng popup
  dongPopup() {
    this.popupNhapKhoMo = false;
    this.danhSachSanPhamNhap = [];
  }

  kiemTraTrungMa(sp: any) {
    if (!sp.product_code) {
      sp.trung_ma = false;
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/products-detail/check-ma/${sp.product_code}`)
      .subscribe(data => {
        sp.trung_ma = data.exists; // ✅ Gán chính xác
      }, error => {
        sp.trung_ma = false;
      });
  }

  onFileSelected(event: any, sp: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<any>(`${environment.apiUrl}/upload`, formData).subscribe(res => {
        sp.image_url = res.imageUrl; // Lưu đường dẫn ảnh mới
      });
    }
  }

  huyPhieu(p: any) {
    if (p.trang_thai === 'Đã gửi phiếu' || p.trang_thai === 'Đã duyệt') {
      const confirmed = confirm('Bạn có chắc chắn muốn hủy phiếu này không?');
      if (!confirmed) return; // nếu không đồng ý thì dừng

      this.http.put(`${environment.apiUrl}/phieu-xuat-kho/${p.id}/huy`, { trang_thai: 'Đã hủy' })
        .subscribe({
          next: () => {
            p.trang_thai = 'Đã hủy';
          },
          error: () => {
            alert('Hủy phiếu thất bại, vui lòng thử lại');
          }
        });
    }
  }



}
