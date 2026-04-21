import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/users/containers/users-page/users-page.component').then(
        m => m.UsersPageComponent
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        m => m.NotFoundComponent
      ),
  },
];
