import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingComponent } from './loading.component';
import { By } from '@angular/platform-browser';

describe('LoadingComponent', () => {
  let component: LoadingComponent;
  let fixture: ComponentFixture<LoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default text "Loading..."', () => {
    const textElement = fixture.debugElement.query(By.css('.mt-2.text-muted'));
    expect(textElement.nativeElement.textContent.trim()).toBe('Loading...');
  });

  it('should display custom text when provided', () => {
    component.text = 'Please wait...';
    fixture.detectChanges();
    const textElement = fixture.debugElement.query(By.css('.mt-2.text-muted'));
    expect(textElement.nativeElement.textContent.trim()).toBe('Please wait...');
  });

  it('should not display text if text input is empty', () => {
    component.text = '';
    fixture.detectChanges();
    const textElement = fixture.debugElement.query(By.css('.mt-2.text-muted'));
    expect(textElement).toBeFalsy();
  });

  it('should have "md" size by default', () => {
    const spinner = fixture.debugElement.query(By.css('.spinner-border'));
    expect(spinner.classes['spinner-border-sm']).toBeFalsy();
  });

  it('should apply small size class for size "sm"', () => {
    component.size = 'sm';
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('.spinner-border'));
    expect(spinner.classes['spinner-border-sm']).toBe(true);
  });

  it('should not be fullscreen by default', () => {
    const mainDiv = fixture.debugElement.query(By.css('div'));
    expect(mainDiv.classes['position-fixed']).toBeFalsy();
  });

  it('should apply fullscreen classes when fullscreen is true', () => {
    component.fullscreen = true;
    fixture.detectChanges();
    const mainDiv = fixture.debugElement.query(By.css('div'));
    expect(mainDiv.classes['position-fixed']).toBe(true);
    expect(mainDiv.classes['top-0']).toBe(true);
    expect(mainDiv.classes['start-0']).toBe(true);
    expect(mainDiv.classes['w-100']).toBe(true);
    expect(mainDiv.classes['h-100']).toBe(true);
  });
});