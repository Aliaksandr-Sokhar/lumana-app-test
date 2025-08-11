import { Component, inject, OnInit } from '@angular/core';
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { Store } from "@ngrx/store";
import { loadCharacters, updateCurrentPage } from '../../store/characters.actions';
import { selectCharacters, selectError, selectLoading } from '../../store/characters.selectors';
import { SingeCharacterComponent } from "../..//components/single-character/single-character.component"
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';

@Component({
  selector: 'app-characters-view',
  imports: [
    SearchBarComponent,
    SingeCharacterComponent,
    MatProgressSpinnerModule,
    AsyncPipe,
    ScrollingModule,
],
  templateUrl: './characters-view.component.html',
  styleUrl: './characters-view.component.scss'
})
export class CharactersViewComponent implements OnInit {
  private store = inject(Store);

  protected characters$ = this.store.select(selectCharacters);
  protected isLoading$ = this.store.select(selectLoading);
  protected storeError$ = this.store.select(selectError);
  private paginationPage = 1;
  private charactersCount = 15;
  ngOnInit(): void {
    this.store.dispatch(loadCharacters());
  }

  public loadCharacters(event: number) {
    if (event === this.charactersCount) {
      this.paginationPage++;
      this.charactersCount += 15;
      this.store.dispatch(updateCurrentPage({ currentPage: this.paginationPage }))
    }
  }
}
