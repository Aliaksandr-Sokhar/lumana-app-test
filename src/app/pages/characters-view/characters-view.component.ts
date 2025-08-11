import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { Store } from "@ngrx/store";
import { loadCharacters, updateSelectedCharacter, updateCurrentPage } from '../../store/characters.actions';
import { selectCharacters, selectError, selectLoading, selectSelectedCharacter } from '../../store/characters.selectors';
import { SingeCharacterComponent } from "../../components/single-character/single-character.component";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';
import { CharacterInterface } from '../../interfaces/characters.interface';
import { ModalWindowComponent } from "../../components/modal-window/modal-window.component";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-characters-view',
  imports: [
    SearchBarComponent,
    SingeCharacterComponent,
    MatProgressSpinnerModule,
    AsyncPipe,
    ScrollingModule,
    ModalWindowComponent
],
  templateUrl: './characters-view.component.html',
  styleUrl: './characters-view.component.scss'
})
export class CharactersViewComponent implements OnInit {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  protected characters$ = this.store.select(selectCharacters);
  protected isLoading$ = this.store.select(selectLoading);
  protected storeError$ = this.store.select(selectError);
  private paginationPage = 1;
  private charactersCount = 15;
  private selectedCharacter$ = this.store.select(selectSelectedCharacter);

  public selectCharacter: CharacterInterface | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadCharacters());
    this.selectedCharacter$.pipe(
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(character => {
      console.log(character);
      
      this.selectCharacter = character
    })
  }

  public isCharacterChange(event: boolean): void {
    if (event) {
      this.store.dispatch(updateSelectedCharacter({ selectedCharacter: this.selectCharacter }))
    } else {
      this.store.dispatch(updateSelectedCharacter({ selectedCharacter: null }))
    }
  }

  public loadCharacters(event: number) {
    if (event === this.charactersCount) {
      this.paginationPage++;
      this.charactersCount += 15;
      this.store.dispatch(updateCurrentPage({ currentPage: this.paginationPage }))
    }
  }
}
