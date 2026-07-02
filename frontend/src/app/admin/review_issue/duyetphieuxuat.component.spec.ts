import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuyetphieuxuatComponent } from './duyetphieuxuat.component';

describe('DuyetphieuxuatComponent', () => {
  let component: DuyetphieuxuatComponent;
  let fixture: ComponentFixture<DuyetphieuxuatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuyetphieuxuatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuyetphieuxuatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
