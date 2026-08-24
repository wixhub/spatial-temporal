import {
  Component,
  AfterViewInit,
  OnDestroy,
  effect,
  inject,
  ElementRef,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { MigrationService } from '../../core/services/migration.service';
import { AnimalTrack } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
})
export class MapView implements AfterViewInit, OnDestroy {
  private readonly migrationService = inject(MigrationService);

  // ViewChild signal query replacing old @ViewChild decorator syntax
  protected readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  private map!: L.Map;
  private readonly trackLayers: Map<string, L.Polyline> = new Map();
  private readonly markerLayers: Map<string, L.CircleMarker> = new Map();
  private readonly trailLayers: Map<string, L.Polyline> = new Map();

  constructor() {
    // React to live temporal playback positions via signals (zoneless safe)
    effect(() => {
      const positions = this.migrationService.currentPositions();
      if (this.map) {
        this.updateMapEntities(positions);
      }
    });

    // React to active/filtered individual track selection toggles in the sidebar
    effect(() => {
      const activeTracks = this.migrationService.activeTracks();
      if (this.map) {
        this.rebuildStaticTracks(activeTracks);
      }
    });

    // Automatically fit map bounds when a new dataset is successfully loaded
    effect(() => {
      const dataset = this.migrationService.dataset();
      if (this.map && dataset && dataset.tracks.length > 0 && dataset.datasetId !== 'loading') {
        this.fitMapToTracks(dataset.tracks);
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialize Leaflet Map centered over Central Europe using modern viewChild signal value lookup
    this.map = L.map(this.mapContainer().nativeElement, {
      zoomControl: false,
      attributionControl: true,
    }).setView([47.5, 9.5], 6);

    // Dark scientific CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);

    // Position clean custom zoom controls in top-right viewport
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Initial render pass
    this.rebuildStaticTracks(this.migrationService.activeTracks());
    this.updateMapEntities(this.migrationService.currentPositions());
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      (this.map as any) = undefined;
    }
  }

  private fitMapToTracks(tracks: AnimalTrack[]): void {
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    for (const track of tracks) {
      for (const p of track.points) {
        bounds.extend([p.latitude, p.longitude]);
        hasPoints = true;
      }
    }

    if (hasPoints) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }

  private rebuildStaticTracks(tracks: AnimalTrack[]): void {
    // Purge outdated track vector overlays
    this.trackLayers.forEach((layer) => layer.remove());
    this.trackLayers.clear();

    const activeIds = new Set(tracks.map((t) => t.individualId));

    // Clear stale markers & trails for deselected individuals
    this.markerLayers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        this.markerLayers.delete(id);
      }
    });
    this.trailLayers.forEach((trail, id) => {
      if (!activeIds.has(id)) {
        trail.remove();
        this.trailLayers.delete(id);
      }
    });

    // Render full background reference vector paths with low opacity styled lines
    for (const track of tracks) {
      const latLngs = track.points.map((p) => [p.latitude, p.longitude] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: track.color,
        weight: 1.5,
        opacity: 0.25,
        dashArray: '4, 4',
      }).addTo(this.map);

      this.trackLayers.set(track.individualId, polyline);
    }
  }

  private updateMapEntities(positions: any[]): void {
    for (const pos of positions) {
      const { track, currentPoint, trail } = pos;
      const latLng: [number, number] = [currentPoint.latitude, currentPoint.longitude];

      // Render recent historical trail polyline up to current playback head
      const trailLatLngs = trail.map((p: any) => [p.latitude, p.longitude] as [number, number]);
      if (this.trailLayers.has(track.individualId)) {
        this.trailLayers.get(track.individualId)!.setLatLngs(trailLatLngs);
      } else {
        const trailLine = L.polyline(trailLatLngs, {
          color: track.color,
          weight: 3,
          opacity: 0.8,
        }).addTo(this.map);
        this.trailLayers.set(track.individualId, trailLine);
      }

      // Render or update active coordinate marker node with rich metadata popup matching model types
      const popupContent = `
        <div class="map-popup">
          <strong>${track.commonName}</strong><br/>
          <small>Species: <em>${track.speciesName}</em></small><hr/>
          <b>ID:</b> ${track.individualId}<br/>
          <b>Time:</b> ${new Date(currentPoint.timestamp).toUTCString()}<br/>
          <b>Sensor:</b> ${currentPoint.sensorType}
          ${currentPoint.groundSpeed !== undefined ? `<br/><b>Speed:</b> ${currentPoint.groundSpeed} m/s` : ''}
          ${currentPoint.altitude !== undefined ? `<br/><b>Altitude:</b> ${currentPoint.altitude} m` : ''}
        </div>
      `;

      if (this.markerLayers.has(track.individualId)) {
        const marker = this.markerLayers.get(track.individualId)!;
        marker.setLatLng(latLng);
        marker.bindPopup(popupContent);
      } else {
        const marker = L.circleMarker(latLng, {
          radius: 7,
          fillColor: track.color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(this.map);

        marker.bindPopup(popupContent);
        this.markerLayers.set(track.individualId, marker);
      }
    }
  }
}
