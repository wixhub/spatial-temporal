import { Component, inject, signal } from '@angular/core';
import { MigrationService } from '../../services/migration.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  public migrationService = inject(MigrationService);

  // Local UI state for collapsing
  isCollapsed = signal<boolean>(false);

  // Local input model for data query, referencing the service's selected study ID
  inputId = signal<string>(this.migrationService.selectedStudyId());

  toggleSidebar(): void {
    this.isCollapsed.update((v) => !v);
  }

  onIdSubmit(event: Event): void {
    event.preventDefault();
    const id = this.inputId().trim();
    if (id) {
      this.migrationService.setTargetId(id);
    }
  }

  updateInputId(value: string): void {
    this.inputId.set(value);
  }
}
