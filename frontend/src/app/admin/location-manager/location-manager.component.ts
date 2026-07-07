import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ProductDetail {
  product_code: string;
  product_name: string;
  product_type: string;
  unit: string;
  image_url: string;
  quantity: number;
  weight_per_unit: number;
  area_per_unit: number;
  manufacture_date: string | Date;
  expiry_date: string | Date;
  unit_price: number;
  total_price: number;
  supplier_name: string;
  receipt_code: string;
  otherLocations: string[];
}


@Component({
  selector: 'app-location-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './location-manager.component.html',
  styleUrls: ['./location-manager.component.css']
})
export class LocationManagerComponent implements OnInit {
  selectedAreaIndex = 0;

  totalWeight = 0;
  totalArea = 0;

  areas: any[] = [];
  pallets: any[] = [];

  palletGrid: any[][] = [];

  selectedProducts: any[] = [];
  currentProductIndex: number = 0;
  showPopup: boolean = false;
  otherLocations: string[] = [];
  currentLocation: string = '';

  chonSanPhamCanChuyen: any = null;
  chonTatCaSanPham: boolean = false;
  choPhepChonPalletDich: boolean = false;
  showMapPopup: boolean = false;
  selectedDestinationPallet: any = null;
  dangChoXacNhanChuyen: boolean = false;
  dangChuyenHangLe: boolean = false;  // true nếu đang chuyển hàng đơn lẻ

  transferLogs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchOverviewAndAreas();
    this.fetchAllTransferLogs();
  }

  fetchOverviewAndAreas() {
    this.http.get<any>(`${environment.apiUrl}/kho/overview`).subscribe({
      next: res => {
        // Gán thống kê kho
        if (res.overview) {
          this.totalWeight = res.overview.tong_suc_chua_kg || 0;
          this.totalArea = res.overview.tong_suc_chua_m2 || 0;
        }

        // Gán danh sách khu vực
        this.areas = res.areas || [];

        // Gọi lần đầu luôn pallet cho khu vực 0
        if (this.areas.length > 0) {
          this.onAreaChange(0);
        }
      },
      error: err => {
        console.error('❌ Lỗi API:', err);
      }
    });
  }

  fetchAllTransferLogs() {
  const email = sessionStorage.getItem('email');
  if (!email) return;

  this.http.get<any[]>(`${environment.apiUrl}/kho/transfer-log?email=${email}`).subscribe({
    next: (res) => {
      this.transferLogs = res;
    },
    error: () => {
      this.transferLogs = [];
      console.warn("⚠ Không thể lấy lịch sử chuyển vị trí.");
    }
  });
}


  onAreaChange(index: number) {
    this.selectedAreaIndex = index;
    const khuVucId = this.areas[index]?.id;

    if (!khuVucId) {
      console.warn('⚠ Không tìm thấy ID khu vực tại index:', index);
      return;
    }

    this.http.get<any[]>(`${environment.apiUrl}/kho/area/${khuVucId}`).subscribe({
      next: data => {
        this.pallets = data;
        this.generatePalletGrid();
      },
      error: err => console.error('❌ Lỗi lấy pallet:', err)
    });
  }

  generatePalletGrid() {
    this.palletGrid = [];
    for (let i = 0; i < this.pallets.length; i += 10) {
      this.palletGrid.push(this.pallets.slice(i, i + 10));
    }
  }

  get selectedArea() {
    return this.areas[this.selectedAreaIndex] || {};
  }

  get currentWeightUsed() {
    return this.pallets.reduce((acc, p) => acc + (p.weightUsed || 0), 0);
  }

  get currentAreaUsed() {
    return this.pallets.reduce((acc, p) => acc + (p.areaUsed || 0), 0);
  }

onPalletClick(pallet: any) {
  if (this.choPhepChonPalletDich) {
    const maxWeight = 500;

    const productsToMove = this.chonTatCaSanPham
      ? this.chonSanPhamCanChuyen
      : [this.chonSanPhamCanChuyen];

    const tongKhoiLuong = productsToMove.reduce((sum: number, sp: any) =>
      sum + (sp.quantity || 0) * (sp.weight_per_unit || 0), 0);

    if ((pallet.weightUsed || 0) + tongKhoiLuong > maxWeight) {
      alert("❌ Vị trí đích vượt quá 500kg, chọn pallet khác.");
      return;
    }

    // ✅ Gán pallet được chọn, chờ xác nhận
    this.selectedDestinationPallet = pallet;
    this.dangChoXacNhanChuyen = true;

    return; // ❗ Không chuyển ngay
  }

  // Nếu không đang chuyển thì load sản phẩm như cũ
  if (pallet.weightUsed === 0) return;

  this.http.get<any>(`${environment.apiUrl}/kho/pallet/${pallet.name}`).subscribe({
    next: (res) => {
      this.selectedProducts = res.products.map((p: any) => ({
        ...p.product,
        otherLocations: p.otherLocations
      }));
      this.currentProductIndex = 0;
      this.currentLocation = pallet.name;
      this.dangChuyenHangLe = true;  // ✅ Luôn hiển thị chế độ chuyển hàng trước
      this.showPopup = true;
    },
    error: err => console.error('❌ Lỗi lấy thông tin pallet:', err)
  });
}


  closePopup() {
    this.showPopup = false;
  }

chonChuyenHang() {
  this.chonTatCaSanPham = false;
  this.dangChuyenHangLe = true; // ✅ đang chuyển hàng đơn lẻ
  this.chonSanPhamCanChuyen = this.selectedProducts[this.currentProductIndex];
  this.choPhepChonPalletDich = true;
  this.showMapPopup = true;
}

chonChuyenToanBo() {
  this.chonTatCaSanPham = true;
  this.dangChuyenHangLe = false; // ✅ không hiển thị các vị trí khác
  this.chonSanPhamCanChuyen = [...this.selectedProducts];
  this.choPhepChonPalletDich = true;
  this.showMapPopup = true;
}


huyChonPalletDich() {
  this.choPhepChonPalletDich = false;
  this.showMapPopup = false;
}

xacNhanChuyen() {
  const productsToMove = this.chonTatCaSanPham
    ? this.chonSanPhamCanChuyen
    : [this.chonSanPhamCanChuyen];

  const email = sessionStorage.getItem('email');
  const fromPallet = this.currentLocation;
  const toPallet = this.selectedDestinationPallet.name;

  // Gửi yêu cầu chuyển hàng
  this.http.post(`${environment.apiUrl}/kho/chuyen-pallet`, {
    products: productsToMove,
    from: fromPallet,
    to: toPallet,
    user_email: email
  }).subscribe({
    next: () => {
      alert("✅ Đã chuyển hàng thành công.");

      // Reset trạng thái UI
      this.choPhepChonPalletDich = false;
      this.showPopup = false;
      this.showMapPopup = false;
      this.selectedDestinationPallet = null;
      this.dangChoXacNhanChuyen = false;

      // Reload lại pallet hiện tại
      this.onAreaChange(this.selectedAreaIndex);

      // 🔁 Lấy lại log chuyển vị trí
      this.fetchAllTransferLogs();
    },
    error: () => {
      alert("❌ Lỗi khi chuyển hàng.");
    }
  });
}


}
