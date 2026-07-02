import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KiemkehanghoaComponent } from './kiemkehanghoa.component';

describe('KiemkehanghoaComponent', () => {
  let component: KiemkehanghoaComponent;
  let fixture: ComponentFixture<KiemkehanghoaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KiemkehanghoaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KiemkehanghoaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
