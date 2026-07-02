import { Component, OnInit } from '@angular/core';   
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartDataset, ChartOptions, ChartType, ChartData } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { environment } from '../../../environments/environment';

interface KhuVuc {
  khu_vuc_id: number;
  ten_khu_vuc: string;
  mo_ta: string;
  suc_chua_kg: number;
  da_su_dung_kg: number;
  suc_chua_m2: number;
  da_su_dung_m2: number;
  so_san_pham: number;
  tong_so_luong: number;
  tong_khoi_luong: number;
  tong_dien_tich: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl:'./dashboard.component.html',
  styleUrls: [
    '../../../assets/css/kaiadmin.min.css',
    '../../../assets/css/demo.css'
  ]
})

export class DashboardComponent implements OnInit {
  danhSachPhieu: any[] = [];
  danhSachPhieuGoc: any[] = [];
  tongPhieuNhap: number = 0;
  tongPhieuXuat: number = 0;
  sapHetList: any[] = [];

  barChartType: ChartType = 'bar';
  barChartLabels: string[] = [];
  barChartData: ChartDataset<'bar'>[] = [];
  barChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  filterType = 'thang';  // Dùng cho biểu đồ nhập/xuất
  locationFilter = 'all';
  showLocationChart = false; // false: nhập/xuất, true: sức chứa kho

  khuVucChartOptions: ChartOptions = {};
  khuVucChartType: ChartType = 'bar';
  locationChartType: ChartType = 'bar';  // Mặc định là bar
  khuVucChartDataFull: ChartData<'bar' | 'doughnut' | 'pie', number[]> = {
    labels: [],
    datasets: []
  };

  totalUsedPercent = 0;

  doanhThu: number = 0;
  tongNhap: number = 0;
  tongXuat: number = 0;
  nhaCungCapList: any[] = [];
  lichSuKiemKe: any[] = [];

  aiSummary = '';
  loading = false;
  stats: any = {};
  totalFreePositions: number = 0;

  recentLabels: string[] = [];
  recentNhapData: number[] = [];
  recentXuatData: number[] = [];

