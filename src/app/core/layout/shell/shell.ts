import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapView } from '../../../features/map-view/map-view';
import { Timeline } from '../../../features/timeline/timeline';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [CommonModule, MapView, Timeline, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {}
