import { createAction, props } from "@ngrx/store";
import { CharacterInterface } from "../interfaces/characters.interface";
import { PaginationInfo } from "../interfaces/pagination.interface";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangedCanvasCharacter } from "../interfaces/canvas.interface";

export const loadCharacters = createAction('[Characters List] Load Characters');

export const isLoading = createAction(
    '[API Request] Page is Loading',
    props<{ isLoading: boolean }>()
);

export const loadCharactersSuccess = createAction(
    '[Characters List] Load Characters Success',
    props<{ characters: CharacterInterface[], pagination: PaginationInfo }>()
);

export const loadCharactersFailure = createAction(
    '[Characters List] Load Characters Failure',
    props<{ error: HttpErrorResponse }>()
);

export const updateSelectedCharacter = createAction(
    '[Character] Set Selected Character',
    props<{ selectedCharacter: CharacterInterface | null }>()
);

export const addSearchCharacter = createAction(
    '[Character] Add Search Character',
    props<{ characterName: string }>()
);

export const updateCurrentPage = createAction(
    '[Current Page] Update Page',
    props<{ currentPage: number }>()
);

export const updateSearchName = createAction(
    '[Character] Update Search Value',
    props<{ searchName: string }>()
);

export const updateChangedCharacters = createAction(
  "[Character] Save Characters Canvas",
  props<{ changedCharacters: ChangedCanvasCharacter[] }>(),
);