  recentChartData: ChartDataset<'bar'>[] = [];
  recentChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      x: { title: { display: true, text: 'Phiếu' } },
      y: { title: { display: true, text: 'Tổng tiền (₫)' }, beginAtZero: true }
    }
  };
  recentChartType: ChartType = 'bar';
  doanhThuData: number[] = [];
  doanhThuLabels: string[] = [];
  doanhThuPointColors: string[] = [];
  doanhThuPointHoverLabels: string[] = [];
  doanhThuPhieu: { receipt_code: string, created_date: string, total_amount: number, type: string }[] = [];
  doanhThuChart: Chart | null = null;

  tongGiaTriTonKho: number = 0; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
    this.laySoHoaDon();
    this.loadSanPhamSapHet();
    this.layDuLieuNhapXuat();
    this.loadSucChuaKho();
    this.getDoanhThu();
    this.getTongGiaTriTonKho()
    this.loadFreePositions();

    this.http.get<any[]>(`${environment.apiUrl}/nha_cung_cap`).subscribe(
      data => {
        this.nhaCungCapList = data;
      },
      err => {
        console.error("Lỗi lấy danh sách nhà cung cấp:", err);
      }
    );

    this.http.get<any[]>(`${environment.apiUrl}/kiem_ke_lich_su`)
    .subscribe({
      next: (data) => this.lichSuKiemKe = data,
      error: (err) => console.error('Lỗi lấy lịch sử kiểm kê:', err)
    });

    this.loadStatistics();
  }

  getTongGiaTriTonKho() {
  this.http.get<{ tongGiaTriTonKho: number }>(`${environment.apiUrl}/tong_gia_tri_ton_kho`)
    .subscribe({
      next: res => {
        this.tongGiaTriTonKho = res.tongGiaTriTonKho ?? 0;
      },
      error: err => console.error(err)
    });
  }

  loadPhieu() {
    this.http.get<any[]>(`${environment.apiUrl}/phieu-xuat`).subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.danhSachPhieu = [...data];
    });
  }

  laySoHoaDon() {
    this.http.get<any>(`${environment.apiUrl}/tong-phieu-nhap-xuat`).subscribe({
      next: (res) => {
        this.tongPhieuNhap = res.tong_phieu_nhap;
        this.tongPhieuXuat = res.tong_phieu_xuat;
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy tổng phiếu:', err);
      }
    });
  }

  loadSanPhamSapHet() {
    this.http.get<any[]>(`${environment.apiUrl}/products-detail/sap-het`).subscribe({
      next: (data) => {
        this.sapHetList = data;
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy sản phẩm sắp hết:', err);
      }
    });
  }

  layDuLieuNhapXuat() {
    const url = `${environment.apiUrl}/thong-ke?type=${this.filterType}`;
    this.http.get<any[]>(url).subscribe(data => {
      const labelSet = new Set<string>();
      const nhapMap = new Map<string, number>();
      const xuatMap = new Map<string, number>();

      data.forEach(item => {
        const label = item.label 
          ? (this.filterType === 'ngay' ? this.formatDate(item.label) : item.label)
          : '';

        labelSet.add(label);
        if (item.loai === 'nhap') {
          nhapMap.set(label, +item.tong);
        } else if (item.loai === 'xuat') {
          xuatMap.set(label, +item.tong);
        }
      });

      const sortedLabels = Array.from(labelSet).sort();
      this.barChartLabels = sortedLabels;

      const nhapData = sortedLabels.map(label => nhapMap.get(label) || 0);
      const xuatData = sortedLabels.map(label => xuatMap.get(label) || 0);

      this.barChartData = [
        { data: nhapData, label: 'Nhập kho', backgroundColor: '#4CAF50' },
        { data: xuatData, label: 'Xuất kho', backgroundColor: '#F44336' }
      ];
    }, error => {
      console.error('❌ Lỗi khi lấy dữ liệu nhập/xuất:', error);
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  prevChart() {
    this.showLocationChart = false;
    this.filterType = 'thang';
    this.layDuLieuNhapXuat();
  }

  nextChart() {
    this.showLocationChart = true;
    this.loadSucChuaKho();
  }

  loadSucChuaKho() {
    this.http.get<{ totalUsedPercent: number, data: KhuVuc[] }>(`${environment.apiUrl}/khu_vuc_suc_chua`).subscribe({
      next: (res) => {
        if (!res || !res.data || res.data.length === 0) {
          this.totalUsedPercent = 0;
          this.khuVucChartDataFull = { labels: [], datasets: [] };
          return;
        }

        const khuVucData = res.data;

        // Màu cho bar chart: mỗi khu 2 màu (dùng, còn lại)
        const usedColorsBar = ['#E53935', '#1E88E5', '#FB8C00', '#8E24AA', '#43A047'];
        const remainingColorsBar = ['#FFCDD2', '#BBDEFB', '#FFE0B2', '#E1BEE7', '#C8E6C9'];

        if (this.locationChartType === 'bar') {
          const labels = khuVucData.map(kv => kv.ten_khu_vuc);
          const usedData = khuVucData.map(kv => kv.da_su_dung_kg);
          const remainingData = khuVucData.map(kv => 50000 - kv.da_su_dung_kg);

          this.khuVucChartDataFull = {
            labels,
            datasets: [
              {
                label: 'Đã dùng (kg)',
                data: usedData,
              },
              {
                label: 'Còn lại (kg)',
                data: remainingData,
              }
            ]
          };

          this.khuVucChartOptions = {
            indexAxis: 'y',
            responsive: true,
            scales: {
              x: { stacked: true, max: 50000, ticks: { callback: v => v + ' kg' } },
              y: { stacked: true }
            },
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Sức chứa kho theo khu vực (kg)' }
            }
          };

        } else if (this.locationChartType === 'pie') {
          // Biểu đồ tròn 10 phần (5 khu * 2 phần: dùng và còn lại)
          const labels = khuVucData.flatMap(kv => [
            `${kv.ten_khu_vuc} - Đã dùng`,
            `${kv.ten_khu_vuc} - Còn lại`
          ]);

          const data: number[] = [];
          khuVucData.forEach(kv => {
            data.push(kv.da_su_dung_kg, 50000 - kv.da_su_dung_kg);
          });

          // Màu cho pie chart (xen kẽ màu dùng và còn lại tương phản)
          const usedColorsPie = ['#D32F2F', '#1976D2', '#F57C00', '#7B1FA2', '#388E3C'];
          const remainingColorsPie = ['#FFCDD2', '#BBDEFB', '#FFE0B2', '#E1BEE7', '#C8E6C9'];

          const backgroundColor: string[] = [];
          for (let i = 0; i < 5; i++) {
            backgroundColor.push(usedColorsPie[i], remainingColorsPie[i]);
          }

          this.khuVucChartDataFull = {
            labels,
            datasets: [{
              data,
              backgroundColor,
              borderColor: '#fff',
              borderWidth: 2,
              hoverOffset: 10
            }]
          };

          this.khuVucChartOptions = {
            responsive: true,
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 15, padding: 10 } },
              title: { display: true, text: 'Phân bổ sức chứa kho theo khu vực' },
              tooltip: {
                callbacks: {
                  label: ctx => {
                    const label = ctx.label || '';
                    const value = ctx.parsed || 0;
                    return `${label}: ${value.toLocaleString()} kg`;
                  }
                }
              }
            }
          };
        }

        this.totalUsedPercent = res.totalUsedPercent;
        this.khuVucChartType = this.locationChartType;
      },
      error: (err) => {
        console.error('Lỗi lấy danh sách khu vực:', err);
      }
    });
  }

  getProgressBarClass(percent: number): string {
    if (percent > 80) return 'bg-danger';
    if (percent > 50) return 'bg-warning';
    return 'bg-success';
  }

  exportExcel() {
    console.log('Xuất Excel đang thực hiện...');
    // TODO: xử lý xuất Excel ở đây
  }

  getDoanhThu() {
    this.http.get<{
      phieu: { receipt_code: string, created_date: string, total_amount: number, type: string }[],
      tongNhap: number,
      tongXuat: number,
      doanhThu: number
    }>(`${environment.apiUrl}/doanh_thu`).subscribe({
      next: res => {
        console.log('Dữ liệu doanh thu từ API (raw):', res);

        if (res.phieu) {
          res.phieu.forEach((p, idx) => {
            console.log(`#${idx + 1} - code: ${p.receipt_code}, date: ${p.created_date}, amount: ${p.total_amount}, type: ${p.type}`);
          });
        } else {
          console.warn('API trả về phieu rỗng hoặc không tồn tại');
        }

        this.doanhThuPhieu = res.phieu ?? [];
        this.tongNhap = res.tongNhap ?? 0;
        this.tongXuat = res.tongXuat ?? 0;
        this.doanhThu = res.doanhThu ?? 0;

        this.renderDoanhThuChart();
      },
      error: err => {
        console.error('Lỗi lấy doanh thu:', err);
      }
    });
  }

  ngAfterViewInit() {
    // Không vẽ chart ở đây nữa, sẽ vẽ sau khi load xong dữ liệu
  }

