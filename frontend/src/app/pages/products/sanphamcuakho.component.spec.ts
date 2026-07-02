import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SanphamcuakhoComponent } from './sanphamcuakho.component';

describe('SanphamcuakhoComponent', () => {
  let component: SanphamcuakhoComponent;
  let fixture: ComponentFixture<SanphamcuakhoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanphamcuakhoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SanphamcuakhoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
