import { ApplicationConfig, importProvidersFrom, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { appReducer } from './store/characters.reducers';
import { provideEffects } from '@ngrx/effects';
import { StoreEffects } from './store/characters.effects';
import { MatNativeDateModule } from "@angular/material/core";
import {
  BrowserAnimationsModule,
  provideAnimations,
} from "@angular/platform-browser/animations";
import { provideStoreDevtools } from '@ngrx/store-devtools';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(),
    provideStore({
      characters: appReducer
    }),
    provideEffects([StoreEffects]),
    provideAnimations(),
    provideStoreDevtools({ maxAge: 30, logOnly: !isDevMode() }),
    importProvidersFrom(MatNativeDateModule, BrowserAnimationsModule),
  ]
};
