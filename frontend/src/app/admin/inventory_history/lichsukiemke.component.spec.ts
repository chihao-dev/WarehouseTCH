import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LichsukiemkeComponent } from './lichsukiemke.component';

describe('LichsukiemkeComponent', () => {
  let component: LichsukiemkeComponent;
  let fixture: ComponentFixture<LichsukiemkeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LichsukiemkeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LichsukiemkeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
