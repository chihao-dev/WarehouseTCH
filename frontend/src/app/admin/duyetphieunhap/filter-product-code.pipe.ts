import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true, // BẮT BUỘC nếu dùng với standalone component
  name: 'filterProductCode'
})
export class FilterProductCodePipe implements PipeTransform {
  transform(items: any[], code: string): any[] {
    if (!code) return items;
    return items.filter(item =>
      item.product_code?.toLowerCase().includes(code.toLowerCase())
    );
  }
}
