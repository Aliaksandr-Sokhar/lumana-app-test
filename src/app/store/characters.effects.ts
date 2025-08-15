import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { ApiService } from "../services/api-service.service";
import { select, Store } from "@ngrx/store";
import { addSearchCharacter, loadCharacters, loadCharactersFailure, loadCharactersSuccess, updateCurrentPage, updateSearchName } from "./characters.actions";
import { concatLatestFrom } from "@ngrx/operators";
import { selectCurrentPage, selectPagination, selectSearchName } from "./characters.selectors";
import { catchError, map, switchMap, tap } from "rxjs";
import { of } from "rxjs";

@Injectable()
export class StoreEffects {
    private actions$ = inject(Actions);
    private apiService = inject(ApiService);
    private store = inject(Store);

    getApiCharacters$ = createEffect(() => 
        this.actions$.pipe(
            ofType(loadCharacters, updateCurrentPage, updateSearchName),
            concatLatestFrom(() => [
                this.store.pipe(select(selectCurrentPage)),
                this.store.pipe(select(selectSearchName)),
                this.store.pipe(select(selectPagination))
            ]),
            switchMap(([_, page, characterName, pagination]) => 
                this.apiService.getCharacters(page, characterName, pagination).pipe(
                    tap(value => {
                        if (characterName && characterName.length > 3) {
                            this.store.dispatch(addSearchCharacter({ characterName }))
                        } 
                    }),
                    map(({ results, info }) => 
                        loadCharactersSuccess({characters: results, pagination: info})
                    ),
                    catchError((error) => of(loadCharactersFailure({ error })))
                )
            ),
        )
    );
}