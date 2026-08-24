import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Timeline } from './timeline';
import { MigrationService } from '../../core/services/migration.service';

describe('Timeline', () => {
  let component: Timeline;
  let fixture: ComponentFixture<Timeline>;
  let migrationServiceMock: any;

  beforeEach(async () => {
    migrationServiceMock = {
      startTime: signal(1000),
      endTime: signal(5000),
      currentTime: signal(3000),
      isPlaying: signal(false),
      playbackSpeed: signal(10),
      togglePlay: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      setSpeed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Timeline],
      providers: [{ provide: MigrationService, useValue: migrationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Timeline);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component['speeds']).toEqual([1, 5, 10, 50, 100]);
  });

  it('should format timestamp correctly to UTC string', () => {
    // 0 -> empty string
    expect(component['formatDate'](0)).toBe('');

    // Valid non-zero timestamp (e.g. 1710000000000)
    const formatted = component['formatDate'](1710000000000);
    expect(formatted).toContain('UTC');
  });

  it('should calculate progress percentage accurately', () => {
    // Current time 3000, start 1000, end 5000 -> (3000-1000)/(5000-1000) = 2000/4000 = 50%
    const progress = component['calculateProgress']();
    expect(progress).toBe(50);
  });

  it('should handle seek input event and call service seek', () => {
    const mockEvent = {
      target: { value: '2500' },
    } as unknown as Event;

    component['onSeekInput'](mockEvent);
    expect(migrationServiceMock.seek).toHaveBeenCalledWith(2500);
  });

  it('should safely return 0 progress if end <= start', () => {
    migrationServiceMock.startTime.set(5000);
    migrationServiceMock.endTime.set(1000);

    const progress = component['calculateProgress']();
    expect(progress).toBe(0);
  });
});
