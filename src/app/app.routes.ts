import { Routes } from '@angular/router';
import { Shell } from './core/layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
