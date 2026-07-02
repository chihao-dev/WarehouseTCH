import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FilterProductCodePipe } from './filter-product-code.pipe'; // Đường dẫn đúng nhé
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-duyetphieunhap',
  standalone: true,
  imports: [CommonModule, FormsModule,  FilterProductCodePipe],
  templateUrl: './duyetphieunhap.component.html',
  styleUrls: ['./duyetphieunhap.component.css']
})
export class DuyetphieunhapComponent implements OnInit {
  danhSachPhieu: any[] = [];
  selectedPhieu: any = null;
  popupNhapKhoMo: boolean = false;
  danhSachSanPhamNhap: any[] = [];
  filterCode: string = '';
  danhSachKhuVuc: any[] = [];
  danhSachMaTrung: string[] | null = null; // null: chưa kiểm tra, []: không trùng, ['A1']...
  

  //bộ lọc
  filter = {
  keyword: '',
  ngayBatDau: '',
  ngayKetThuc: '',
  trangThai: ''
  };

  danhSachPhieuGoc: any[] = []; // dữ liệu gốc từ API

  maCanKiemTra: string = '';
  ketQuaSanPham: any = null;

  // Lấy thông tin người duyệt (admin hiện tại)
  adminName = sessionStorage.getItem('name') || '';
  adminEmail = sessionStorage.getItem('email') || '';

  // Phản hồi hệ thống nhập vào
  phanHoiHeThong: string = '';

  popupChonViTriMo: boolean = false;
  sanPhamDangChon: any = null;
  danhSachPallet: any[] = [];
  palletGridPopup: any[][] = [];

  phanBoCanConLai = 0;
  palletsDaChon: any[] = [];

  chonSoLuongPopupMo: boolean = false;
  palletDangNhapSoLuong: any = null;
  soLuongMuonThem: number = 0;

