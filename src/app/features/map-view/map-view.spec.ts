import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MapView } from './map-view';
import { MigrationService } from '../../core/services/migration.service';
import { MigrationDataset } from '../../core/models/telemetry.model';

describe('MapView', () => {
  let component: MapView;
  let fixture: ComponentFixture<MapView>;
  let httpMock: HttpTestingController;
  let migrationService: MigrationService;

  // Comprehensive mock dataset adhering strictly to project models for Leaflet rendering
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
            latitude: 47.5,
            longitude: 9.5,
            altitude: 100,
            groundSpeed: 12.5,
            sensorType: 'GPS',
          },
          {
            id: 'p2',
            individualId: 'ind-1',
            timestamp: 2000,
            latitude: 48.0,
            longitude: 10.0,
            altitude: 150,
            groundSpeed: 14.0,
            sensorType: 'GPS',
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapView],
      providers: [MigrationService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    migrationService = TestBed.inject(MigrationService);

    // Flush initial httpResource request made by MigrationService
    const req = httpMock.expectOne('data/data.json');
    req.flush(mockDataset);

    fixture = TestBed.createComponent(MapView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Test component creation
  it('should create the map view component successfully', () => {
    expect(component).toBeTruthy();
  });

  // Test map container element presence and Leaflet initialization inside ngAfterViewInit
  it('should initialize Leaflet map instance correctly after view init', () => {
    // Component container reference should be available via viewChild signal query
    const container = component['mapContainer']().nativeElement;
    expect(container).toBeTruthy();

    // Verify internal map reference is instantiated
    expect(component['map']).toBeDefined();
  });

  // Test reaction to signal updates for track rebuilding and entity positioning
  it('should update map entities and tracks when migration service signals change', () => {
    // Spy on internal rendering methods to ensure reactive effects invoke them cleanly
    const rebuildSpy = vi.spyOn(component as any, 'rebuildStaticTracks');
    const updateEntitiesSpy = vi.spyOn(component as any, 'updateMapEntities');

    // Seek time to trigger position effects
    migrationService.seek(2000);

    // Toggle individual selection to trigger active tracks effect
    migrationService.toggleIndividualSelection('ind-1');

    expect(rebuildSpy).toHaveBeenCalled();
    expect(updateEntitiesSpy).toHaveBeenCalled();
  });

  // Test cleanup on component destruction
  it('should properly remove the map instance on component destruction', () => {
    const mapInstance = component['map'];
    const removeSpy = vi.spyOn(mapInstance, 'remove');

    component.ngOnDestroy();

    expect(removeSpy).toHaveBeenCalled();
  });
});
