import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MapView } from './map-view';
import { MigrationService } from '../../core/services/migration.service';

describe('MapView', () => {
  let component: MapView;
  let fixture: ComponentFixture<MapView>;
  let migrationServiceMock: any;

  beforeEach(async () => {
    // Mock for MigrationService signals and state properties
    migrationServiceMock = {
      currentPositions: signal([]),
      activeTracks: signal([]),
      dataset: signal({
        datasetId: '2911040',
        title: 'Test Dataset',
        description: 'Test',
        startTime: 1000,
        endTime: 5000,
        tracks: [
          {
            individualId: 'sub-1',
            speciesName: 'Test Species',
            commonName: 'Subject 1',
            tagDeployDate: '2026-01-01',
            color: '#38bdf8',
            points: [
              {
                id: 'p1',
                individualId: 'sub-1',
                timestamp: 1000,
                latitude: 47.5,
                longitude: 9.5,
                sensorType: 'GPS',
              },
            ],
          },
        ],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [MapView],
      providers: [{ provide: MigrationService, useValue: migrationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(MapView);
    component = fixture.componentInstance;
  });

  it('should create the component and initialize leaflet map on afterViewInit', () => {
    expect(component).toBeTruthy();

    // Trigger ngAfterViewInit to initialize Leaflet map container in DOM
    fixture.detectChanges();

    // Verify that the map DOM element container is rendered successfully
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('div')).toBeTruthy();
  });

  it('should update map entities when currentPositions signal changes', () => {
    fixture.detectChanges(); // Initialize map component first

    // Push new simulated positions to trigger map entities update effect
    migrationServiceMock.currentPositions.set([
      {
        track: {
          individualId: 'sub-1',
          commonName: 'Subject 1',
          speciesName: 'Test Species',
          color: '#38bdf8',
        },
        currentPoint: {
          latitude: 48.0,
          longitude: 10.0,
          timestamp: 2000,
          sensorType: 'GPS',
          groundSpeed: 5.5,
        },
        trail: [
          { latitude: 47.5, longitude: 9.5 },
          { latitude: 48.0, longitude: 10.0 },
        ],
      },
    ]);

    fixture.detectChanges();
    // Ensure component processes position updates without throwing errors
    expect(component).toBeTruthy();
  });

  it('should clean up map on destroy safely', () => {
    fixture.detectChanges(); // Initialize map

    // Explicitly call component destruction and verify no Leaflet reuse exceptions occur
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
