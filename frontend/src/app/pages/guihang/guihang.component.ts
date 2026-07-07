import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { GuihangService } from '../../services/phieu-nhap.service'; // Đường dẫn đúng
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-guihang',
  standalone: true,                            // ✅ Đây là điều kiện bắt buộc
  imports: [CommonModule, FormsModule, HttpClientModule],  // ✅ Import các module cần
  templateUrl: './guihang.component.html',
  styleUrls: ['./guihang.component.css']
})
export class GuihangComponent {
    formData: any = {
    created_date: '',
    supplier_name: '',
    supplier_address: '',
    logo: null,
    products: []
  };

  generatedReceiptCode: string = ''; // để hiển thị mã phiếu sau khi gửi

  userId = sessionStorage.getItem('id');
  userEmail = sessionStorage.getItem('email');
  userInfo: any = {};
  today = new Date().toISOString().substring(0, 10);

  maSanPhamCanThem: string = '';

  constructor(private http: HttpClient, private guiHangService: GuihangService) {}

  ngOnInit() {
    const savedForm = this.guiHangService.getFormData();
    const savedProducts = this.guiHangService.getProducts();

    if (savedForm) {
      this.formData = { ...this.formData, ...savedForm };

      // ✅ Nếu là logo URL cũ -> gán lại vào formData.logo để submit gửi đúng
      if (savedForm.logo_url && !this.formData.logo) {
        this.formData.logo = savedForm.logo_url;
      }
    } else {
      this.formData.created_date = this.today;
    }

    if (savedProducts && savedProducts.length) {
      this.formData.products = savedProducts;
    } else {
      this.addProduct();
    }

    this.http.get<any>(`${environment.apiUrl}/user-info/${this.userId}`).subscribe({
      next: (res) => this.userInfo = res || {},
      error: () => alert('Không thể lấy thông tin người dùng.')
    });
  }


  addProduct() {
    this.formData.products.push({
      product_name: '',
      product_type: '',
      product_code: '',
      unit: '',
      weight: 0,
      area: 0, // ✅ Thêm diện tích
      manufacture_date: '',
      expiry_date: '',
      quantity: 0,
      unit_price: 0,
      imageFile: null,
      preview: ''
    });
  }


  removeProduct(index: number) {
    this.formData.products.splice(index, 1);

    // ❗ Nếu không còn sản phẩm nào thuộc loại "có sẵn" (readonly: true)
    const stillHasReadonly = this.formData.products.some((p: any) => p.readonly);

    if (!stillHasReadonly) {
      // 👉 Xoá toàn bộ thông tin nhà cung cấp vì không còn sản phẩm liên quan
      this.formData.supplier_name = '';
      this.formData.logoPreview = '';
      this.formData.supplier_address = '';
      this.formData.representative_name = '';
      this.formData.representative_email = '';
      this.formData.representative_phone = '';
      this.formData.logo = null;
    }

    this.autoSave();
  }

  onLogoChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        this.formData.logoPreview = reader.result;
        this.formData.logo = file; // lưu file ảnh thật để gửi lên server
      };

      reader.readAsDataURL(file);
    }
  }


  onProductImageChange(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        // Lưu đường dẫn preview vào formData.products
        this.formData.products[index].preview = reader.result;
        this.formData.products[index].imageFile = file; // lưu file để upload về server nếu cần
      };

      reader.readAsDataURL(file);
    }
  }


  calculateTotal() {
    return this.formData.products.reduce((sum: number, p: any) => {
      return sum + (p.quantity * p.unit_price);
    }, 0);
  }

  submitForm() {
    // ... các kiểm tra hiện tại trước đó

    // Validate đại diện nhà cung cấp
    if (
      !this.formData.representative_name ||
      !this.formData.representative_email ||
      !this.formData.representative_phone
    ) {
      alert('❌ Vui lòng điền đầy đủ thông tin đại diện nhà cung cấp.');
      return;
    }

    // Có thể validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.formData.representative_email)) {
      alert('❌ Email đại diện không hợp lệ.');
      return;
    }

    // Validate phone (chỉ chứa số, ít nhất 7 ký tự)
    const phonePattern = /^[0-9]{7,20}$/;
    if (!phonePattern.test(this.formData.representative_phone)) {
      alert('❌ Số điện thoại đại diện không hợp lệ.');
      return;
    }

    // Nếu tất cả hợp lệ, tiếp tục tạo FormData và gửi
    const form = new FormData();
    form.append('created_date', this.formData.created_date);
    form.append('supplier_name', this.formData.supplier_name);
    form.append('supplier_address', this.formData.supplier_address);
    form.append('meeting_date', this.formData.appointment_date);
    form.append('note', this.formData.note || '');
    form.append('email', this.userEmail || '');
    form.append('total_amount', this.calculateTotal().toString());

    // Thêm thông tin đại diện
    form.append('representative_name', this.formData.representative_name);
    form.append('representative_email', this.formData.representative_email);
    form.append('representative_phone', this.formData.representative_phone);

    // Logo và sản phẩm như trước

    // ✅ Nếu chưa có logo file, fallback theo thứ tự ưu tiên:
    // 1. logoPreview (URL lấy từ NCC có sẵn)
    // 2. logo_url từ sản phẩm đầu tiên
    if (!this.formData.logo) {
      if (this.formData.logoPreview && typeof this.formData.logoPreview === 'string' && !this.formData.logoPreview.startsWith('data:')) {
        // logoPreview là URL thật (không phải base64 preview)
        this.formData.logo = this.formData.logoPreview;
      } else if (this.formData.products.length > 0) {
        const firstLogo = this.formData.products[0].logo_url || '';
        if (firstLogo) {
          this.formData.logo = firstLogo;
        }
      }
    }

    if (this.formData.logo instanceof File) {
      form.append('logo', this.formData.logo);
    } else if (typeof this.formData.logo === 'string' && this.formData.logo !== '') {
      form.append('logo_url', this.formData.logo);
    }



    this.formData.products.forEach((p: any, index: number) => {
      if (p.imageFile) {
        form.append(`product_image_${index}`, p.imageFile);
      }
    });
    form.append('products', JSON.stringify(this.formData.products));

    this.http.post(`${environment.apiUrl}/phieu-nhap`, form).subscribe({
      next: (res: any) => {
        this.generatedReceiptCode = res.receipt_code;
        alert(`✅ Gửi phiếu chuyển hàng thành công!\n📄 Mã phiếu: ${res.receipt_code}`);
        this.guiHangService.clearFormData();
        this.guiHangService.clearProducts();
        window.location.reload();
      },
      error: (err) => {
        console.error(err);
        alert('❌ Gửi phiếu thất bại.');
      }
    });
  }


  // Khi người dùng thay đổi số lượng hoặc kg/sp, cập nhật lại trọng lượng và diện tích
  updateWeightAndArea(index: number): void {
    const item = this.formData.products[index];
    const quantity = Number(item.quantity) || 0;
    const kgPerUnit = Number(item.kg_per_unit) || 0;

    item.weight = +(quantity * kgPerUnit).toFixed(2);
    item.area = +(item.weight / 500 * 5).toFixed(2); // Mới: 500kg = 5m²
  }

  autoSave() {
    this.guiHangService.saveFormData(this.formData);
    this.guiHangService.setProducts(this.formData.products);
  }

  onFieldChange() {
    this.autoSave();
  }

  themSanPhamCoSan() {
    const code = this.maSanPhamCanThem.trim();
    if (!code) {
      alert("❌ Vui lòng nhập mã sản phẩm cần thêm.");
      return;
    }

    const isDuplicate = this.formData.products.some((p: any) => p.product_code === code);
    if (isDuplicate) {
      alert("⚠️ Mã sản phẩm đã tồn tại trong danh sách.");
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/products-detail/by-code/${code}`).subscribe({
      next: (product) => {
        if (!product || !product.product_code) {
          alert("❌ Không tìm thấy sản phẩm có mã: " + code);
          return;
        }

        const newSupplier = product.supplier_name?.trim() || '';
        const currentSupplier = this.formData.supplier_name?.trim() || '';

        if (this.formData.products.length > 0 && currentSupplier && newSupplier && newSupplier !== currentSupplier) {
          alert(`❌ Nhà cung cấp của sản phẩm (${newSupplier}) không khớp với phiếu hiện tại (${currentSupplier}).`);
          return;
        }

        const newItem = {
          product_code: product.product_code,
          product_name: product.product_name,
          product_type: product.product_type,
          unit: product.unit,
          manufacture_date: product.manufacture_date?.substring(0, 10) || '',
          expiry_date: product.expiry_date?.substring(0, 10) || '',
          quantity: 0,
          unit_price: product.unit_price || 0,
          kg_per_unit: product.weight_per_unit || 0,
          weight: 0,
          area: 0,
          imageFile: null,
          preview: product.image_url || '',
          image_url: product.image_url || '',
          readonly: true,
          supplier_name: product.supplier_name || '',
          logo_url: product.logo_url || '',
          location: product.location || ''
        };

        this.formData.products.push(newItem);

        // Populate supplier info if not set
        if (!currentSupplier && newSupplier) {
          this.formData.supplier_name = newSupplier;
          this.formData.logoPreview = product.logo_url || '';
          this.formData.supplier_address = product.supplier_address || '';
          this.formData.representative_name = product.representative_name || '';
          this.formData.representative_email = product.representative_email || '';
          this.formData.representative_phone = product.representative_phone || '';
        }

        this.onFieldChange();
        this.maSanPhamCanThem = '';
      },
      error: (err) => {
        console.error(err);
        alert("❌ Không tìm thấy sản phẩm hoặc xảy ra lỗi khi truy vấn.");
      }
    });
  }


  resetForm() {
    if (confirm('⚠️ Bạn có chắc chắn muốn tạo lại? Toàn bộ dữ liệu sẽ bị mất.')) {
      // Xóa dữ liệu form
      this.formData = {
        created_date: this.today,
        supplier_name: '',
        supplier_address: '',
        logo: null,
        logoPreview: '',
        representative_name: '',
        representative_email: '',
        representative_phone: '',
        appointment_date: '',
        note: '',
        products: []
      };

      this.generatedReceiptCode = '';
      this.maSanPhamCanThem = '';

      // Tạo 1 khung nhập mới mặc định
      this.addProduct();

      // Xóa dữ liệu lưu tạm (localStorage nếu có)
      this.guiHangService.clearFormData();
      this.guiHangService.clearProducts();
    }
  }


  // Khi người dùng nhập tổng khối lượng (weight), tính ngược lại kg/sp
  updateKgPerUnit(index: number): void {
    const item = this.formData.products[index];
    const quantity = Number(item.quantity) || 0;
    const weight = Number(item.weight) || 0;

    if (quantity > 0) {
      item.kg_per_unit = +(weight / quantity).toFixed(2);
      item.area = +(weight / 500 * 5).toFixed(2); // Mới: 500kg = 5m²
    }
  }


}
