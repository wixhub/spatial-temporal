import { Service, signal, computed, inject, effect } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  MigrationDataset,
  AnimalTrack,
  TelemetryPoint,
  PlaybackSpeed,
} from '../models/telemetry.model';

@Service()
export class MigrationService {
  private readonly http = inject(HttpClient);
  private readonly workerBaseUrl = 'https://wispy-surf-c9db.rublin.workers.dev';

  // --- STATE SIGNALS ---
  private readonly _targetId = signal<string>('2911040');
  private readonly _useMockFallback = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Store raw dataset fetched from live API or mock fallback
  private readonly _dataset = signal<MigrationDataset>({
    datasetId: 'loading',
    title: 'Loading Repository...',
    description: 'Fetching telemetry payloads from remote worker...',
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    tracks: [],
  });

  // Temporal playback control signals
  private readonly _currentTime = signal<number>(0);
  private readonly _isPlaying = signal<boolean>(false);
  private readonly _playbackSpeed = signal<PlaybackSpeed>(10);
  private readonly _selectedIndividualIds = signal<Set<string>>(new Set());

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  // --- PUBLIC READONLY COMPUTED SIGNALS ---
  public readonly dataset = this._dataset.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  // Backwards compatibility aliases for components
  public readonly targetId = this._targetId.asReadonly();
  public readonly selectedStudyId = this._targetId.asReadonly();
  public readonly useMockFallback = this._useMockFallback.asReadonly();

  public readonly currentTime = this._currentTime.asReadonly();
  public readonly isPlaying = this._isPlaying.asReadonly();
  public readonly playbackSpeed = this._playbackSpeed.asReadonly();
  public readonly selectedIndividualIds = this._selectedIndividualIds.asReadonly();

  public readonly startTime = computed(() => this.dataset().startTime);
  public readonly endTime = computed(() => this.dataset().endTime);

  // Filtered tracks based on sidebar selection toggles
  public readonly activeTracks = computed(() => {
    const ds = this.dataset();
    const selected = this._selectedIndividualIds();
    return ds.tracks.filter((track) => selected.has(track.individualId));
  });

  // Current temporal positions for map playback animation
  public readonly currentPositions = computed(() => {
    const time = this._currentTime();
    const tracks = this.activeTracks();
    const positions = [];

    for (const track of tracks) {
      const validPoints = track.points.filter((p) => p.timestamp <= time);
      if (validPoints.length > 0) {
        const currentPoint = validPoints[validPoints.length - 1];
        const trail = validPoints.slice(Math.max(0, validPoints.length - 20));
        positions.push({ track, currentPoint, trail });
      }
    }
    return positions;
  });

  constructor() {
    // Automatically fetch dataset when target ID changes
    effect(() => {
      const idToFetch = this._targetId();
      this.fetchDataset(idToFetch);
    });

    // Reset selection and timeline bounds when dataset updates successfully
    effect(() => {
      const data = this._dataset();
      if (data && data.datasetId !== 'loading' && data.tracks.length > 0) {
        const allIds = new Set(data.tracks.map((t) => t.individualId));
        this._selectedIndividualIds.set(allIds);
        this._currentTime.set(data.startTime);
      }
    });

    // Control playback animation loop based on play state
    effect(() => {
      if (this._isPlaying()) {
        this.startLoop();
      } else {
        this.stopLoop();
      }
    });
  }

  /**
   * Sets new study target ID to query
   */
  public setTargetId(id: string): void {
    const trimmed = id.trim();
    if (trimmed) {
      this._useMockFallback.set(false);
      this._targetId.set(trimmed);
    }
  }

  /**
   * Alias method for components calling setStudyId
   */
  public setStudyId(id: string): void {
    this.setTargetId(id);
  }

  /**
   * Fetches and parses live telemetry data from Movebank via Cloudflare Worker proxy.
   * Automatically falls back to local static mock dataset if the upstream fails or returns empty blocks.
   */
  private fetchDataset(id: string): void {
    this._isLoading.set(true);
    this._error.set(null);

    const params = new HttpParams()
      .set('entity_type', 'event')
      .set('study_id', id)
      .set('i_can_see_data', 'true');

    this.http
      .get(this.workerBaseUrl, { params, responseType: 'text' })
      .pipe(
        map((rawText) => {
          // Check if worker response indicates an upstream Movebank error or empty body
          if (!rawText || rawText.includes('error code:') || rawText.includes('<p>')) {
            throw new Error('Cloudflare worker timeout or upstream Movebank error');
          }
          return this.parseCsvTsvToDataset(rawText, id);
        }),
        catchError((error) => {
          console.warn(`Dataset for ID ${id} failed. Falling back to local mock dataset.`, error);
          this._useMockFallback.set(true);

          // Fallback to local static JSON file inside the public directory
          return this.http.get<MigrationDataset>('/data/telemetry-mock.json');
        }),
      )
      .subscribe({
        next: (dataset) => {
          if (dataset) {
            this._dataset.set(dataset);
            this._isLoading.set(false);
          }
        },
        error: (err) => {
          console.error('Critical failure loading both live stream and mock data', err);
          this._error.set('Failed to load dataset for ID: ' + id);
          this._isLoading.set(false);
        },
      });
  }

