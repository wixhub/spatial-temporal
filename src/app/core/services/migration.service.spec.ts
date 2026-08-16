import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MigrationService } from './migration.service';
import { MigrationDataset } from '../models/telemetry.model';

describe('MigrationService', () => {
  let service: MigrationService;
  let httpMock: HttpTestingController;

  // Mock dataset structured strictly according to the provided interfaces
  const mockDataset: MigrationDataset = {
    datasetId: 'test-dataset',
    title: 'Test Repository',
    description: 'Test telemetry payloads',
    startTime: 1000,
    endTime: 5000,
    tracks: [
      {
        individualId: 'ind-1',
        speciesName: 'Aquila chrysaetos',
        commonName: 'Golden Eagle',
        tagDeployDate: '2025-01-01',
        color: '#ff0000',
        points: [
          {
            id: 'p1',
            individualId: 'ind-1',
            timestamp: 1000,
            latitude: 10,
            longitude: 10,
            sensorType: 'GPS',
          },
          {
            id: 'p2',
            individualId: 'ind-1',
            timestamp: 2000,
            latitude: 20,
            longitude: 20,
            sensorType: 'GPS',
          },
          {
            id: 'p3',
            individualId: 'ind-1',
            timestamp: 3000,
            latitude: 30,
            longitude: 30,
            sensorType: 'GPS',
          },
        ],
      },
      {
        individualId: 'ind-2',
        speciesName: 'Ciconia ciconia',
        commonName: 'White Stork',
        tagDeployDate: '2025-01-01',
        color: '#00ff00',
        points: [
          {
            id: 'p4',
            individualId: 'ind-2',
            timestamp: 1500,
            latitude: 15,
            longitude: 15,
            sensorType: 'Argos Doppler',
          },
          {
            id: 'p5',
            individualId: 'ind-2',
            timestamp: 2500,
            latitude: 25,
            longitude: 25,
            sensorType: 'Argos Doppler',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MigrationService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MigrationService);
    httpMock = TestBed.inject(HttpTestingController);

    // Flush initial httpResource request made on service instantiation
    const req = httpMock.expectOne('data/data.json');
    req.flush(mockDataset);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and load initial dataset via httpResource', () => {
    expect(service).toBeTruthy();
    expect(service.dataset().datasetId).toBe('test-dataset');
    expect(service.startTime()).toBe(1000);
    expect(service.endTime()).toBe(5000);
    expect(service.selectedIndividualIds().size).toBe(2);
    expect(service.currentTime()).toBe(1000);
  });

  it('should handle playback controls correctly (play, pause, togglePlay)', () => {
    expect(service.isPlaying()).toBeFalsy();

    service.play();
    expect(service.isPlaying()).toBeTruthy();

    service.pause();
    expect(service.isPlaying()).toBeFalsy();

    service.togglePlay();
    expect(service.isPlaying()).toBeTruthy();

    service.togglePlay();
    expect(service.isPlaying()).toBeFalsy();
  });

  it('should seek to a specific time within boundaries', () => {
    // Seek within valid bounds
    service.seek(3000);
    expect(service.currentTime()).toBe(3000);

    // Seek below start time (should clamp to start)
    service.seek(500);
    expect(service.currentTime()).toBe(1000);

    // Seek above end time (should clamp to end)
    service.seek(6000);
    expect(service.currentTime()).toBe(5000);
  });

  it('should update playback speed', () => {
    expect(service.playbackSpeed()).toBe(10);
    service.setSpeed(50);
    expect(service.playbackSpeed()).toBe(50);
  });

  it('should toggle individual selection correctly', () => {
    expect(service.selectedIndividualIds().has('ind-1')).toBeTruthy();

    // Deselect ind-1
    service.toggleIndividualSelection('ind-1');
    expect(service.selectedIndividualIds().has('ind-1')).toBeFalsy();
    expect(service.activeTracks().length).toBe(1);

    // Select ind-1 back
    service.toggleIndividualSelection('ind-1');
    expect(service.selectedIndividualIds().has('ind-1')).toBeTruthy();
    expect(service.activeTracks().length).toBe(2);
  });

  it('should calculate active tracks dynamically based on selection', () => {
    expect(service.activeTracks().length).toBe(2);

    service.toggleIndividualSelection('ind-2');
    const active = service.activeTracks();
    expect(active.length).toBe(1);
    expect(active[0].individualId).toBe('ind-1');
  });

  it('should calculate current positions accurately based on currentTime', () => {
    service.seek(2000);

    const positions = service.currentPositions();
    expect(positions.length).toBe(2);

    // Verify track 1 state at timestamp 2000
    const track1Pos = positions.find((p) => p.track.individualId === 'ind-1');
    expect(track1Pos).toBeDefined();
    expect(track1Pos?.currentPoint.timestamp).toBe(2000);
    expect(track1Pos?.trail.length).toBe(2); // Points at 1000 and 2000

    // Verify track 2 state at timestamp 2000 (only point at 1500 should be valid)
    const track2Pos = positions.find((p) => p.track.individualId === 'ind-2');
    expect(track2Pos).toBeDefined();
    expect(track2Pos?.currentPoint.timestamp).toBe(1500);
    expect(track2Pos?.trail.length).toBe(1);
  });

  it('should handle httpResource error gracefully', () => {
    // Re-create service test context to test error handling on fetch
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MigrationService, provideHttpClient(), provideHttpClientTesting()],
    });

    const errorService = TestBed.inject(MigrationService);
    const errorHttpMock = TestBed.inject(HttpTestingController);

    const req = errorHttpMock.expectOne('data/data.json');
    req.error(new ProgressEvent('Network error'), { status: 500, statusText: 'Server Error' });

    expect(errorService.error()).toBeTruthy();
  });
});
