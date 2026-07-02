import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaophieunhapComponent } from './taophieunhap.component';

describe('TaophieunhapComponent', () => {
  let component: TaophieunhapComponent;
  let fixture: ComponentFixture<TaophieunhapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaophieunhapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaophieunhapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
