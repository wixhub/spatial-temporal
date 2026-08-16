import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Timeline } from './timeline';
import { MigrationService } from '../../core/services/migration.service';
import { MigrationDataset } from '../../core/models/telemetry.model';

describe('Timeline', () => {
  let component: Timeline;
  let fixture: ComponentFixture<Timeline>;
  let httpMock: HttpTestingController;

  // Mock dataset to fulfill MigrationService's httpResource requirement during initialization
  const mockDataset: MigrationDataset = {
    datasetId: 'test-dataset',
    title: 'Test Repository',
    description: 'Test telemetry payloads',
    startTime: 1000,
    endTime: 5000,
    tracks: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Timeline],
      providers: [MigrationService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    // Resolve the initial httpResource call triggered by MigrationService
    const req = httpMock.expectOne('data/data.json');
    req.flush(mockDataset);

    fixture = TestBed.createComponent(Timeline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Test component creation
  it('should create the timeline component successfully', () => {
    expect(component).toBeTruthy();
  });

  // Test formatting unix timestamp into UTC string format
  it('should format timestamp correctly to UTC string', () => {
    const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
    const formatted = (component as any).formatDate(timestamp);
    expect(formatted).toContain('2024');
    expect(formatted).toContain('UTC');
    expect((component as any).formatDate(0)).toBe('');
  });

  // Test progress calculation logic based on current timeline state
  it('should calculate progress percentage accurately', () => {
    const service = TestBed.inject(MigrationService);

    // Set time right in the middle (startTime = 1000, endTime = 5000, currentTime = 3000)
    service.seek(3000);
    expect((component as any).calculateProgress()).toBe(50);

    // Set time to start boundary
    service.seek(1000);
    expect((component as any).calculateProgress()).toBe(0);

    // Set time to end boundary
    service.seek(5000);
    expect((component as any).calculateProgress()).toBe(100);
  });

  // Test handle seek input events from range slider target elements
  it('should handle seek input events and update service time', () => {
    const service = TestBed.inject(MigrationService);
    const mockEvent = {
      target: { value: '2500' },
    } as unknown as Event;

    (component as any).onSeekInput(mockEvent);
    expect(service.currentTime()).toBe(2500);
  });
});
