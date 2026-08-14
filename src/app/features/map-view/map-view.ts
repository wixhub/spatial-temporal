import {
  Component,
  AfterViewInit,
  OnDestroy,
  effect,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MigrationService } from '../../core/services/migration.service';

@Component({
  selector: 'app-map-view',
  imports: [CommonModule],
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
})
export class MapView implements AfterViewInit, OnDestroy {
  private migrationService = inject(MigrationService);

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map!: L.Map;
  private trackLayers: Map<string, L.Polyline> = new Map();
  private markerLayers: Map<string, L.CircleMarker> = new Map();
  private trailLayers: Map<string, L.Polyline> = new Map();

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
  }

  ngAfterViewInit(): void {
    // Initialize Leaflet Map centered over Central Europe (matches Movebank sample payloads)
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false,
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
    }
  }

  private rebuildStaticTracks(tracks: any[]): void {
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

    // Render full background reference vector paths with low opacity dashed styling
    for (const track of tracks) {
      const latLngs = track.points.map((p: any) => [p.latitude, p.longitude] as [number, number]);
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

      // 1. Render recent historical trail polyline up to current playback head
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

      // 2. Render or update active coordinate marker node with rich metadata popup
      const popupContent = `
        <div class="map-popup">
          <strong>${track.commonName}</strong><br/>
          <small>ID: ${track.individualId}</small><hr/>
          <b>Time:</b> ${new Date(currentPoint.timestamp).toUTCString()}<br/>
          <b>Speed:</b> ${currentPoint.groundSpeed} m/s<br/>
          <b>Altitude:</b> ${currentPoint.altitude} m
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
