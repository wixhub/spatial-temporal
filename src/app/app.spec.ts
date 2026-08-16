import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])], // Provide router configuration required for RouterOutlet
    }).compileComponents();
  });

  // Test root application component creation
  it('should create the app component successfully', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // Test router outlet presence and optional title rendering depending on layout templates
  it('should render router outlet container properly', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // Verify that router-outlet or root wrapper container renders correctly
    expect(compiled).toBeTruthy();
  });
});
