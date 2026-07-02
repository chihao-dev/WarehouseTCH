import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { UserRole } from '../models/user-role.enum';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  getCurrentUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
        return null;
    }
    const role = sessionStorage.getItem('role') as UserRole;
    if (Object.values(UserRole).includes(role)) {
      return role;
    }
    return null;
  }

  redirectToDashboardByRole(role: string | null): void {
    if (!isPlatformBrowser(this.platformId)) {
        return;
    }
    switch (role) {
      case UserRole.ADMIN:
        this.router.navigate(['/admin/dashboard'], { replaceUrl: true }).then(() => {
          // Keep existing reload behavior to ensure app state refreshes on login
          window.location.reload();
        });
        break;
      case UserRole.STAFF:
        this.router.navigate(['/staff/thongtin'], { replaceUrl: true }).then(() => {
          window.location.reload();
        });
        break;
      case UserRole.USER:
        this.router.navigate(['/home']).then(() => {
          window.location.reload();
        });
        break;
      default:
        this.router.navigate(['/dangnhap']);
    }
  }
}
