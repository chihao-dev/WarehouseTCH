import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DichvuComponent } from './dichvu.component';

describe('DichvuComponent', () => {
  let component: DichvuComponent;
  let fixture: ComponentFixture<DichvuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DichvuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DichvuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
