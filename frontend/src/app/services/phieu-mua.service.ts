import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Các khóa cơ bản (chưa gắn userId)
const STORAGE_FORM_KEY = 'phieuMuaForm';
const STORAGE_PRODUCTS_KEY = 'phieuMuaProducts';

@Injectable({
  providedIn: 'root'
})
export class PhieuMuaService {
  // === Quản lý danh sách sản phẩm qua BehaviorSubject ===
  private productList = new BehaviorSubject<any[]>(this.getProductsFromStorage());
  products$ = this.productList.asObservable();

  constructor() {}

  // =============================
  // 🧩 HỖ TRỢ: Lấy key theo userId
  // =============================
  private getStorageKey(baseKey: string): string {
    const userId = sessionStorage.getItem('id') || 'default';
    return `${baseKey}_${userId}`;
  }

  // =============================
  // 🟩 QUẢN LÝ FORM DATA CHUNG
  // =============================

  // 🟢 Lấy toàn bộ formData từ localStorage theo userId
  getFormData(): any {
    const saved = localStorage.getItem(this.getStorageKey(STORAGE_FORM_KEY));
    return saved ? JSON.parse(saved) : null;
  }

  // 🟢 Lưu formData theo userId
  saveFormData(formData: any): void {
    localStorage.setItem(this.getStorageKey(STORAGE_FORM_KEY), JSON.stringify(formData));
  }

  // 🟢 Xoá formData theo userId
  clearFormData(): void {
    localStorage.removeItem(this.getStorageKey(STORAGE_FORM_KEY));
  }

  // =============================
  // 🟦 QUẢN LÝ DANH SÁCH SẢN PHẨM
  // =============================

  // 🔵 Lấy danh sách sản phẩm theo userId
  private getProductsFromStorage(): any[] {
    const saved = localStorage.getItem(this.getStorageKey(STORAGE_PRODUCTS_KEY));
    return saved ? JSON.parse(saved) : [];
  }

  // 🔵 Lưu danh sách sản phẩm theo userId
  private saveProductsToStorage(data: any[]): void {
    localStorage.setItem(this.getStorageKey(STORAGE_PRODUCTS_KEY), JSON.stringify(data));
  }

  // 🔵 Lấy danh sách hiện tại
  getProducts(): any[] {
    return this.productList.getValue();
  }

  // 🔵 Thêm sản phẩm mới nếu chưa tồn tại trong danh sách
  addProduct(product: any): boolean {
    const current = this.getProducts();
    const isExisted = current.some(p => p.product_code === product.product_code);
    if (isExisted) return false;

    const newList = [...current, product];
    this.saveProductsToStorage(newList);
    this.productList.next(newList);
    return true;
  }

  // 🔵 Xoá toàn bộ danh sách sản phẩm của user
  clearProducts(): void {
    localStorage.removeItem(this.getStorageKey(STORAGE_PRODUCTS_KEY));
    this.productList.next([]);
  }

  // 🔵 Cập nhật lại danh sách sản phẩm sau chỉnh sửa
  setProducts(data: any[]): void {
    this.saveProductsToStorage(data);
    this.productList.next(data);
  }
}
