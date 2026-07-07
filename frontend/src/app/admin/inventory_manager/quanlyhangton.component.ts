import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-quanlyhangton',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './quanlyhangton.component.html',
  styleUrls: ['./quanlyhangton.component.css']
})
export class QuanlyhangtonComponent implements OnInit {
  danhSachSanPham: any[] = [];
  selectedProduct: any = null;
  popupVisible = false;
  logHistory: { [productCode: string]: any[] } = {};
  loHangCungMa: any[] = [];
  sanPhamDangMoLog: string | null = null;
  demNguocMap: { [productCode: string]: string } = {};
  filters = {
    ma: '',
    ten: '',
    khuVuc: '',
    slMin: null,
    slMax: null,
    hanSuDung: null,
    banChayHon: null, // 🆕 thêm lọc bán chạy
    tinhTrang: ''
  };

  filterKiemKe = {
    keyword: '',
    khuVuc: '',
    tinhTrang: '',
    email: ''
  };

  
  sanPhamGoc: any[] = [];
  userRole: string = '';

  // --- Biến mới cho chức năng kiểm kê theo đợt ---
  showCreateBatchModal: boolean = false;
  newBatchName: string = '';
  currentInventoryBatchId: number | null = null; // ID của đợt kiểm kê hiện tại

  showDanhSachKiemKePopup: boolean = false;
  currentBatchCode = '';
  currentBatchName = '';
  currentBatchCreatedAt = '';

  showEmailDropdown = false;
  filteredEmailSuggestions: string[] = [];

  boLocChon: '' | 'chon' | 'bo' = '';

  get danhSachKhuVuc() {
    const tenKhuVucSet = new Set(this.sanPhamGoc.map(sp => sp.ten_khu_vuc));
    return Array.from(tenKhuVucSet).map(ten => ({ ten_khu_vuc: ten }));
  }

  get danhSachEmailKiemKe(): string[] {
    const emails = this.sanPhamGoc
      .map(sp => sp.kiem_ke_email)
      .filter(email => email); // loại bỏ null/undefined

    return Array.from(new Set(emails)); // loại trùng
  }

  get danhSachSanPhamLocTheoChon(): any[] {
    return this.danhSachSanPham.filter(sp => this.locTheoTrangThaiChon(sp));
  }


  getDanhSachSanPhamDuocChon() {
    return this.danhSachSanPham.filter(sp => {
      if (!sp.selected) return false;

      const kw = this.filterKiemKe.keyword?.toLowerCase() ?? '';
      const khuVuc = this.filterKiemKe.khuVuc;
      const email = this.filterKiemKe.email?.toLowerCase() ?? '';
      const tinhTrang = this.filterKiemKe.tinhTrang;

      const matchKeyword = !kw || sp.product_name?.toLowerCase().includes(kw) || sp.product_code?.toLowerCase().includes(kw);
      const matchKhuVuc = !khuVuc || sp.ten_khu_vuc === khuVuc;
      const matchEmail = !email || (sp.kiem_ke_email && sp.kiem_ke_email.toLowerCase().includes(email));

      const matchTinhTrang = (() => {
        if (!tinhTrang) return true;

        if (tinhTrang === 'dang_kiem') return sp.actual_quantity == null;

        if (sp.actual_quantity == null) return false;

        if (tinhTrang === 'du') return sp.actual_quantity === sp.quantity;
        if (tinhTrang === 'thieu') return sp.actual_quantity < sp.quantity;
        if (tinhTrang === 'du_thua') return sp.actual_quantity > sp.quantity;

        return true;
      })();

      return matchKeyword && matchKhuVuc && matchEmail && matchTinhTrang;
    });
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadProducts();
    this.userRole = sessionStorage.getItem('role') || '';

    const savedDot = localStorage.getItem('dot_id_moi_nhat');
    const savedCodes = localStorage.getItem('sp_kiem_ke');
    const tenDot = localStorage.getItem('ten_dot_moi_nhat');
    const maDot = localStorage.getItem('ma_dot_moi_nhat');
    const ngayTaoDot = localStorage.getItem('ngay_tao_dot_moi_nhat');

    if (savedDot) this.currentInventoryBatchId = +savedDot;
    if (tenDot) this.currentBatchName = tenDot;
    if (maDot) this.currentBatchCode = maDot;
    if (ngayTaoDot) this.currentBatchCreatedAt = ngayTaoDot;

    if (savedCodes) {
      const codes: string[] = JSON.parse(savedCodes);
      setTimeout(() => {
        this.danhSachSanPham.forEach(sp => {
          if (codes.includes(sp.product_code)) sp.selected = true;
        });
      }, 300);
    }

    // ✅ Thêm đoạn này để bắt sự kiện click ngoài dropdown email
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdownContainer = document.querySelector('.filter-item.position-relative');

    if (dropdownContainer && !dropdownContainer.contains(target)) {
      this.showEmailDropdown = false;
    }
  }