  /**
   * Parses raw CSV/TSV text response into a strict MigrationDataset structure,
   * supporting multiple individual tracks, dynamic name detection, and color assignment.
   */
  private parseCsvTsvToDataset(text: string, datasetId: string): MigrationDataset {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('Empty dataset received from stream');

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.replace(/["']/g, '').trim().toLowerCase());

    // Detect column indexes for IDs, names, timestamps, coordinates, and metadata
    const idIdx = headers.findIndex(
      (h) =>
        h.includes('individual_local_identifier') ||
        h.includes('tag_local_identifier') ||
        h.includes('id'),
    );
    const nameIdx = headers.findIndex(
      (h) => h.includes('individual_name') || h.includes('animal_name') || h.includes('name'),
    );
    const timeIdx = headers.findIndex((h) => h.includes('timestamp') || h.includes('time'));
    const latIdx = headers.findIndex((h) => h.includes('location_lat') || h.includes('lat'));
    const lonIdx = headers.findIndex(
      (h) => h.includes('location_long') || h.includes('lon') || h.includes('lng'),
    );
    const speciesIdx = headers.findIndex(
      (h) => h.includes('taxon_canonical_name') || h.includes('species'),
    );
    const altIdx = headers.findIndex(
      (h) => h.includes('heightaboveellipsoid') || h.includes('altitude'),
    );
    const speedIdx = headers.findIndex((h) => h.includes('groundspeed') || h.includes('speed'));

    const trackMap = new Map<
      string,
      { speciesName: string; commonName: string; points: TelemetryPoint[] }
    >();
    let minTime = Infinity;
    let maxTime = -Infinity;

    // Process all lines to capture multi-individual tracking data completely
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.replace(/["']/g, '').trim());
      const individualId = cols[idIdx] || `sub-${i}`;
      const rawTime = cols[timeIdx];
      const timestamp = !isNaN(Number(rawTime)) ? Number(rawTime) : new Date(rawTime).getTime();
      const latitude = parseFloat(cols[latIdx]);
      const longitude = parseFloat(cols[lonIdx]);

      if (
        isNaN(timestamp) ||
        isNaN(latitude) ||
        isNaN(longitude) ||
        (latitude === 0 && longitude === 0)
      )
        continue;

      if (timestamp < minTime) minTime = timestamp;
      if (timestamp > maxTime) maxTime = timestamp;

      // Initialize track entry if it doesn't exist yet for this individual
      if (!trackMap.has(individualId)) {
        const animalName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : null;
        trackMap.set(individualId, {
          speciesName:
            speciesIdx >= 0 && cols[speciesIdx] ? cols[speciesIdx] : 'Migratory Wildlife',
          commonName: animalName ? `${animalName} (${individualId})` : `Subject ${individualId}`,
          points: [],
        });
      }

      const point: TelemetryPoint = {
        id: `${individualId}-${timestamp}`,
        individualId,
        timestamp,
        latitude,
        longitude,
        altitude: altIdx >= 0 ? parseFloat(cols[altIdx]) || undefined : undefined,
        groundSpeed: speedIdx >= 0 ? parseFloat(cols[speedIdx]) || undefined : undefined,
        sensorType: 'GPS',
      };

      trackMap.get(individualId)!.points.push(point);
    }

    // Extended color palette for multiple individual tracks differentiation on map
    const palette = [
      '#38bdf8',
      '#34d399',
      '#f472b6',
      '#fbbf24',
      '#a78bfa',
      '#fb7185',
      '#38ef7d',
      '#11998e',
      '#f7971e',
      '#ffd200',
    ];
    let colorIndex = 0;

    const tracks: AnimalTrack[] = Array.from(trackMap.entries())
      .map(([individualId, data]) => ({
        individualId,
        speciesName: data.speciesName,
        commonName: data.commonName,
        tagDeployDate:
          minTime !== Infinity ? new Date(minTime).toISOString() : new Date().toISOString(),
        color: palette[colorIndex++ % palette.length],
        points: data.points.sort((a, b) => a.timestamp - b.timestamp),
      }))
      .filter((t) => t.points.length > 0);

    return {
      datasetId,
      title: `Telemetry Study ${datasetId}`,
      description: `Loaded ${tracks.length} tracked individuals successfully.`,
      startTime: minTime === Infinity ? Date.now() : minTime,
      endTime: maxTime === -Infinity ? Date.now() + 1000 : maxTime,
      tracks,
    };
  }

  // --- PLAYBACK CONTROLS ---

  public togglePlay(): void {
    this._isPlaying.update((p) => !p);
  }

  public play(): void {
    this._isPlaying.set(true);
  }

  public pause(): void {
    this._isPlaying.set(false);
  }

  public seek(time: number): void {
    const clamped = Math.max(this.startTime(), Math.min(this.endTime(), time));
    this._currentTime.set(clamped);
  }

  public setSpeed(speed: PlaybackSpeed): void {
    this._playbackSpeed.set(speed);
  }

  public toggleIndividualSelection(individualId: string): void {
    this._selectedIndividualIds.update((set) => {
      const updated = new Set(set);
      if (updated.has(individualId)) {
        updated.delete(individualId);
      } else {
        updated.add(individualId);
      }
      return updated;
    });
  }

  private startLoop(): void {
    this.lastTimestamp = performance.now();

    const loop = (now: number) => {
      if (!this._isPlaying()) return;

      const deltaRealMs = now - this.lastTimestamp;
      this.lastTimestamp = now;

      const speed = this._playbackSpeed();
      const deltaSimMs = deltaRealMs * speed * 1000;

      const current = this._currentTime();
      const end = this.endTime();
      const start = this.startTime();

      let nextTime = current + deltaSimMs;
      if (nextTime >= end) {
        nextTime = start;
      }

      this._currentTime.set(nextTime);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
