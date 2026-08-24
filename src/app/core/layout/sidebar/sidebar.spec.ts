import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Sidebar } from './sidebar';
import { MigrationService } from '../../../core/services/migration.service';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let migrationServiceMock: any;

  beforeEach(async () => {
    // Complete mock including all signals and methods used in sidebar.html
    migrationServiceMock = {
      selectedStudyId: signal('2911040'),
      targetId: signal('2911040'),
      dataset: signal({
        datasetId: '2911040',
        title: 'Test Dataset',
        description: 'Mock description',
        startTime: 1000,
        endTime: 5000,
        tracks: [],
      }),
      isLoading: signal(false),
      isPlaying: signal(false),
      playbackSpeed: signal(1),
      currentTimestamp: signal(1000),
      useMockFallback: signal(false),
      error: signal(null), // Added missing error signal referenced in sidebar.html:61
      setTargetId: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      togglePlay: vi.fn(),
      seek: vi.fn(),
      setSpeed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [{ provide: MigrationService, useValue: migrationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component successfully', () => {
    expect(component).toBeTruthy();
    expect(component.isCollapsed()).toBe(false);
    expect(component.inputId()).toBe('2911040');
  });

  it('should toggle sidebar collapse state', () => {
    expect(component.isCollapsed()).toBe(false);

    component.toggleSidebar();
    expect(component.isCollapsed()).toBe(true);

    component.toggleSidebar();
    expect(component.isCollapsed()).toBe(false);
  });

  it('should update local inputId state correctly', () => {
    component.updateInputId('123456');
    expect(component.inputId()).toBe('123456');
  });

  it('should submit valid study ID and call migrationService.setTargetId', () => {
    component.updateInputId('  9999999  '); // with spaces to test trimming

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as Event;

    component.onIdSubmit(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(migrationServiceMock.setTargetId).toHaveBeenCalledWith('9999999');
  });

  it('should not call setTargetId if inputId is empty or whitespace', () => {
    component.updateInputId('   ');

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as Event;

    component.onIdSubmit(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(migrationServiceMock.setTargetId).not.toHaveBeenCalled();
  });
});
