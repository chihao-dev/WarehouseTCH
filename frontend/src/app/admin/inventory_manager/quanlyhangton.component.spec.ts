import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuanlyhangtonComponent } from './quanlyhangton.component';

describe('QuanlyhangtonComponent', () => {
  let component: QuanlyhangtonComponent;
  let fixture: ComponentFixture<QuanlyhangtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuanlyhangtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuanlyhangtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
