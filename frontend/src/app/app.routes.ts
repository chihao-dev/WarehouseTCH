import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ProfileGuard } from './guards/profile.guard';
import { UserOnlyGuard } from './guards/user-only.guard';
import { AdminGuard } from './guards/admin.guard';


// Layouts
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { StaffLayoutComponent } from './layout/staff-layout/staff-layout.component';

// User Pages
import { HomeComponent } from './pages/home/home.component';
import { ThongtinkhoComponent } from './pages/introduce/thongtinkho.component';
import { GuihangComponent } from './pages/goods_receipt/guihang.component';
import { MuahangComponent } from './pages/goods_issue/muahang.component';
import { DichvuComponent } from './pages/service/dichvu.component';
import { HoadonComponent } from './pages/invoice/hoadon.component';
import { DangnhapComponent } from './pages/login/dangnhap.component';
import { TrangcanhanComponent } from './pages/profile/trangcanhan.component';
import { SanphamcuakhoComponent } from './pages/products/sanphamcuakho.component';
import { KiemkehanghoaComponent } from './pages/inventory/kiemkehanghoa.component';

// Admin Pages
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AccountManagerComponent } from './admin/account_manager/account-manager.component';
import { DuyetphieunhapComponent } from './admin/review_receipt/duyetphieunhap.component';
import { DuyetphieuxuatComponent } from './admin/review_issue/duyetphieuxuat.component';
import { QuanlysanphamComponent } from './admin/products_manager/quanlysanpham.component';
import { InvoiceManagerComponent } from './admin/invoice_manager/invoice-manager.component';
import { LocationManagerComponent } from './admin/location_manager/location-manager.component';
import { QuanlyhangtonComponent } from './admin/inventory_manager/quanlyhangton.component';
import { QuanlynccComponent } from './admin/supplier_manager/quanlyncc.component';
import { LichsukiemkeComponent } from './admin/inventory_history/lichsukiemke.component';

export const routes: Routes = [
  // User nhưng fake thành staff
  { path: '', component: HomeComponent, canActivate: [UserOnlyGuard] },
  { path: 'home', component: HomeComponent },
  { path: 'introduce', component: ThongtinkhoComponent },
  { path: 'goods_receipt', component: GuihangComponent, canActivate: [AuthGuard] },
  { path: 'goods_issue', component: MuahangComponent, canActivate: [AuthGuard] },
  { path: 'service', component: DichvuComponent },
  { path: 'invoice', component: HoadonComponent, canActivate: [AuthGuard] },
  { path: 'login', component: DangnhapComponent },
  { path: 'profile', component: TrangcanhanComponent, canActivate: [AuthGuard] },
  { path: 'products', component: SanphamcuakhoComponent, canActivate: [AuthGuard] },
  { path: 'inventory', component: KiemkehanghoaComponent, canActivate: [AuthGuard] },
  // Layout Admin
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'account_manager', component: AccountManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'review_receipt', component: DuyetphieunhapComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'review_issue', component: DuyetphieuxuatComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'products_manager', component: QuanlysanphamComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'invoice_manager', component: InvoiceManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'location_manager', component: LocationManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'inventory_manager', component: QuanlyhangtonComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'supplier_manager', component: QuanlynccComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'inventory_history', component: LichsukiemkeComponent, canActivate: [AuthGuard, ProfileGuard] },
      // thêm các route admin khác
    ]
  },

  { path: '**', redirectTo: '' }
];
