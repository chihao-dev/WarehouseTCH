import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-role.enum';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const currentRole = this.authService.getCurrentUserRole();
    const isAdmin = currentRole === UserRole.ADMIN;

    if (!isAdmin) {
      console.warn('[AdminGuard] Truy cập bị từ chối. Role hiện tại:', currentRole);
      this.router.navigate(['/dangnhap']);
    }

    return isAdmin;
  }
}
