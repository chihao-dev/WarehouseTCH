import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PhieuMuaService } from '../../services/phieu-mua.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-muahang',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './muahang.component.html',
  styleUrls: ['./muahang.component.css']
})
export class MuahangComponent {
  formData: any = {
    created_date: '',
    receiver_name: '',
    receiver_address: '',
    logo: null,
    logoPreview: '',
    representative_email: '',
    representative_phone: '',
    representative_name: '',
    delivery_date: '', // đổi từ appointment_date
    note: '',
    products: []
  };

  generatedReceiptCode: string = '';
  userId = sessionStorage.getItem('id');
  userEmail = sessionStorage.getItem('email');
  userInfo: any = {};
  today = new Date().toISOString().substring(0, 10);

   maSanPhamCanThem: string = '';

  constructor(
    private http: HttpClient,
    private phieuMuaService: PhieuMuaService,
    private router: Router
  ) {}

  ngOnInit() {
    const saved = this.phieuMuaService.getFormData();
    if (saved) {
      this.formData = saved;
    } else {
      this.formData.created_date = this.today;
      this.formData.products = this.phieuMuaService.getProducts();
      this.formData.appointment_date = this.today;
    }

    this.phieuMuaService.products$.subscribe(data => {
      this.formData.products = data;
    });

    this.http.get<any>(`${environment.apiUrl}/user-info/${this.userId}`).subscribe({
      next: (res) => this.userInfo = res || {},
      error: () => alert('❌ Không thể lấy thông tin người dùng.')
    });
  }

  addProduct() {
    this.formData.products.push({
      product_name: '',
      product_type: '',
      product_code: '',
      unit: '',
      weight: 0,
      weight_per_unit: 0,
      original_quantity: 0, // 🆕 Số lượng gốc
      manufacture_date: '',
      expiry_date: '',
      quantity: 0,
      unit_price: 0,
      imageFile: null,
      preview: ''
    });

    this.saveForm();
  }

  removeProduct(index: number) {
    this.formData.products.splice(index, 1);
    this.phieuMuaService.setProducts(this.formData.products);
    this.saveForm();
  }

    onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.formData.logoPreview = reader.result as string;
        this.formData.logoFile = file;
      };
      reader.readAsDataURL(file);
    }
  }

  goLogo() {
    this.formData.logoPreview = null;
    this.formData.logoFile = null;

    // Xóa file input nếu muốn reset hoàn toàn:
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }


  onProductImageChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.formData.products[index].preview = reader.result;
        this.formData.products[index].imageFile = file;
        this.saveForm();
      };
      reader.readAsDataURL(file);
    }
  }

  onQuantityChange(index: number): void {
    const item = this.formData.products[index];

    if (item.quantity > item.original_quantity) {
      alert(`⚠️ Số lượng mua không được lớn hơn tồn kho (${item.original_quantity}).`);
      item.quantity = item.original_quantity;
    }

    if (item.quantity && item.weight_per_unit) {
      item.weight = item.quantity * item.weight_per_unit;
    }

    this.phieuMuaService.setProducts(this.formData.products);
    this.saveForm();
  }


  onFormChange(): void {
    this.saveForm();
  }

  saveForm(): void {
    this.phieuMuaService.saveFormData(this.formData);
  }

  calculateTotal() {
    return this.formData.products.reduce((sum: number, p: any) => {
      return sum + (p.quantity * p.unit_price);
    }, 0);
  }

  calculateTotalWeight(): number {
    return this.formData.products.reduce((total: number, item: any) => {
      return total + (item.weight || 0);
    }, 0);
  }

  submitForm() {
    // --- Kiểm tra thông tin chung ---
    if (!this.userInfo.full_name || !this.userInfo.phone || !this.userInfo.date_of_birth) {
      alert('❌ Vui lòng cập nhật thông tin cá nhân trước khi đăng ký mua hàng.');
      return;
    }

    if (!this.formData.receiver_name || !this.formData.receiver_address) {
      alert("❌ Vui lòng nhập đầy đủ thông tin nhà cung cấp.");
      return;
    }

    if (!this.formData.products || this.formData.products.length === 0) {
      alert("❌ Vui lòng thêm ít nhất 1 sản phẩm.");
      return;
    }

    // --- Kiểm tra sản phẩm ---
    for (let i = 0; i < this.formData.products.length; i++) {
      const p = this.formData.products[i];

      if (!p.product_name || !p.product_code || !p.unit || !p.quantity || !p.unit_price) {
        alert(`❌ Vui lòng nhập đầy đủ thông tin cho sản phẩm số ${i + 1}.`);
        return;
      }

      if (p.quantity <= 0 || p.unit_price <= 0) {
        alert(`❌ Số lượng và đơn giá phải > 0 (sản phẩm số ${i + 1}).`);
        return;
      }

      if (p.quantity > p.stock_quantity) {
        alert(`❌ Số lượng xuất (${p.quantity}) vượt quá tồn kho (${p.stock_quantity}) của sản phẩm ${i + 1}.`);
        return;
      }
    }

    // --- Kiểm tra ngày xuất ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDate = new Date(this.formData.appointment_date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      alert("❌ Ngày xuất kho không được nhỏ hơn ngày hôm nay.");
      return;
    }

    // --- Chuẩn bị FormData ---
    const form = new FormData();

    form.append('created_date', this.formData.created_date);
    form.append('receiver_name', this.formData.receiver_name);
    form.append('receiver_address', this.formData.receiver_address);

    form.append('representative_name', this.formData.representative_name);
    form.append('representative_email', this.formData.representative_email);
    form.append('representative_phone', this.formData.representative_phone);

    form.append('staff_account_name', this.userInfo.full_name || '');
    form.append('staff_account_email', this.userEmail || '');

    form.append('delivery_date', this.formData.appointment_date);
    form.append('user_id', this.userId || '');
    form.append('note', this.formData.note || '');
    form.append('total_amount', this.calculateTotal().toString());
    form.append('total_weight', this.calculateTotalWeight().toString());

    if (this.formData.logo) {
      form.append('logo', this.formData.logo);
    }

    this.formData.products.forEach((p: any, i: number) => {
      if (p.imageFile) {
        form.append(`product_image_${i}`, p.imageFile);
      }
    });

    form.append('products', JSON.stringify(this.formData.products));

    // --- Gửi API ---
    this.http.post<any>(`${environment.apiUrl}/phieu-xuat`, form).subscribe({
      next: (res) => {
        this.generatedReceiptCode = res.receipt_code;
        alert(`✅ Gửi phiếu xuất thành công!\n📄 Mã phiếu: ${res.receipt_code}`);

        // Reset dữ liệu
        this.phieuMuaService.clearProducts();
        this.phieuMuaService.clearFormData();

        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.reload();
      },
      error: (err) => {
        console.error(err);
        alert("❌ Gửi thất bại.");
      }
    });
  }


  goToSanPhamCuakho() {
    this.router.navigate(['/products']);
  }

  resetForm() {
    if (confirm('⚠️ Bạn có chắc chắn muốn tạo lại? Toàn bộ dữ liệu sẽ bị mất.')) {
      // Reset dữ liệu form về mặc định
      this.formData = {
        created_date: this.today,
        receiver_name: '',
        logo: null,
        logoPreview: '',
        receiver_address: '',
        representative_name: '',
        representative_email: '',
        representative_phone: '',
        delivery_date: '',  // đổi thành delivery_date như bạn đặt
        note: '',
        products: []
      };

      this.generatedReceiptCode = '';
      // Nếu có biến nhập mã sản phẩm thêm sẵn thì reset luôn
      this.maSanPhamCanThem = '';

      // Tạo 1 khung nhập sản phẩm mới (nếu bạn muốn khởi tạo luôn)
      this.addProduct();

      // Xóa dữ liệu lưu tạm trong service nếu có (thay guiHangService bằng tên service bạn dùng)
      if(this.phieuMuaService) {
        this.phieuMuaService.clearFormData();
        this.phieuMuaService.clearProducts();
      }
    }
  }

}