  loadProducts() {
    this.http.get<any[]>(`${environment.apiUrl}/products-detail/with-deducted`)
      .subscribe(data => {
        const sorted = [...data].sort((a, b) => b.id - a.id);

        let daGanCodes: string[] = [];
        const savedCodes = localStorage.getItem('sp_kiem_ke');
        if (savedCodes) {
          try {
            daGanCodes = JSON.parse(savedCodes);
          } catch {}
        }

        let tamCodes: string[] = [];
        const savedTam = localStorage.getItem('sp_kiem_ke_selected_tam');
        if (savedTam) {
          try {
            tamCodes = JSON.parse(savedTam);
          } catch {}
        }

        this.danhSachSanPham = sorted.map(sp => {
          const isSelected = tamCodes.includes(sp.product_code);
          const isNew = isSelected && !daGanCodes.includes(sp.product_code);

          const tongSoLuongTru = sp.total_deducted ?? 0;
          const soLuongBanDau = sp.quantity ?? 0;
          const soDonXuat = sp.total_receipts ?? 0;

          const isHot = soLuongBanDau > 0 && (
            tongSoLuongTru >= 0.6 * soLuongBanDau || soDonXuat >= 5
          );

          let isSale = false;
          if (sp.expiry_date) {
            const today = new Date();
            const expiry = new Date(sp.expiry_date);
            const diffTime = expiry.getTime() - today.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isSale = daysLeft <= 30 && daysLeft >= 0;
          }

          console.log(
            `🔥 ${sp.product_code} | SL trừ: ${tongSoLuongTru} | SL đầu: ${soLuongBanDau} | Đơn xuất: ${soDonXuat} | isHot: ${isHot} | ⚡ isSale: ${isSale}`
          );

          return {
            ...sp,
            ghi_chu: sp.ghiChuKiemKe ?? null, // ✅ Dòng đã thêm: Ánh xạ dữ liệu từ backend
            selected: isSelected,
            isNew,
            isHot,
            isSale,
            actual_quantity: sp.soLuongThucTe ?? null,
            kiem_ke_email: sp.emailNhanVien ?? null
          };
        });

        this.sanPhamGoc = [...this.danhSachSanPham];
        this.batDauDemNguoc();
      }, error => {
        console.error('Lỗi tải dữ liệu sản phẩm:', error);
        alert('Không thể tải dữ liệu sản phẩm.');
      });
  }


  /** --- Popup chi tiết sản phẩm --- */
  moPopupChiTiet(sp: any) {
    this.selectedProduct = sp;
    this.popupVisible = true;
    this.loadLoHang(sp.product_code);
  }

  dongPopup() {
    this.popupVisible = false;
    this.loHangCungMa = [];
  }

  loadLoHang(code: string) {
    this.http.get<any[]>(`${environment.apiUrl}/products-detail/batch-list/${code}`).subscribe(data => {
      this.loHangCungMa = data;
    });
  }


