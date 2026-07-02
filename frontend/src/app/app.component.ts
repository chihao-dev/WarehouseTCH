import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common'; // ✅ THÊM DÒNG NÀY

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,           // ✅ THÊM VÀO ĐÂY
    RouterOutlet,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showNavbar = true;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const currentUrl = (event as NavigationEnd).urlAfterRedirects;
        console.log('URL hiện tại:', currentUrl);

        // Ẩn navbar nếu URL bắt đầu bằng /admin hoặc /staff
        this.showNavbar = !(
          currentUrl.startsWith('/admin') || currentUrl.startsWith('/staff')
        );
      });
  }
}
