import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MigrationService } from '../../core/services/migration.service';
import { PlaybackSpeed } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-timeline',
  imports: [CommonModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {
  public migrationService = inject(MigrationService);

  speeds: PlaybackSpeed[] = [1, 5, 10, 50, 100];

  onSeekInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.migrationService.seek(value);
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toUTCString().replace('GMT', 'UTC');
  }

  calculateProgress(): number {
    const start = this.migrationService.startTime();
    const end = this.migrationService.endTime();
    const current = this.migrationService.currentTime();

    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100));
  }
}
