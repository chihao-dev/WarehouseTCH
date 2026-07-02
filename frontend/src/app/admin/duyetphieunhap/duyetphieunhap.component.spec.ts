import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuyetphieunhapComponent } from './duyetphieunhap.component';

describe('DuyetphieunhapComponent', () => {
  let component: DuyetphieunhapComponent;
  let fixture: ComponentFixture<DuyetphieunhapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuyetphieunhapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuyetphieunhapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
