import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import html2pdf from 'html2pdf.js';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-invoice-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-manager.component.html',
  styleUrls: ['./invoice-manager.component.css']
})
export class InvoiceManagerComponent implements OnInit {
  hoaDonList: any[] = [];
  filteredHoaDonList: any[] = [];

  filter = {
    loai: '',
    ngayBatDau: '',
    ngayKetThuc: '',
    tongTienMin: null,
    tongTienMax: null,
    trangThai: '',
    keyword: ''
  };

  selectedHoaDon: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const userId = sessionStorage.getItem('id');
    if (userId) {
      this.http.get<any[]>(`${environment.apiUrl}/hoa-don`).subscribe({
        next: (data) => {
          this.hoaDonList = data.map(hd => ({
            ...hd,
            daXuatHoaDon: !!hd.da_xuat_hoa_don
          }));
          this.locHoaDon();
        },
        error: () => alert('❌ Lỗi khi lấy danh sách hóa đơn')
      });
    } else {
      alert('❌ Bạn cần đăng nhập!');
    }
  }

  xemChiTietHoaDon(hd: any) {
    const formatDate = (val: any): string | null => {
      if (!val) return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    this.selectedHoaDon = {
      ...hd,
      created_date: formatDate(hd.created_date),
      meeting_date: formatDate(hd.meeting_date),
      delivery_date: formatDate(hd.delivery_date),
      products: (hd.products || []).map((sp: any) => ({
        ...sp,
        manufacture_date: formatDate(sp.manufacture_date),
        expiry_date: formatDate(sp.expiry_date),
      }))
    };

    setTimeout(() => {
      hd.products?.forEach((sp: any) => {
        const svgElement = document.getElementById('barcode-' + sp.product_code);
        if (svgElement) {
          JsBarcode(svgElement, sp.product_code, {
            format: 'CODE128',
            displayValue: false,
            height: 40,
            width: 1.5,
            margin: 0
          });
        }
      });
    }, 100);
  }

  dongChiTiet() {
    this.selectedHoaDon = null;
  }

  getStepClass(trangThai: string, step: string): string {
    const steps = ['Đã gửi phiếu', 'Đã duyệt', 'Đã nhập hàng vào kho'];
    const currentStepIndex = steps.indexOf(trangThai);
    const thisStepIndex = steps.indexOf(step);
    return currentStepIndex >= thisStepIndex ? 'step active' : 'step';
  }

  getStepClassXuat(trangThai: string, step: string): string {
    const steps = ['Đã gửi phiếu', 'Đã duyệt', 'Đã xuất hàng khỏi kho'];
    const currentStepIndex = steps.indexOf(trangThai);
    const thisStepIndex = steps.indexOf(step);
    return currentStepIndex >= thisStepIndex ? 'step active' : 'step';
  }


  locHoaDon() {
    this.filteredHoaDonList = this.hoaDonList.filter(hd => {
      const ngayTao = new Date(hd.created_date || hd.created_at);
      const { loai, ngayBatDau, ngayKetThuc, tongTienMin, tongTienMax, trangThai, keyword } = this.filter;

      return (
        (!loai || hd.loai === loai) &&
        (!trangThai || hd.trang_thai === trangThai) &&
        (!ngayBatDau || new Date(ngayBatDau) <= ngayTao) &&
        (!ngayKetThuc || new Date(ngayKetThuc) >= ngayTao) &&
        (!tongTienMin || hd.total_amount >= tongTienMin) &&
        (!tongTienMax || hd.total_amount <= tongTienMax) &&
        (!keyword || hd.receipt_code?.toLowerCase().includes(keyword.toLowerCase()))
      );
    });
  }

  xuatHoaDonNhap(hd: any) {
    this.xuatPDF(hd, `hoa-don-xuat-pdf`, `phieu-nhap/${hd.id}/xuat-hoa-don`, `${hd.receipt_code}.pdf`);
  }

  xuatHoaDonXuat(hd: any) {
    this.xuatPDF(hd, `hoa-don-xuat-pdf`, `phieu-xuat/${hd.id}/xuat-hoa-don`, `${hd.receipt_code}_xuat.pdf`);
  }

  private xuatPDF(hd: any, elementId: string, apiPath: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const images = element.getElementsByTagName('img');
    const promises: Promise<void>[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.complete) {
        promises.push(new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }));
      }
    }

    Promise.all(promises).then(() => {
      const opt = {
        margin: 0.2,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 1.2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' as const },
      };

      html2pdf().set(opt).from(element).save().then(() => {
        this.http.put(`${environment.apiUrl}/${apiPath}`, {}).subscribe(() => {
          hd.daXuatHoaDon = true;
        });
      });
    });
  }

  // xuatHoaDonNhapThongMinh
xuatHoaDonNhapThongMinh(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  // Lưu trữ các thuộc tính CSS ban đầu
  const originalStyle = element.style.cssText;

  // Tạm thời loại bỏ padding và margin để giảm khoảng trắng
  element.style.padding = '0';
  element.style.margin = '0';
  element.style.boxSizing = 'border-box'; // Đảm bảo padding và border không thêm vào chiều rộng/cao

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Khôi phục lại style ban đầu sau khi đã chụp xong
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [594, 420] // A2 landscape
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const padding = 0; // Đặt padding PDF là 0 vì khoảng trắng đã được loại bỏ trên HTML
      const contentWidth = pageWidth - 2 * padding;
      const contentHeight = pageHeight - 2 * padding;

      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = contentWidth / contentHeight;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (imgRatio > pdfRatio) {
        finalHeight = contentWidth / imgRatio;
      } else {
        finalWidth = contentHeight * imgRatio;
      }

      const offsetX = (pageWidth - finalWidth) / 2;
      const offsetY = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(`${hd.receipt_code}.pdf`);

      this.http.put(`${environment.apiUrl}/phieu-nhap/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
          hd.daXuatHoaDon = true;
        });
    });
  });
}

// xuatHoaDonXuatThongMinh
xuatHoaDonXuatThongMinh(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  // Lưu trữ các thuộc tính CSS ban đầu
  const originalStyle = element.style.cssText;

  // Tạm thời loại bỏ padding và margin để giảm khoảng trắng
  element.style.padding = '0';
  element.style.margin = '0';
  element.style.boxSizing = 'border-box'; // Đảm bảo padding và border không thêm vào chiều rộng/cao

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Khôi phục lại style ban đầu sau khi đã chụp xong
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [594, 420] // A2 landscape
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const padding = 0; // Đặt padding PDF là 0
      const contentWidth = pageWidth - 2 * padding;
      const contentHeight = pageHeight - 2 * padding;

      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = contentWidth / contentHeight;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (imgRatio > pdfRatio) {
        finalHeight = contentWidth / imgRatio;
      } else {
        finalWidth = contentHeight * imgRatio;
      }

      const offsetX = (pageWidth - finalWidth) / 2;
      const offsetY = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(`${hd.receipt_code}_xuat.pdf`);

      this.http.put(`${environment.apiUrl}/phieu-xuat/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
          hd.daXuatHoaDon = true;
        });
    });
  });
}
}
