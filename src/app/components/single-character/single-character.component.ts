import { Component, inject, Input } from '@angular/core';
import { CharacterInterface } from '../../interfaces/characters.interface';
import { Store } from "@ngrx/store";
import { updateSelectedCharacter } from '../../store/characters.actions';

@Component({
  selector: 'app-single-character',
  imports: [

  ],
  templateUrl: './single-character.component.html',
  styleUrl: './single-character.component.scss'
})
export class SingeCharacterComponent {
  private store = inject(Store)
  @Input({ required: true }) character!: CharacterInterface;

  public openModalWindow(): void {
    this.store.dispatch(updateSelectedCharacter({ selectedCharacter: this.character }))
  }
}
