import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThongtinkhoComponent } from './thongtinkho.component';

describe('ThongtinkhoComponent', () => {
  let component: ThongtinkhoComponent;
  let fixture: ComponentFixture<ThongtinkhoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThongtinkhoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThongtinkhoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
