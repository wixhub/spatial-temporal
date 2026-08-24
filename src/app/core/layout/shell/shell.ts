import { Component } from '@angular/core';
import { MapView } from '../../../features/map-view/map-view';
import { Timeline } from '../../../features/timeline/timeline';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [MapView, Timeline, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {}