  /** --- Xem log trừ hàng --- */
  xemLichSu(sp: any, event: Event) {
    event.stopPropagation();
    const code = sp.product_code;
    if (this.sanPhamDangMoLog === code) {
      this.sanPhamDangMoLog = null;
      return;
    }
    this.sanPhamDangMoLog = code;
    if (!this.logHistory[code]) {
      this.http.get<any[]>(`${environment.apiUrl}/log-tru-hang/${code}`)
        .subscribe(data => this.logHistory[code] = data);
    }
  }

  tinhSoNgayConLai(expiry: string): number {
    if (!expiry) return 0;
    const today = new Date();
    const expiryDate = new Date(expiry);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  batDauDemNguoc() {
    setInterval(() => {
      const now = new Date().getTime();
      this.danhSachSanPham.forEach(sp => {
        if (sp.expiry_date) {
          const expiry = new Date(sp.expiry_date);
          expiry.setHours(23, 59, 59, 999);
          const distance = expiry.getTime() - now;
          if (distance <= 0) {
            this.demNguocMap[sp.product_code] = '⛔ Đã hết hạn';
          } else {
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            this.demNguocMap[sp.product_code] = `${d}d ${h}h `;
          }
        }
      });
    }, 1000);
  }

  isWarning(productCode: string): boolean {
    const countdown = this.demNguocMap[productCode];
    const match = countdown?.match(/^(\d+)d/);
    return match ? +match[1] < 30 : false;
  }

  locSanPham() {
    this.danhSachSanPham = this.sanPhamGoc.filter(sp => {
      const soNgay = this.tinhSoNgayConLai(sp.expiry_date);

      // Điều kiện lọc cơ bản
      const matchMa = !this.filters.ma || sp.product_code.toLowerCase().includes(this.filters.ma.toLowerCase());
      const matchTen = !this.filters.ten || sp.product_name.toLowerCase().includes(this.filters.ten.toLowerCase());
      const matchKhuVuc = !this.filters.khuVuc || sp.ten_khu_vuc === this.filters.khuVuc;
      const matchSLMin = this.filters.slMin == null || sp.quantity >= this.filters.slMin;
      const matchSLMax = this.filters.slMax == null || sp.quantity <= this.filters.slMax;
      const matchHanSuDung = this.filters.hanSuDung == null || soNgay <= this.filters.hanSuDung;

      // Điều kiện lọc tình trạng kiểm kê
      let matchTinhTrang = true;
      if (this.filters.tinhTrang) {
        const actual = sp.actual_quantity;
        const quantity = sp.quantity;
        switch (this.filters.tinhTrang) {
          case 'du':
            matchTinhTrang = actual != null && actual === quantity;
            break;
          case 'thieu':
            matchTinhTrang = actual != null && actual < quantity;
            break;
          case 'du_thua':
            matchTinhTrang = actual != null && actual > quantity;
            break;
          case 'chua_kiem':
            matchTinhTrang = actual == null && !sp.selected;
            break;
          case 'dang_kiem':
            matchTinhTrang = actual == null && sp.selected;
            break;
          default:
            matchTinhTrang = true;
        }
      }

      // ✅ Điều kiện lọc bán chạy
      let matchBanChay = true;
      if (this.filters.banChayHon != null) {
        matchBanChay = this.filters.banChayHon === 1 ? sp.isHot : !sp.isHot;
      }

      return (
        matchMa &&
        matchTen &&
        matchKhuVuc &&
        matchSLMin &&
        matchSLMax &&
        matchHanSuDung &&
        matchTinhTrang &&
        matchBanChay // 🆕 thêm vào cuối cùng
      );
    });
  }

  resetBoLoc() {
    this.filters = {
      ma: '',
      ten: '',
      khuVuc: '',
      slMin: null,
      slMax: null,
      hanSuDung: null,
      banChayHon: null,
      tinhTrang: ''
    };
    this.danhSachSanPham = [...this.sanPhamGoc];
  }

  toggleCheckbox(sp: any, event: Event) {
    event.stopPropagation();
    sp.selected = !sp.selected;

    const tamKey = 'sp_kiem_ke_selected_tam';
    let tamCodes: string[] = [];

    const saved = localStorage.getItem(tamKey);
    if (saved) {
      try {
        tamCodes = JSON.parse(saved);
      } catch (e) {
        console.warn('Không thể parse sp_kiem_ke_selected_tam');
      }
    }

    if (sp.selected && !tamCodes.includes(sp.product_code)) {
      tamCodes.push(sp.product_code);
    } else if (!sp.selected && tamCodes.includes(sp.product_code)) {
      tamCodes = tamCodes.filter(code => code !== sp.product_code);
    }

    localStorage.setItem(tamKey, JSON.stringify(tamCodes));

    // Đánh dấu mới nếu chưa từng được gán
    const daGanRaw = localStorage.getItem('sp_kiem_ke');
    const daGan: string[] = daGanRaw ? JSON.parse(daGanRaw) : [];
    sp.isNew = sp.selected && !daGan.includes(sp.product_code);
  }

  chonTatCa() {
    const selectedCodes: string[] = [];

    const daGanRaw = localStorage.getItem('sp_kiem_ke');
    const daGan: string[] = daGanRaw ? JSON.parse(daGanRaw) : [];

    this.danhSachSanPham.forEach(sp => {
      if (!this.isCheckboxDisabled(sp)) {
        sp.selected = true;
        selectedCodes.push(sp.product_code);
        sp.isNew = !daGan.includes(sp.product_code); // chỉ đánh dấu mới nếu chưa từng gán
      }
    });

    // Lưu vào localStorage
    localStorage.setItem('sp_kiem_ke_selected_tam', JSON.stringify(selectedCodes));

    // Cập nhật UI
    this.danhSachSanPham = [...this.danhSachSanPham];
  }

  boChonTatCa() {
    this.danhSachSanPham.forEach(sp => {
      if (!this.isCheckboxDisabled(sp)) {
        sp.selected = false;
        sp.isNew = false;
      }
    });

    // Chỉ xóa những mã chưa bị disabled khỏi localStorage tạm
    const savedTam = localStorage.getItem('sp_kiem_ke_selected_tam');
    let tamCodes: string[] = savedTam ? JSON.parse(savedTam) : [];
    tamCodes = tamCodes.filter(code =>
      !this.danhSachSanPham.find(sp => sp.product_code === code && !this.isCheckboxDisabled(sp))
    );
    localStorage.setItem('sp_kiem_ke_selected_tam', JSON.stringify(tamCodes));

    // Không xóa toàn bộ `sp_kiem_ke` nếu bạn đang dùng để lưu sản phẩm đã kiểm

    // Cập nhật UI
    this.danhSachSanPham = [...this.danhSachSanPham];
  }

  startCreateInventoryBatch() {
    const selectedProducts = this.danhSachSanPham.filter(sp => sp.selected);
    if (selectedProducts.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để bắt đầu đợt kiểm kê!');
      return;
    }
    this.newBatchName = ''; // Reset tên đợt trước khi mở popup
    this.showCreateBatchModal = true;
  }

  createNewInventoryBatch() {
    const email = sessionStorage.getItem('email') || ''; // ✅ Lấy email từ session

    if (!this.newBatchName || !email) {
      return alert('❌ Thiếu tên đợt kiểm kê hoặc email người tạo.');
    }

    this.http.post<any>(`${environment.apiUrl}/kiem-ke/tao-dot`, {
      batch_name: this.newBatchName,
      created_by_email: email
    }).subscribe({
      next: (res) => {
        if (!res.success) return alert('❌ ' + res.message);

        const maDot = res.batch_code || res.ma_dot;
        const tenDot = res.batch_name || res.ten_dot;

        // ✅ Lưu thông tin đợt kiểm kê hiện tại
        this.currentInventoryBatchId = res.dotId;
        this.currentBatchCode = maDot;
        this.currentBatchName = tenDot;
        this.currentBatchCreatedAt = res.created_at;

        // ✅ Lưu thông tin đợt vào localStorage
        localStorage.setItem('dot_id_moi_nhat', res.dotId.toString());
        localStorage.setItem('ten_dot_moi_nhat', tenDot);
        localStorage.setItem('ma_dot_moi_nhat', maDot);
        localStorage.setItem('ngay_tao_dot_moi_nhat', res.created_at);

        // ✅ Lấy danh sách sản phẩm được chọn
        const selectedCodes = this.danhSachSanPham
          .filter(sp => sp.selected)
          .map(sp => sp.product_code);

        // ✅ Gán sản phẩm vào đợt kiểm kê
        this.http.post<any>(`${environment.apiUrl}/kiem-ke/gan-san-pham-vao-dot`, {
          audit_batch_id: res.dotId, // Cập nhật đúng tên biến của backend
          product_codes: selectedCodes
        }).subscribe({
          next: (ganRes) => {
            if (!ganRes.success) return alert('❌ Gán sản phẩm thất bại: ' + ganRes.message);

            // ✅ LƯU LẠI DANH SÁCH SẢN PHẨM ĐÃ GÁN
            localStorage.setItem('sp_kiem_ke', JSON.stringify(selectedCodes)); // <- thêm dòng này

            alert(`✅ Đã tạo đợt "${tenDot}" và gán ${selectedCodes.length} sản phẩm!`);
            this.showCreateBatchModal = false;
            this.loadProducts();
          },
          error: () => alert('❌ Lỗi khi gán sản phẩm.')
        });
      },
      error: () => alert('❌ Lỗi tạo đợt kiểm kê.')
    });
  }

  assignSelectedProductsToBatch() {
    if (!this.currentInventoryBatchId) {
      alert('Không có đợt kiểm kê nào được chọn để gán sản phẩm.');
      return;
    }

    const savedTam = localStorage.getItem('sp_kiem_ke_selected_tam');
    let tamCodes: string[] = [];
    if (savedTam) {
      try {
        tamCodes = JSON.parse(savedTam);
      } catch (e) {
        console.warn('❌ Không thể parse sp_kiem_ke_selected_tam');
      }
    }

    if (tamCodes.length === 0) {
      alert('⚠️ Bạn chưa chọn sản phẩm nào mới để thêm vào đợt kiểm kê!');
      return;
    }

    const savedCodes = localStorage.getItem('sp_kiem_ke');
    let daGanCodes: string[] = [];
    if (savedCodes) {
      try {
        daGanCodes = JSON.parse(savedCodes);
      } catch (e) {
        console.warn('❌ Không thể parse sp_kiem_ke');
      }
    }

    const maMoi = tamCodes.filter(code => !daGanCodes.includes(code));
    if (maMoi.length === 0) {
      alert('⚠️ Không có sản phẩm mới để gán vào đợt!');
      return;
    }

    this.http.post<any>(`${environment.apiUrl}/kiem-ke/gan-san-pham-vao-dot`, {
      audit_batch_id: this.currentInventoryBatchId,
      product_codes: maMoi
    }).subscribe({
      next: (response) => {
        if (response.success) {
          alert(`✅ ${response.message}\nTổng số pallet đã gán mới: ${response.total_gan}`);

          const updatedCodes = Array.from(new Set([...daGanCodes, ...maMoi]));
          localStorage.setItem('sp_kiem_ke', JSON.stringify(updatedCodes));
          localStorage.removeItem('sp_kiem_ke_selected_tam');

          // ✅ Cập nhật trực tiếp sản phẩm mới trong danh sách
          this.danhSachSanPham.forEach(sp => {
            if (maMoi.includes(sp.product_code)) {
              sp.selected = true;
              sp.isNew = false;
            }
          });

          // ✅ Bắt buộc clone lại để Angular detect thay đổi
          this.danhSachSanPham = [...this.danhSachSanPham];
        } else {
          alert('Lỗi: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Lỗi khi gán sản phẩm vào đợt:', err);
        alert('Có lỗi xảy ra khi gán sản phẩm vào đợt.');
      }
    });
  }

  getClassTinhTrang(sp: any): string {
    if (sp.isNew || sp.actual_quantity == null || sp.actual_quantity === '') return ''; // ⚠️ Không tô màu chữ

    const actual = +sp.actual_quantity || 0;
    const system = +sp.quantity || 0;
    const diff = actual - system;

    if (diff > 0) return 'text-warning fw-bold';
    if (diff < 0) return 'text-danger fw-bold';
    return 'text-success fw-bold';
  }


  tinhThatThoat(sp: any): number | null {
    if (sp.actual_quantity == null || sp.actual_quantity === '') return null;
    const actual = +sp.actual_quantity || 0;
    const system = +sp.quantity || 0;
    const diff = actual - system;
    return diff * sp.unit_price;
  }

  moDanhSachKiemKe() {
    this.showDanhSachKiemKePopup = true;
  }

  boKhoiDanhSachKiemKe(sp: any) {
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xoá sản phẩm "${sp.product_name}" khỏi danh sách kiểm kê không?`);
    if (!confirmDelete) return;

    // 👉 Nếu sản phẩm là "mới" hoặc chưa có đợt thì chỉ xoá local, không gọi API
    if (sp.isNew || !this.currentInventoryBatchId) {
      this.xoaSanPhamKhoiLocalStorage(sp.product_code);
      sp.selected = false;
      sp.isNew = false;
      this.danhSachSanPham = [...this.danhSachSanPham]; // cập nhật UI
      return;
    }

    // 👉 Ngược lại: sản phẩm đã thuộc về 1 đợt kiểm kê → gọi API để xoá khỏi DB
    this.http.post(`${environment.apiUrl}/kiem-ke/xoa-san-pham-khoi-dot`, {
      product_code: sp.product_code,
      dot_id: this.currentInventoryBatchId
    }).subscribe({
      next: () => {
        alert(`✅ Đã xoá "${sp.product_name}" khỏi đợt kiểm kê.`);

        this.xoaSanPhamKhoiLocalStorage(sp.product_code);

        sp.selected = false;
        sp.isNew = false;
        this.danhSachSanPham = [...this.danhSachSanPham];
      },
      error: (err) => {
        console.error('❌ Lỗi khi xoá sản phẩm:', err);
        alert('❌ Không thể xoá sản phẩm khỏi đợt kiểm kê.');
      }
    });
  }

  xoaSanPhamKhoiLocalStorage(product_code: string) {
    try {
      // Xoá khỏi danh sách đã gán
      const daGan: string[] = JSON.parse(localStorage.getItem('sp_kiem_ke') || '[]');
      localStorage.setItem('sp_kiem_ke', JSON.stringify(daGan.filter((code: string) => code !== product_code)));

      // Xoá khỏi danh sách tạm
      const tam: string[] = JSON.parse(localStorage.getItem('sp_kiem_ke_selected_tam') || '[]');
      localStorage.setItem('sp_kiem_ke_selected_tam', JSON.stringify(tam.filter((code: string) => code !== product_code)));
    } catch (e) {
      console.warn('❌ Không thể xử lý localStorage:', e);
    }
  }

  demLaiSanPham(sp: any) {
    const confirmReset = confirm(`Bạn có chắc chắn muốn đếm lại sản phẩm "${sp.product_name}"?\nViệc này sẽ xóa số lượng thực tế và người kiểm trên cả Admin và Nhân viên.`);
    if (!confirmReset) return;

    this.http.post(`${environment.apiUrl}/kiem-ke/reset-san-pham`, {
      product_code: sp.product_code,
      dot_id: this.currentInventoryBatchId
    }).subscribe({
      next: () => {
        alert(`✅ Đã reset sản phẩm "${sp.product_name}" thành công.`);
        sp.actual_quantity = null;
        sp.kiem_ke_email = null;

        this.loadProducts(); // Reload lại
        // 👉 Cập nhật lại localStorage để giữ selected
        const currentCodes = this.danhSachSanPham
          .filter(p => p.selected)
          .map(p => p.product_code);
        localStorage.setItem('sp_kiem_ke', JSON.stringify(currentCodes));
      },
      error: (err) => {
        console.error('❌ Lỗi reset:', err);
        alert('❌ Lỗi khi reset sản phẩm.');
      }
    });
  }

  ketThucDotKiemKe() {
    if (!this.currentInventoryBatchId) return;

    const chuaDem = this.danhSachSanPham
      .filter(sp => sp.selected)
      .filter(sp => sp.actual_quantity == null || sp.actual_quantity === '');

    if (chuaDem.length > 0) {
      alert(`❌ Không thể kết thúc đợt kiểm kê!\nVẫn còn ${chuaDem.length} sản phẩm chưa được kiểm đếm.`);
      return;
    }

    const confirmed = confirm('✅ Bạn chắc chắn muốn kết thúc đợt kiểm kê hiện tại?');
    if (!confirmed) return;

    this.http.put(`${environment.apiUrl}/kiem-ke/dot/${this.currentInventoryBatchId}/ket-thuc`, {}).subscribe({
      next: () => {
        alert(`🎯 Đợt kiểm kê ID ${this.currentInventoryBatchId} đã kết thúc!`);

        this.currentInventoryBatchId = null;
        localStorage.removeItem('dot_id_moi_nhat');
        localStorage.removeItem('sp_kiem_ke');
        localStorage.removeItem('sp_kiem_ke_selected_tam'); // thêm dòng này

        // ✅ Xóa hết sản phẩm đã chọn
        this.danhSachSanPham = this.danhSachSanPham.map(sp => ({
          ...sp,
          selected: false,
          isNew: false
        }));

        this.showDanhSachKiemKePopup = false;
        // this.loadProducts(); // nếu bạn cần tải lại sản phẩm
      },
      error: err => {
        console.error('❌ Lỗi khi kết thúc đợt kiểm kê:', err);
        alert('❌ Không thể kết thúc đợt kiểm kê!');
      }
    });
  }

  xoaTatCaKhoiDanhSachKiemKe() {
    const sanPhamDaChon = this.getDanhSachSanPhamDuocChon();

    if (sanPhamDaChon.length === 0) {
      alert('Không có sản phẩm nào để xoá!');
      return;
    }

    const confirmDelete = confirm(`Bạn có chắc chắn muốn xoá TẤT CẢ ${sanPhamDaChon.length} sản phẩm khỏi đợt kiểm kê không?`);
    if (!confirmDelete) return;

    const spCu = sanPhamDaChon.filter(sp => !sp.isNew);
    const spMoi = sanPhamDaChon.filter(sp => sp.isNew);
    const productCodesCu = spCu.map(sp => sp.product_code);

    const thucHienXoaFrontend = () => {
      // ✅ Reset trạng thái sản phẩm
      this.danhSachSanPham.forEach(sp => {
        sp.selected = false;
        sp.isNew = false;
      });

      // ✅ Xoá localStorage liên quan
      localStorage.removeItem('sp_kiem_ke'); // danh sách đã chọn
      localStorage.removeItem('sp_kiem_ke_selected_tam'); // lựa chọn tạm nếu có

      // ✅ Làm mới UI
      this.danhSachSanPham = [...this.danhSachSanPham];
    };

    if (productCodesCu.length > 0) {
      // Xoá các sản phẩm đã có trong DB
      this.http.post(`${environment.apiUrl}/kiem-ke/xoa-nhieu-san-pham`, {
        dot_id: Number(this.currentInventoryBatchId),
        product_codes: productCodesCu
      }).subscribe({
        next: (res: any) => {
          thucHienXoaFrontend();
          alert(`✅ Đã xoá ${spCu.length + spMoi.length} sản phẩm khỏi đợt kiểm kê.`);
          this.loadProducts(); // Làm mới dữ liệu từ DB
        },
        error: (err) => {
          console.error('❌ Lỗi xoá nhiều sản phẩm:', err);
          alert('❌ Không thể xoá tất cả sản phẩm khỏi đợt kiểm kê.');
        }
      });
    } else {
      // Chỉ có sản phẩm mới (chưa lưu DB)
      thucHienXoaFrontend();
      alert(`✅ Đã xoá ${spMoi.length} sản phẩm mới khỏi danh sách.`);
      this.loadProducts(); // Làm mới dữ liệu
    }
  }

  huyDotKiemKe() {
    if (!this.currentInventoryBatchId) return;

    const confirmed = confirm(`❌ Bạn có chắc chắn muốn huỷ đợt kiểm kê ID ${this.currentInventoryBatchId} không?\nTất cả dữ liệu liên quan sẽ bị xoá!`);
    if (!confirmed) return;

    this.http.delete(`${environment.apiUrl}/kiem-ke/huy-dot/${this.currentInventoryBatchId}`)
      .subscribe({
        next: () => {
          alert(`✅ Đã huỷ đợt kiểm kê ID ${this.currentInventoryBatchId}.`);
          this.currentInventoryBatchId = null;
          localStorage.removeItem('dot_id_moi_nhat');
          localStorage.removeItem('sp_kiem_ke');
          location.reload(); // hoặc this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Lỗi khi huỷ đợt:', err);
          alert('❌ Không thể huỷ đợt kiểm kê.');
        }
      });
  }

  updateFilteredEmails() {
    const keyword = this.filterKiemKe.email?.toLowerCase().trim() || '';

    // Nếu người dùng chưa nhập gì thì không hiển thị dropdown
    if (!keyword || keyword.length < 1) {
      this.filteredEmailSuggestions = [];
      this.showEmailDropdown = false;
      return;
    }

    // Lọc email chứa keyword ở bất kỳ vị trí nào
    this.filteredEmailSuggestions = this.danhSachEmailKiemKe
      .filter(email => email.toLowerCase().includes(keyword));

    // Chỉ hiển thị nếu có email khớp
    this.showEmailDropdown = this.filteredEmailSuggestions.length > 0;
  }

  toggleEmailDropdown(event: MouseEvent) {
    event.stopPropagation(); // chặn blur
    const keyword = this.filterKiemKe.email?.toLowerCase().trim() || '';

    // Lọc trước khi hiển thị
    const matchedEmails = this.danhSachEmailKiemKe.filter(email =>
      email.toLowerCase().includes(keyword)
    );

    if (matchedEmails.length > 0) {
      this.filteredEmailSuggestions = matchedEmails;
      this.showEmailDropdown = true;
    } else {
      this.showEmailDropdown = false;
    }
  }


  selectEmail(email: string) {
    this.filterKiemKe.email = email;
    this.showEmailDropdown = false;
  }

  isCheckboxDisabled(sp: any): boolean {
    const daGanRaw = localStorage.getItem('sp_kiem_ke');
    const daGan: string[] = daGanRaw ? JSON.parse(daGanRaw) : [];

    // ❌ Đừng chặn nếu đã có actual_quantity
    // return daGan.includes(sp.product_code) || sp.actual_quantity != null;

    // ✅ Chỉ chặn khi sản phẩm đã gán cố định vào đợt (không cho bỏ chọn)
    return daGan.includes(sp.product_code);
  }

  hasNewProducts(): boolean {
    return this.getDanhSachSanPhamDuocChon().some(sp => sp.isNew);
  }

  locTheoTrangThaiChon(sp: any): boolean {
    if (this.boLocChon === 'chon') return sp.selected === true;
    if (this.boLocChon === 'bo') return !sp.selected;
    return true; // Mặc định: hiển thị tất cả
  }


}