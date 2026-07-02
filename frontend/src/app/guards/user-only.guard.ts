import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class UserOnlyGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const role = sessionStorage.getItem('role');
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      return false;
    }
    return true;
  }
}