  goiYSoLuongToiDa: number = 0;


  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
  }

  loadPhieu() {
    this.http.get<any[]>(`${environment.apiUrl}/phieu-nhap`).subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.locPhieu(); // Gọi hàm lọc ngay sau khi load
    });
  }

  locPhieu() {
    const { keyword, ngayBatDau, ngayKetThuc, trangThai } = this.filter;

    this.danhSachPhieu = this.danhSachPhieuGoc.filter(p => {
      const matchKeyword =
        !keyword ||
        p.receipt_code.toLowerCase().includes(keyword.toLowerCase()) ||
        p.supplier_name.toLowerCase().includes(keyword.toLowerCase());

      const matchNgayBatDau = !ngayBatDau || new Date(p.created_date) >= new Date(ngayBatDau);
      const matchNgayKetThuc = !ngayKetThuc || new Date(p.created_date) <= new Date(ngayKetThuc);

      const matchTrangThai = !trangThai || p.trang_thai === trangThai;

      return matchKeyword && matchNgayBatDau && matchNgayKetThuc && matchTrangThai;
    });
  }


  kiemTraTrongKho() {
    this.danhSachMaTrung = null; // ❌ Xóa kết quả kiểm tra nhập kho nếu có
    if (!this.maCanKiemTra) {
      this.ketQuaSanPham = null;
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/products-detail/check-ma/${this.maCanKiemTra}`)
      .subscribe(res => {
        if (res.exists) {
          this.ketQuaSanPham = res.product;
        } else {
          this.ketQuaSanPham = { product_code: null }; // ✅ Giữ định dạng để hiện thông báo "chưa tồn tại"
        }
      }, err => {
        console.error('Lỗi kiểm tra sản phẩm:', err);
        this.ketQuaSanPham = { product_code: null };
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

  xemChiTiet(phieu: any) {
    this.selectedPhieu = phieu;
    this.phanHoiHeThong = phieu.note_admin || ''; // Lấy phản hồi hệ thống nếu có
  }

  dongChiTiet() {
    this.selectedPhieu = null;
    this.phanHoiHeThong = '';
  }

  hoanTatKiemTra() {
    const newStatus = 'Đã duyệt';

    this.http.put(`${environment.apiUrl}/phieu-nhap/${this.selectedPhieu.id}/admin-cap-nhat`, {
      trang_thai: newStatus,
      note_admin: this.phanHoiHeThong,
      admin_account_email: this.adminEmail,
      admin_account_name: this.adminName
    }).subscribe(() => {
      alert('✅ Cập nhật thành công!');
      // Cập nhật lại trên UI
      this.selectedPhieu.trang_thai = newStatus;
      this.selectedPhieu.note_admin = this.phanHoiHeThong;
      this.selectedPhieu.admin_account_email = this.adminEmail;
      this.selectedPhieu.admin_account_name = this.adminName;
    });
    console.log({
      id: this.selectedPhieu.id,
      trang_thai: newStatus,
      note_admin: this.phanHoiHeThong,
      admin_account_email: this.adminEmail,
      admin_account_name: this.adminName
    });
    window.location.reload();

  }

  // Gọi API để mở popup xác nhận
  moPopupNhapKho() {
    console.log('📢 Đã gọi mở popup');
    this.popupNhapKhoMo = true;

    // Lấy danh sách sản phẩm của phiếu nhập
    this.http.get<any[]>(`${environment.apiUrl}/phieu-nhap/${this.selectedPhieu.id}/san-pham`)
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

  // Xác nhận nhập kho chính thức
  xacNhanNhapKhoChinhThuc() {
    this.ketQuaSanPham = null;

    const maSanPham = this.danhSachSanPhamNhap.map(sp => sp.product_code);

    this.http.post<any>(`${environment.apiUrl}/products-detail/check-multiple`, {
      ma_san_pham: maSanPham
    }).subscribe(result => {
      const maTrung = [...new Set(result.duplicates as string[] || [])];
      this.danhSachMaTrung = maTrung;

      // 🔍 Chỉ kiểm tra lỗi nếu mã trùng và không bật cập nhật thêm
      const loiTrung: string[] = [];
      for (const sp of this.danhSachSanPhamNhap) {
        if (maTrung.includes(sp.product_code) && !sp.cap_nhat_them) {
          loiTrung.push(sp.product_code);
        }
      }

      if (loiTrung.length > 0) {
        alert(`❌ Không thể nhập kho! Các mã sau bị trùng nhưng chưa bật "Cập nhật thêm": ${loiTrung.join(', ')}`);
        return;
      }

      // ✅ Tiếp tục nếu mọi thứ ok
      const danhSachOK: any[] = [];

      for (let sp of this.danhSachSanPhamNhap) {
        if (
          !sp.product_code || !sp.product_name || !sp.product_type || !sp.unit ||
          !sp.unit_price || !sp.quantity || !sp.khu_vuc_id || !sp.location
        ) {
          alert(`⚠️ Sản phẩm "${sp.product_name || sp.product_code}" thiếu thông tin bắt buộc (mã, tên, loại, đơn vị, giá, số lượng, khu vực hoặc vị trí)!`);
          return;
        }

        const base = {
          product_code: sp.product_code,
          product_name: sp.product_name,
          product_type: sp.product_type,
          image_url: sp.image_url,
          unit: sp.unit,
          quantity: sp.quantity,
          unit_price: sp.unit_price,
          total_price: sp.total_price,
          manufacture_date: sp.manufacture_date,
          expiry_date: sp.expiry_date,
          supplier_name: this.selectedPhieu.supplier_name,
          logo_url: this.selectedPhieu.logo_url,
          old_product_code: sp.old_product_code || sp.product_code,
          receipt_code: this.selectedPhieu.receipt_code,
          cap_nhat_them: sp.cap_nhat_them === true // ✅ Truyền xuống server
        };

        const pallets = sp.ds_pallet || [];
        const soPallet = pallets.length || 1;
        const weightPer = sp.weight / soPallet;
        const areaPer = sp.area / soPallet;

        if (soPallet > 0) {
          for (const p of pallets) {
            danhSachOK.push({
              ...base,
              location: p.name,
              khu_vuc_id: sp.khu_vuc_id,
              weight: p.added_weight || weightPer,
              quantity: p.added_quantity || sp.quantity,
              area: p.added_area || areaPer
            });
          }
        } else {
          danhSachOK.push({
            ...base,
            location: sp.location,
            khu_vuc_id: sp.khu_vuc_id,
            weight: sp.weight,
            area: sp.area
          });
        }
      }

      // 📨 Gửi API nhập kho
      this.http.post(`${environment.apiUrl}/nhap-kho`, {
        phieu_id: this.selectedPhieu.id,
        danh_sach_san_pham: danhSachOK
      }).subscribe(() => {
        this.http.put(`${environment.apiUrl}/phieu-nhap/${this.selectedPhieu.id}/hoan-tat`, {
          trang_thai: 'Đã nhập hàng vào kho'
        }).subscribe(() => {
          alert('📦 Nhập kho thành công!');
          this.popupNhapKhoMo = false;
          this.loadPhieu();
          this.selectedPhieu = null;
          this.danhSachMaTrung = null;
        });
      }, err => {
        alert('❌ Lỗi khi lưu hàng!');
        console.error(err);
      });
    }, err => {
      alert('❌ Lỗi khi kiểm tra mã trùng!');
      console.error(err);
    });
  }


  
  // Chọn khu vực kho
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

/* Mới  */
  moPopupChonViTri(sp: any) {
    if (!sp.khu_vuc_id) {
      alert('⚠️ Vui lòng chọn khu vực trước khi phân bổ vị trí pallet!');
      return;
    }

    this.sanPhamDangChon = sp;
    this.phanBoCanConLai = sp.weight; // hoặc tính toán theo nhu cầu
    this.palletsDaChon = [];

    this.layPalletTheoKhu(sp.khu_vuc_id);  // ✅ Chỉ gọi khi chắc chắn có khu_vuc_id
    this.popupChonViTriMo = true;
  }

  layPalletTheoKhu(khuVucId: number) {
    this.http.get<any[]>(`${environment.apiUrl}/kho/area/${khuVucId}`).subscribe({
      next: data => {
        // Reset trước
        this.danhSachPallet = data;

        // 🔁 Duyệt tất cả sản phẩm nhập
        for (const sp of this.danhSachSanPhamNhap) {
          if (sp.ds_pallet && sp.khu_vuc_id === khuVucId) {
            for (const p of sp.ds_pallet) {
              const pallet = data.find(x => x.name === p.name);
              if (pallet) {
                pallet.weightUsed += p.added_weight; // ✅ cộng thêm
              }
            }
          }
        }

        // Chia lại thành 10x10
        this.palletGridPopup = [];
        for (let i = 0; i < 100; i += 10) {
          this.palletGridPopup.push(data.slice(i, i + 10));
        }
      },
      error: err => console.error('❌ Lỗi khi lấy pallet:', err)
    });
  }

  chonPallet(pallet: any) {
    if (!this.sanPhamDangChon.ds_pallet) {
      this.sanPhamDangChon.ds_pallet = [];
    }

    const daChon = this.sanPhamDangChon.ds_pallet.find((p: any) => p.name === pallet.name);

    if (daChon) {
      // Bỏ chọn pallet
      pallet.weightUsed -= daChon.added_weight;
      this.sanPhamDangChon.ds_pallet = this.sanPhamDangChon.ds_pallet.filter((p: any) => p.name !== pallet.name);
      return;
    }

    // 👉 Tính khối lượng còn lại của pallet
    const weightPerUnit = this.sanPhamDangChon.weight / this.sanPhamDangChon.quantity;
    const palletTrongKg = 500 - (pallet.weightUsed || 0);
    const maxQuantityTheoKg = Math.floor(palletTrongKg / weightPerUnit);

    // 👉 Tính số lượng còn lại chưa phân bổ của sản phẩm
    const daThem = this.getSoLuongDaThem();
    const soLuongConLai = this.sanPhamDangChon.quantity - daThem;

    // 👉 Khuyến nghị là số lượng nhỏ nhất giữa còn lại và theo khối lượng
    const maxKhuyenNghi = Math.min(soLuongConLai, maxQuantityTheoKg);

    // 👉 Mở mini popup nhập số lượng
    this.palletDangNhapSoLuong = pallet;
    this.goiYSoLuongToiDa = maxKhuyenNghi;
    this.soLuongMuonThem = maxKhuyenNghi;
    this.chonSoLuongPopupMo = true;
  }


  xacNhanThemSoLuongVaoPallet() {
    const pallet = this.palletDangNhapSoLuong;
    const quantityThem = this.soLuongMuonThem;

    if (!quantityThem || quantityThem <= 0) {
      alert('⚠️ Số lượng không hợp lệ!');
      return;
    }

    const quantityDaPhan = this.sanPhamDangChon.ds_pallet.reduce(
      (sum: number, p: any) => sum + p.added_quantity,
      0
    );
    const quantityConLai = this.sanPhamDangChon.quantity - quantityDaPhan;

    if (quantityThem > quantityConLai) {
      alert(`⚠️ Vượt quá số lượng còn lại (${quantityConLai})!`);
      return;
    }

    const weightPerUnit = this.sanPhamDangChon.weight / this.sanPhamDangChon.quantity;
    const weightThem = quantityThem * weightPerUnit;
    const palletTrongKg = 500 - pallet.weightUsed;

    if (weightThem > palletTrongKg) {
      alert(`⚠️ Pallet không đủ sức chứa! Chỉ còn ${palletTrongKg.toFixed(2)}kg`);
      return;
    }

    this.sanPhamDangChon.ds_pallet.push({
      name: pallet.name,
      added_quantity: quantityThem,
      added_weight: weightThem
    });

    pallet.weightUsed += weightThem;
    this.chonSoLuongPopupMo = false;
  }

  xacNhanViTriHang() {
    const daChon: { name: string; added_weight: number; added_quantity: number }[] = this.sanPhamDangChon.ds_pallet || [];

    const tongKL = daChon.reduce((sum: number, p: { added_weight: number }) => sum + p.added_weight, 0);
    const tongSL = daChon.reduce((sum: number, p: { added_quantity: number }) => sum + p.added_quantity, 0);

    const requiredKL = this.sanPhamDangChon.weight;
    const requiredSL = this.sanPhamDangChon.quantity;
    const epsilon = 0.01;

    if (Math.abs(tongKL - requiredKL) > epsilon || tongSL !== requiredSL) {
      alert(`❌ Thiếu thông tin:
  - Khối lượng đã phân: ${tongKL.toFixed(2)} / ${requiredKL} kg
  - Số lượng đã phân: ${tongSL} / ${requiredSL} thùng`);
      return;
    }

    this.sanPhamDangChon.location = daChon.map((p: { name: string }) => p.name).join(', ');
    alert('✅ Đã xác nhận vị trí để hàng!');
    this.popupChonViTriMo = false;
  }

  laPalletDangChon(pallet: { name: string }): boolean {
    if (!this.sanPhamDangChon?.ds_pallet) return false;
    return this.sanPhamDangChon.ds_pallet.some((p: { name: string }) => p.name === pallet.name);
  }

  getSoLuongDaThem(): number {
    if (!this.sanPhamDangChon?.ds_pallet) return 0;
    return this.sanPhamDangChon.ds_pallet.reduce(
      (sum: number, p: any) => sum + p.added_quantity, 0
    );
  }

  getKhoiLuongDaThem(): number {
    if (!this.sanPhamDangChon?.ds_pallet) return 0;
    return this.sanPhamDangChon.ds_pallet.reduce(
      (sum: number, p: any) => sum + p.added_weight, 0
    );
  }

  huyPhieu(p: any) { 
    if (p.trang_thai === 'Đã gửi phiếu' || p.trang_thai === 'Đã duyệt') {
      const confirmHuy = confirm('Bạn có chắc chắn muốn hủy phiếu này không?');
      if (!confirmHuy) return;

      this.http.put(`${environment.apiUrl}/phieu-nhap-kho/${p.id}/huy`, { trang_thai: 'Đã hủy' })
        .subscribe({
          next: () => p.trang_thai = 'Đã hủy',
          error: () => alert('Hủy phiếu thất bại, vui lòng thử lại')
        });
    }
  }


  tuDongThemHetVaoPallet() {
    if (!this.sanPhamDangChon || !this.danhSachPallet.length) {
      alert("⚠️ Chưa chọn sản phẩm hoặc chưa tải pallet!");
      return;
    }

    if (!this.sanPhamDangChon.ds_pallet) {
      this.sanPhamDangChon.ds_pallet = [];
    }

    let soLuongConLai = this.sanPhamDangChon.quantity - this.getSoLuongDaThem();
    const weightPerUnit = this.sanPhamDangChon.weight / this.sanPhamDangChon.quantity;

    // ✅ Tính tổng sức chứa còn trống của khu vực này
    let tongSlotConTrong = 0;
    let tongKgConTrong = 0;

    for (const pallet of this.danhSachPallet) {
      const palletTrongKg = 500 - (pallet.weightUsed || 0);
      const slotTheoKg = Math.floor(palletTrongKg / weightPerUnit);

      tongSlotConTrong += slotTheoKg;
      tongKgConTrong += palletTrongKg;
    }

    if (soLuongConLai > tongSlotConTrong) {
      // ❌ Không đủ chỗ → hỏi có muốn thêm hết phần còn trống không
      const confirmThem = confirm(
        `⚠️ Khu vực này chỉ còn chỗ cho ${tongSlotConTrong} sản phẩm (~${tongKgConTrong.toFixed(2)} kg).\n` +
        `Bạn có muốn tự động thêm hết ${tongSlotConTrong} sản phẩm này không?`
      );
      if (!confirmThem) return;

      soLuongConLai = tongSlotConTrong;
    }

    // ✅ Thực hiện phân bổ đúng số lượng được phép
    for (const pallet of this.danhSachPallet) {
      if (soLuongConLai <= 0) break;

      const palletTrongKg = 500 - (pallet.weightUsed || 0);
      const maxQuantityTheoKg = Math.floor(palletTrongKg / weightPerUnit);
      const soLuongThem = Math.min(soLuongConLai, maxQuantityTheoKg);

      if (soLuongThem > 0) {
        const weightThem = soLuongThem * weightPerUnit;

        this.sanPhamDangChon.ds_pallet.push({
          name: pallet.name,
          added_quantity: soLuongThem,
          added_weight: weightThem
        });

        pallet.weightUsed += weightThem;
        soLuongConLai -= soLuongThem;
      }
    }

    alert("✅ Đã tự động phân bổ vào pallet trong khu vực đã chọn!");
  }

  thuHoiTatCaPallet() {
    if (!this.sanPhamDangChon || !this.sanPhamDangChon.ds_pallet) {
      alert("⚠️ Chưa có pallet nào để thu hồi!");
      return;
    }

    for (const p of this.sanPhamDangChon.ds_pallet) {
      const pallet = this.danhSachPallet.find(x => x.name === p.name);
      if (pallet) {
        pallet.weightUsed -= p.added_weight;
        if (pallet.weightUsed < 0) pallet.weightUsed = 0; // tránh âm
      }
    }

    // Xóa danh sách pallet đã phân bổ cho sản phẩm
    this.sanPhamDangChon.ds_pallet = [];

    alert("♻ Đã thu hồi toàn bộ pallet vừa phân bổ!");
  }

}
