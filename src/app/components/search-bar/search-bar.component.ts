import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { MatFormField, MatLabel } from "@angular/material/form-field";
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule, MatAutocompleteTrigger, MatOption} from '@angular/material/autocomplete';
import { Store } from "@ngrx/store";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import { selectSearchCharacters } from '../../store/characters.selectors';
import { AsyncPipe } from '@angular/common';
import { combineLatest, debounceTime, map, tap } from 'rxjs';
import { updateCurrentPage, updateSearchName } from '../../store/characters.actions';
import { SEARCH_DELAY } from '../../consts/delay.const';

@Component({
  selector: 'app-search-bar',
  imports: [
    MatFormField,
    MatLabel,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatOption,
    MatAutocompleteTrigger
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent implements OnInit {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  public searchControl = new FormControl("");

  public searchedCharacters$ = combineLatest([
    this.store.select(selectSearchCharacters),
    this.searchControl.valueChanges
  ])
  .pipe(
    map(([searchNames, searchName]) => {
      return searchName 
        ? searchNames.filter((name) => name.startsWith(searchName))
        : []
    })
  );

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(SEARCH_DELAY),
        tap((value) => {
          this.store.dispatch(updateCurrentPage({ currentPage: 1 })),
          this.store.dispatch(updateSearchName({ searchName: value || "" }))
        })
      )
      .subscribe();
  }
}
