import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-quanlyncc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quanlyncc.component.html',
  styleUrls: ['./quanlyncc.component.css']
})
export class QuanlynccComponent {
  tuKhoa: string = '';
  nhaCungCap: any = null;
  loading = false;
  traTheoSanPham = false;

  danhSachKhuVuc: any[] = [];
  selectedAreaId: string = '';
  logosTrongKhuVuc: any[] = [];
  logosGocTrongKhuVuc: any[] = [];
  nhaCungCapChiTiet: any = null;

  lichSuNhap: any[] = [];
  logoIndex: number = 0;
  touchStartX = 0;
  touchEndX = 0;

  constructor(private http: HttpClient) {
    this.loadKhuVuc();
    this.loadLogoMacDinh();
  }

  loadKhuVuc() {
    this.http.get<any>(`${environment.apiUrl}/khu-vuc`).subscribe(res => {
      this.danhSachKhuVuc = res;
    });
  }

  loadLogoMacDinh() {
    this.http.get<any[]>(`${environment.apiUrl}/suppliers/recent`).subscribe(res => {
      const uniqueSuppliers = this.getUniqueLatestSuppliers(res);
      this.logosGocTrongKhuVuc = [...uniqueSuppliers];
      this.logosTrongKhuVuc = [...uniqueSuppliers];
    });
  }

  locTheoKhuVuc() {
    this.traTheoSanPham = false;
    this.nhaCungCap = null;
    this.nhaCungCapChiTiet = null;

    if (!this.selectedAreaId) {
      this.loadLogoMacDinh();
      return;
    }

    this.http.get<any[]>(`${environment.apiUrl}/suppliers/by-khu-vuc/${this.selectedAreaId}`).subscribe(res => {
      const uniqueSuppliers = this.getUniqueLatestSuppliers(res);
      this.logosGocTrongKhuVuc = [...uniqueSuppliers];
      this.logosTrongKhuVuc = [...uniqueSuppliers];
    });
  }

  getUniqueLatestSuppliers(suppliers: any[]): any[] {
    const map = new Map<string, any>();

    // Lưu theo tên nhà cung cấp, nếu gặp lại thì giữ bản có thời gian mới hơn
    suppliers.forEach(sup => {
      const name = sup.supplier_name;
      if (!map.has(name)) {
        map.set(name, sup);
      } else {
        const existing = map.get(name);
        if (new Date(sup.updated_at || sup.created_at || '') > new Date(existing.updated_at || existing.created_at || '')) {
          map.set(name, sup);
        }
      }
    });

    return Array.from(map.values());
  }



  isMaSanPham(text: string): boolean {
    return /^[A-Z]{2,5}\d{2,}$/i.test(text.trim());
  }

  timNhaCungCap() {
    if (!this.tuKhoa.trim()) return;

    this.loading = true;
    this.nhaCungCap = null;
    this.nhaCungCapChiTiet = null;
    this.traTheoSanPham = true;

    const keyword = this.tuKhoa.trim();
    const khuVucId = this.selectedAreaId;

    const apiURL = khuVucId
      ? `${environment.apiUrl}/suppliers/by-product/${keyword}?khu_vuc_id=${khuVucId}`
      : `${environment.apiUrl}/suppliers/by-product/${keyword}`;

    this.http.get<any>(apiURL).subscribe(res => {
      this.loading = false;

      if (res.exists) {
        this.nhaCungCap = res.supplier;
      } else {
        // ❗ Nếu không tìm thấy mã sản phẩm, fallback lọc tên NCC trong danh sách
        const keywordLower = keyword.toLowerCase();

        if (!this.logosGocTrongKhuVuc.length) {
          const url = khuVucId
            ? `${environment.apiUrl}/suppliers/by-khu-vuc/${khuVucId}`
            : `${environment.apiUrl}/suppliers/recent`;

          this.http.get<any[]>(url).subscribe(list => {
            this.logosGocTrongKhuVuc = list;
            this.logosTrongKhuVuc = list.filter(logo =>
              logo.supplier_name.toLowerCase().includes(keywordLower)
            );
          });
        } else {
          this.logosTrongKhuVuc = this.logosGocTrongKhuVuc.filter(logo =>
            logo.supplier_name.toLowerCase().includes(keywordLower)
          );
        }
      }
    }, err => {
      this.loading = false;
      console.error('❌ Lỗi khi tra cứu nhà cung cấp:', err);
    });
  }


  chonNhaCungCap(ncc: any) {
    this.traTheoSanPham = false;
    this.nhaCungCap = null;
    this.nhaCungCapChiTiet = null;
    this.lichSuNhap = [];
    this.logoIndex = 0;

    this.http.get<any>(`${environment.apiUrl}/suppliers/detail-by-name/${encodeURIComponent(ncc.supplier_name)}`)
      .subscribe(res => {
        if (res.exists) {
          this.nhaCungCapChiTiet = res;

          // 👉 Gộp logo + đại diện giống nhau
          const grouped: any[] = [];

          for (const entry of res.lich_su_nhap) {
            const key = entry.logo_url + '|' + JSON.stringify(entry.dai_dien.map((d: any) => d.name + d.email + d.phone).sort());

            const found = grouped.find(g =>
              g.key === key
            );

            const san_pham_gop = entry.san_pham.map((sp: any) => ({
              ...sp,
              import_date: entry.import_date
            }));

            if (found) {
              found.san_pham.push(...san_pham_gop);
            } else {
              grouped.push({
                key,
                logo_url: entry.logo_url,
                dai_dien: entry.dai_dien,
                san_pham: san_pham_gop
              });
            }
          }

          // Gán dữ liệu gộp vào lichSuNhap
          this.lichSuNhap = grouped.map(g => ({
            logo_url: g.logo_url,
            dai_dien: g.dai_dien,
            san_pham: g.san_pham
          }));

          this.logoIndex = this.lichSuNhap.length - 1;

        } else {
          alert('❌ Không tìm thấy thông tin chi tiết nhà cung cấp!');
        }
      }, err => {
        console.error('❌ Lỗi khi lấy chi tiết nhà cung cấp:', err);
      });
  }
  

  touchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  touchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    const delta = this.touchEndX - this.touchStartX;

    if (delta > 40 && this.logoIndex > 0) {
      // Vuốt sang phải => về logo cũ hơn
      this.logoIndex--;
    } else if (delta < -40 && this.logoIndex < this.lichSuNhap.length - 1) {
      // Vuốt sang trái => qua logo mới hơn
      this.logoIndex++;
    }
  }



}
