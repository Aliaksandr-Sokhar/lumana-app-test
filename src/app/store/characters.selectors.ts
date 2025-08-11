import { appAdapter, ApplicationState } from "./characters.reducers";
import { createFeatureSelector, createSelector } from "@ngrx/store";

export const selectFromStore = createFeatureSelector<ApplicationState>('characters');

export const selectCharacters = createSelector(
    selectFromStore,
    appAdapter.getSelectors().selectAll
);

export const selectSearchCharacters = createSelector(
    selectFromStore,
    (state) => state.searchCharacters
);

export const selectPagination = createSelector(
    selectFromStore,
    (state) => state.pagination
);

export const selectLoading = createSelector(
    selectFromStore,
    (state) => state.isLoading
);

export const selectSelectedCharacter = createSelector(
    selectFromStore,
    (state) => state.selectedCharacter
);

export const selectError = createSelector(
    selectFromStore,
    (state) => state.error
);

export const selectCurrentPage = createSelector(
    selectFromStore,
    (state) => state.currentPage
);

export const selectSearchName = createSelector(
    selectFromStore,
    (state) => state.searchName
);