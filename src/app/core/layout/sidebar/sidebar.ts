import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MigrationService } from '../../services/migration.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  public migrationService = inject(MigrationService);

  // Local UI state for collapsing
  isCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isCollapsed.update((v) => !v);
  }
}
