import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from './modal.component';

class MockNgbActiveModal {
  close(result?: any) {}
  dismiss(reason?: any) {}
}

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let activeModal: NgbActiveModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
      providers: [{ provide: NgbActiveModal, useClass: MockNgbActiveModal }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    activeModal = TestBed.inject(NgbActiveModal);

    component.title = 'Test Title';
    component.message = 'Test message';

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title and message', () => {
    const titleEl = fixture.debugElement.query(By.css('.modal-title'));
    const messageEl = fixture.debugElement.query(By.css('.modal-body p'));

    expect(titleEl.nativeElement.textContent).toContain('Test Title');
    expect(messageEl.nativeElement.innerHTML).toBe('Test message');
  });

  it('should show action buttons by default', () => {
    const footerEl = fixture.debugElement.query(By.css('.modal-footer'));
    expect(footerEl).not.toBeNull();
  });

  it('should hide action buttons when showActions is false', () => {
    component.showActions = false;
    fixture.detectChanges();
    const footerEl = fixture.debugElement.query(By.css('.modal-footer'));
    expect(footerEl).toBeNull();
  });

  it('should display default button texts', () => {
    const buttons = fixture.debugElement.queryAll(
      By.css('.modal-footer button')
    );
    expect(buttons[0].nativeElement.textContent.trim()).toBe('Cancel');
    expect(buttons[1].nativeElement.textContent).toContain('Confirm');
  });

  it('should display custom button texts', () => {
    component.cancelText = 'Go Back';
    component.confirmText = 'Proceed';
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modal-footer button')
    );
    expect(buttons[0].nativeElement.textContent.trim()).toBe('Go Back');
    expect(buttons[1].nativeElement.textContent).toContain('Proceed');
  });

  it('should call activeModal.dismiss when cancel button is clicked', () => {
    spyOn(activeModal, 'dismiss');
    const cancelButton = fixture.debugElement.query(
      By.css('.modal-footer .btn-secondary')
    );
    cancelButton.triggerEventHandler('click', null);
    expect(activeModal.dismiss).toHaveBeenCalledWith('cancel click');
  });

  it('should call activeModal.dismiss when close icon is clicked', () => {
    spyOn(activeModal, 'dismiss');
    const closeButton = fixture.debugElement.query(
      By.css('.modal-header .btn-close')
    );
    closeButton.triggerEventHandler('click', null);
    expect(activeModal.dismiss).toHaveBeenCalledWith('Cross click');
  });

  it('should call activeModal.close when confirm button is clicked', () => {
    spyOn(activeModal, 'close');
    const confirmButton = fixture.debugElement.query(
      By.css('.modal-footer .btn-primary, .modal-footer .btn-danger')
    );
    confirmButton.triggerEventHandler('click', null);
    expect(activeModal.close).toHaveBeenCalledWith('confirm click');
  });

  it('should show spinner and disable confirm button when confirmLoading is true', () => {
    component.confirmLoading = true;
    fixture.detectChanges();

    const confirmButton = fixture.debugElement.query(
      By.css('.modal-footer .btn-primary')
    ).nativeElement as HTMLButtonElement;
    const spinner = confirmButton.querySelector('.spinner-border');

    expect(confirmButton.disabled).toBe(true);
    expect(spinner).not.toBeNull();
    expect(confirmButton.textContent).toContain('Processing...');
  });

  it('should apply danger styles when danger is true', () => {
    component.danger = true;
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('.modal-header'));
    const icon = fixture.debugElement.query(By.css('.modal-title i'));
    const closeButton = fixture.debugElement.query(By.css('.btn-close'));
    const confirmButton = fixture.debugElement.query(
      By.css('.modal-footer .btn-danger')
    );

    expect(header.classes['bg-danger']).toBe(true);
    expect(header.classes['text-white']).toBe(true);
    expect(icon.classes['bi-exclamation-triangle-fill']).toBe(true);
    expect(closeButton.classes['btn-close-white']).toBe(true);
    expect(confirmButton).not.toBeNull();
  });
});
