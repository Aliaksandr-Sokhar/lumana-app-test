import { Routes } from '@angular/router';
import { CharactersViewComponent } from './pages/characters-view/characters-view.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'all-characters',
        pathMatch: 'full'
    },
    {
        path: 'all-characters',
        loadComponent: () => CharactersViewComponent
    }
];
