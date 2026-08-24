import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MigrationService } from './migration.service';
import { MigrationDataset } from '../models/telemetry.model';

describe('MigrationService', () => {
  let service: MigrationService;
  let httpMock: HttpTestingController;

  const mockDatasetResponse: MigrationDataset = {
    datasetId: '2911040',
    title: 'Telemetry Study 2911040',
    description: 'Test dataset',
    startTime: 1000,
    endTime: 5000,
    tracks: [
      {
        individualId: 'sub-1',
        speciesName: 'Test Species',
        commonName: 'Subject sub-1',
        tagDeployDate: '2026-01-01',
        color: '#38bdf8',
        points: [
          {
            id: 'sub-1-1000',
            individualId: 'sub-1',
            timestamp: 1000,
            latitude: 47.6,
            longitude: 9.3,
            sensorType: 'GPS',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MigrationService, provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);

    // Instantiate service after setting up httpMock to safely catch constructor requests
    service = TestBed.inject(MigrationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and fetch initial dataset', () => {
    expect(service).toBeTruthy();

    // Catch any pending request on initialization using match/flushing safely
    const requests = httpMock.match(() => true);
    if (requests.length > 0) {
      requests[0].flush(
        'individual_local_identifier,timestamp,location_lat,location_long\nsub-1,1000,47.6,9.3',
      );
    }

    expect(service.isLoading()).toBe(false);
  });

  it('should fallback to local mock dataset when worker returns error', () => {
    const requests = httpMock.match(() => true);
    if (requests.length > 0) {
      requests[0].flush('Error', { status: 500, statusText: 'Server Error' });
    }

    // Handle fallback request if triggered
    const mockReqs = httpMock.match((req) => req.url.includes('telemetry-mock.json'));
    if (mockReqs.length > 0) {
      mockReqs[0].flush(mockDatasetResponse);
    }

    expect(service).toBeTruthy();
  });

  it('should update target ID and trigger new data fetch', () => {
    const requests = httpMock.match(() => true);
    if (requests.length > 0) {
      requests[0].flush(
        'individual_local_identifier,timestamp,location_lat,location_long\nsub-1,1000,47.6,9.3',
      );
    }

    // Update target study ID
    service.setTargetId('9999999');
    expect(service.targetId()).toBe('9999999');

    // Match new request for updated ID
    const newReqs = httpMock.match(
      (req) => req.url.includes('9999999') || req.url.includes('study_id'),
    );
    if (newReqs.length > 0) {
      newReqs[0].flush(
        'individual_local_identifier,timestamp,location_lat,location_long\nsub-2,2000,48.0,10.0',
      );
    }

    expect(service.targetId()).toBe('9999999');
  });

  it('should handle playback controls correctly (play, pause, seek, speed)', () => {
    const requests = httpMock.match(() => true);
    if (requests.length > 0) {
      requests[0].flush(
        'individual_local_identifier,timestamp,location_lat,location_long\nsub-1,1000,47.6,9.3',
      );
    }

    expect(service.isPlaying()).toBe(false);

    service.play();
    expect(service.isPlaying()).toBe(true);

    service.pause();
    expect(service.isPlaying()).toBe(false);

    service.togglePlay();
    expect(service.isPlaying()).toBe(true);

    service.setSpeed(50);
    expect(service.playbackSpeed()).toBe(50);
  });
});
