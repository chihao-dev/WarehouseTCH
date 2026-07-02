import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuanlynccComponent } from './quanlyncc.component';

describe('QuanlynccComponent', () => {
  let component: QuanlynccComponent;
  let fixture: ComponentFixture<QuanlynccComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuanlynccComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuanlynccComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
