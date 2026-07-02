import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MuahangComponent } from './muahang.component';

describe('MuahangComponent', () => {
  let component: MuahangComponent;
  let fixture: ComponentFixture<MuahangComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MuahangComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MuahangComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
