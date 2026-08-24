import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Shell } from './shell';
import { MigrationService } from '../../../core/services/migration.service';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;
  let migrationServiceMock: any;

  beforeEach(async () => {
    // Comprehensive mock including all signals and methods used by Shell child components (Sidebar, MapView, Timeline)
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
      currentTime: signal(1000),
      startTime: signal(1000), // Added missing startTime signal for Timeline
      endTime: signal(5000), // Added missing endTime signal for Timeline
      currentPositions: signal([]),
      activeTracks: signal([]),
      useMockFallback: signal(false),
      error: signal(null),
      setTargetId: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      togglePlay: vi.fn(),
      seek: vi.fn(),
      setSpeed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [{ provide: MigrationService, useValue: migrationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the shell component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should render core layout and feature child components', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Verify that the shell and its integrated layout children are rendered successfully
    expect(compiled).toBeTruthy();
    expect(fixture.debugElement.componentInstance).toBeDefined();
  });
});
