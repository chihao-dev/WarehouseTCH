import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_FORM_KEY = 'guiHangForm';
const STORAGE_PRODUCTS_KEY = 'guiHangProducts';

@Injectable({ providedIn: 'root' })
export class GuihangService {
  private productList = new BehaviorSubject<any[]>(this.getProductsFromStorage());
  products$ = this.productList.asObservable();

  private getStorageKey(base: string): string {
    const userId = sessionStorage.getItem('id') || 'default';
    return `${base}_${userId}`;
  }

  getFormData(): any {
    const saved = localStorage.getItem(this.getStorageKey(STORAGE_FORM_KEY));
    return saved ? JSON.parse(saved) : null;
  }

  saveFormData(data: any): void {
    localStorage.setItem(this.getStorageKey(STORAGE_FORM_KEY), JSON.stringify(data));
  }

  clearFormData(): void {
    localStorage.removeItem(this.getStorageKey(STORAGE_FORM_KEY));
  }

  private getProductsFromStorage(): any[] {
    const saved = localStorage.getItem(this.getStorageKey(STORAGE_PRODUCTS_KEY));
    return saved ? JSON.parse(saved) : [];
  }

  private saveProductsToStorage(data: any[]): void {
    localStorage.setItem(this.getStorageKey(STORAGE_PRODUCTS_KEY), JSON.stringify(data));
  }

  getProducts(): any[] {
    return this.productList.getValue();
  }

  setProducts(data: any[]): void {
    this.saveProductsToStorage(data);
    this.productList.next(data);
  }

  clearProducts(): void {
    localStorage.removeItem(this.getStorageKey(STORAGE_PRODUCTS_KEY));
    this.productList.next([]);
  }
}