renderDoanhThuChart() {
  const ctx = document.getElementById('doanhThuChart') as HTMLCanvasElement | null;
  if (!ctx) {
    console.error('Không tìm thấy canvas #doanhThuChart');
    return;
  }

  // Hủy biểu đồ cũ nếu tồn tại
  if (this.doanhThuChart) {
    this.doanhThuChart.destroy();
  }

  if (!this.doanhThuPhieu || this.doanhThuPhieu.length === 0) {
    console.warn('Dữ liệu doanhThuPhieu rỗng, không vẽ biểu đồ.');
    return;
  }

  // Dữ liệu cho biểu đồ
  const labels = this.doanhThuPhieu.map(p => p.receipt_code);
  const data = this.doanhThuPhieu.map(p => Number(p.total_amount));

  // Thiết lập màu sắc theo yêu cầu: nhập là đỏ, xuất là xanh lá
  const pointBackgroundColors = this.doanhThuPhieu.map(p =>
    p.type === 'nhap' ? '#FF4500' : '#32CD32'
  );

  // Khởi tạo biểu đồ đường cong mượt mà để thể hiện sự "lên xuống"
  this.doanhThuChart = new Chart(ctx, {
    type: 'line', // Sử dụng biểu đồ line
    data: {
      labels,
      datasets: [{
        label: 'Doanh thu 7 phiếu gần nhất',
        data,
        borderColor: '#4299e1', // Màu đường line
        backgroundColor: 'rgba(66, 153, 225, 0.2)', // Màu nền dưới đường line
        fill: true,
        tension: 0.4, // Tạo đường cong mượt mà
        cubicInterpolationMode: 'monotone', // Chế độ nội suy đường cong
        pointBackgroundColor: pointBackgroundColors, // Màu điểm theo loại phiếu
        pointBorderColor: '#fff', // Viền điểm màu trắng
        pointRadius: 8, // Kích thước điểm
        pointHoverRadius: 12, // Kích thước điểm khi hover
        borderWidth: 2, // Độ dày đường line
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: {
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: true,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 8,
          cornerRadius: 4,
          callbacks: {
            // Hiển thị mã phiếu trong tiêu đề tooltip
            title: ctx => this.doanhThuPhieu[ctx[0].dataIndex].receipt_code,
            // Hiển thị loại phiếu và tổng tiền
            label: ctx => {
              const p = this.doanhThuPhieu[ctx.dataIndex];
              const vnAmount = Number(p.total_amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
              const type = p.type === 'nhap' ? 'Phiếu nhập' : 'Phiếu xuất';
              return `${type}: ${vnAmount}`;
            }
          }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 12 },
            usePointStyle: true,
            padding: 20,
            // Tạo chú thích thủ công cho 2 loại phiếu
            generateLabels: (chart) => {
              return [
                {
                  text: 'Phiếu nhập',
                  fillStyle: '#FF4500',
                  strokeStyle: '#FF4500',
                  lineWidth: 0,
                  pointStyle: 'circle',
                  hidden: false
                },
                {
                  text: 'Phiếu xuất',
                  fillStyle: '#32CD32',
                  strokeStyle: '#32CD32',
                  lineWidth: 0,
                  pointStyle: 'circle',
                  hidden: false
                }
              ];
            }
          }
        },
        title: {
          display: false, // Bỏ tiêu đề biểu đồ để gọn hơn
        },
      },
      scales: {
        x: {
          // Bỏ tiêu đề và số dưới trục X
          title: { display: false },
          ticks: { display: false },
          grid: { display: false },
        },
        y: {
          // Bỏ tiêu đề trục Y
          title: { display: false },
          beginAtZero: true,
          ticks: {
            callback: val => (Number(val) / 1000).toLocaleString('vi-VN') + ' VND',
            font: { size: 10 }
          },
          grid: {
            color: '#f0f0f0'
          }
        }
      },
      layout: {
        padding: 10
      }
    }
  });
}

  
  loadStatistics() {
    Promise.all([
      this.http.get<{ tong_phieu_nhap: number; tong_phieu_xuat: number }>(`${environment.apiUrl}/tong-phieu-nhap-xuat`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/products-detail/sap-het`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/doanh_thu`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/khu_vuc_suc_chua`).toPromise(),
    ]).then(([phieu, sapHet, doanhThu, sucChua]) => {
      this.stats = {
        tongPhieuNhap: phieu?.tong_phieu_nhap ?? 0,
        tongPhieuXuat: phieu?.tong_phieu_xuat ?? 0,
        sanPhamSapHet: sapHet?.length ?? 0,
        tongDoanhThuNhap: doanhThu?.tongNhap ?? 0,
        tongDoanhThuXuat: doanhThu?.tongXuat ?? 0,
        doanhThu: doanhThu?.doanhThu ?? 0,
        sucChuaUsedPercent: sucChua?.totalUsedPercent ?? 0,
      };
    }).catch(err => {
      console.error('Lỗi lấy thống kê:', err);
    });
  }

  getAISummary() {
    this.loading = true;
    this.http.post<{ summary: string }>(`${environment.apiUrl}/ai-summary`, this.stats)
      .subscribe({
        next: res => {
          this.aiSummary = res.summary;
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.aiSummary = 'Có lỗi xảy ra khi gọi AI.';
          this.loading = false;
        }
      });
  }

  loadFreePositions() {
    this.http.get<{ totalFreePositions: number }>(`${environment.apiUrl}/vi-tri-con-trong`).subscribe({
      next: (res) => {
        this.totalFreePositions = res.totalFreePositions ?? 0;
      },
      error: (err) => {
        console.error('Lỗi lấy tổng vị trí còn trống:', err);
        this.totalFreePositions = 0;
      }
    });
  }
  

  
}
