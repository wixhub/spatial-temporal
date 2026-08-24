import { Component, inject } from '@angular/core';
import { MigrationService } from '../../core/services/migration.service';
import { PlaybackSpeed } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {
  // Injecting the migration service for template-driven state consumption via signals
  protected readonly migrationService = inject(MigrationService);

  // Available playback speed configurations
  protected readonly speeds: PlaybackSpeed[] = [1, 5, 10, 50, 100];

  // Handles timeline range input adjustments
  protected onSeekInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.migrationService.seek(value);
  }

  // Formats unix timestamps to readable UTC strings
  protected formatDate(timestamp: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toUTCString().replace('GMT', 'UTC');
  }

  // Calculates percentage progress for timeline range visualization
  protected calculateProgress(): number {
    const start = this.migrationService.startTime();
    const end = this.migrationService.endTime();
    const current = this.migrationService.currentTime();

    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100));
  }
}
