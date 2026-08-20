import { Service, signal, computed, effect } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MigrationDataset, PlaybackSpeed } from '../models/telemetry.model';

@Service()
export class MigrationService {
  // --- STATE SIGNALS ---
  // Using stable httpResource for declarative and signal-based data loading
  private readonly datasetResource = httpResource<MigrationDataset>(
    () => 'data/telemetry-mock.json',
    {
      defaultValue: {
        datasetId: 'loading',
        title: 'Loading Repository...',
        description: 'Fetching telemetry payloads from assets...',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        tracks: [],
      },
    },
  );

  private readonly _currentTime = signal<number>(0);
  private readonly _isPlaying = signal<boolean>(false);
  private readonly _playbackSpeed = signal<PlaybackSpeed>(10);
  private readonly _selectedIndividualIds = signal<Set<string>>(new Set());

  // --- PUBLIC READONLY COMPUTED SIGNALS ---
  public readonly dataset = computed(() => this.datasetResource.value());
  public readonly isLoading = this.datasetResource.isLoading;
  public readonly error = this.datasetResource.error;

  public readonly currentTime = this._currentTime.asReadonly();
  public readonly isPlaying = this._isPlaying.asReadonly();
  public readonly playbackSpeed = this._playbackSpeed.asReadonly();
  public readonly selectedIndividualIds = this._selectedIndividualIds.asReadonly();

  public readonly startTime = computed(() => this.dataset().startTime);
  public readonly endTime = computed(() => this.dataset().endTime);

  // Active tracks filtered dynamically by user selections in the sidebar
  public readonly activeTracks = computed(() => {
    const ds = this.dataset();
    const selected = this._selectedIndividualIds();
    return ds.tracks.filter((track) => selected.has(track.individualId));
  });

  // Current calculation point mapped directly against active track states
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

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  constructor() {
    // Initialize dataset tracking and default selections once resources resolve
    effect(() => {
      const data = this.dataset();
      if (data && data.datasetId !== 'loading') {
        const allIds = new Set(data.tracks.map((t) => t.individualId));
        this._selectedIndividualIds.set(allIds);
        this._currentTime.set(data.startTime);
      }
    });

    // Effect triggers the rAF render/calculation loop natively in zoneless mode
    effect(() => {
      if (this._isPlaying()) {
        this.startLoop();
      } else {
        this.stopLoop();
      }
    });
  }

  // --- CONTROLLER ACTIONS ---
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

  // --- PLAYBACK LOOP ENGINE (Zoneless Safe via rAF & Signal Writes) ---
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
        nextTime = start; // Loop back cleanly to start boundary
      }

      // Updating this signal safely schedules downstream UI calculations in zoneless execution
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
