import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PhieuMuaService } from '../../services/phieu-mua.service'; // ✅ Import service
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sanphamcuakho',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sanphamcuakho.component.html',
  styleUrls: ['./sanphamcuakho.component.css']
})
export class SanphamcuakhoComponent implements OnInit {
  // ✅ Danh sách
  sanPhamList: any[] = [];
  danhSachKhuVuc: any[] = [];
  loaiHang: string[] = [];

  // ✅ Bộ lọc
  selectedKhuVuc: string = '';
  selectedType: string = '';
  keyword: string = '';
  toDate: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  selectedProduct: any = null;

  constructor(private http: HttpClient, private phieuMuaService: PhieuMuaService) {}

  ngOnInit(): void {
    this.layDanhSachSanPham();
    this.layKhuVuc();
    this.layLoaiHang(); // Ban đầu load tất cả loại hàng
  }

  // 🟢 Gọi API lấy danh sách sản phẩm theo filter
  layDanhSachSanPham() {
    const params: any = {
      keyword: this.keyword,
      product_type: this.selectedType,
      khu_vuc_id: this.selectedKhuVuc,
      toDate: this.toDate,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
    };

    // ❌ Xoá các key null hoặc rỗng
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null) {
        delete params[key];
      }
    });

    this.http.get<any[]>(`${environment.apiUrl}/products-detail/filter`, { params })
      .subscribe(data => this.sanPhamList = data);
  }

  // 🟢 Gọi API lấy khu vực
  layKhuVuc() {
    this.http.get<any[]>(`${environment.apiUrl}/khu-vuc`)
      .subscribe(data => this.danhSachKhuVuc = data);
  }

  // 🟢 Gọi API lấy loại hàng theo khu vực
  layLoaiHang() {
    const params: any = {};
    if (this.selectedKhuVuc) {
      params.khu_vuc_id = this.selectedKhuVuc;
    }

    this.http.get<string[]>(`${environment.apiUrl}/products-detail/types`, { params })
      .subscribe(data => {
        this.loaiHang = data;
        this.selectedType = ''; // reset loại hàng sau khi thay đổi khu
      });
  }

  // 🟢 Khi thay đổi khu vực
  onKhuVucChange() {
    this.layLoaiHang(); // Tự động lọc loại theo khu
  }

  chonSanPham(sp: any) {
    this.selectedProduct = sp;
  }

  themVaoPhieuMua(sp: any) {
    const quantity = 1;

    const weightPerUnit = sp.weight_per_unit || (sp.weight && sp.quantity ? sp.weight / sp.quantity : 0);

    const spDuocChon = {
      product_name: sp.product_name,
      product_type: sp.product_type,
      product_code: sp.product_code,
      unit: sp.unit,
      quantity, // số lượng đặt mua có thể chỉnh sau
      original_quantity: sp.quantity || sp.stock_quantity || 0,  // 🆕 Số lượng tồn gốc đúng
      weight_per_unit: weightPerUnit,
      weight: quantity * weightPerUnit,
      area: sp.area || 0,
      manufacture_date: sp.manufacture_date || '',
      expiry_date: sp.expiry_date || '',
      unit_price: sp.unit_price || 0,
      imageFile: null,
      preview: sp.image_url || ''
    };

    const ok = this.phieuMuaService.addProduct(spDuocChon);

    if (ok) {
      alert('✅ Đã thêm sản phẩm vào đơn hàng!');
      this.selectedProduct = null;
    } else {
      alert('⚠️ Sản phẩm đã có trong đơn hàng!');
    }
  }


}
