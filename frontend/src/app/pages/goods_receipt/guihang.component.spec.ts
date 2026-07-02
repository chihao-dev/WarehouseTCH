import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuihangComponent } from './guihang.component';

describe('GuihangComponent', () => {
  let component: GuihangComponent;
  let fixture: ComponentFixture<GuihangComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuihangComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuihangComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
