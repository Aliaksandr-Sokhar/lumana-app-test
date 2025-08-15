import { createEntityAdapter, EntityAdapter, EntityState } from "@ngrx/entity";
import { CharacterInterface } from "../interfaces/characters.interface";
import { PaginationInfo } from "../interfaces/pagination.interface";
import { createReducer, on } from "@ngrx/store";
import { addSearchCharacter, loadCharactersFailure, loadCharactersSuccess, updateChangedCharacters, updateSelectedCharacter, updateCurrentPage, updateSearchName } from "./characters.actions";
import { ChangedCanvasCharacter } from "../interfaces/canvas.interface";

export interface ApplicationState extends EntityState<CharacterInterface> {
    isLoading: boolean;
    error: string | null;
    pagination: PaginationInfo | null;
    selectedCharacter: CharacterInterface | null;
    searchCharacters: string[];
    searchName: null | string;
    currentPage: number;
    changedCharacters: ChangedCanvasCharacter[]
}

export const appAdapter: EntityAdapter<CharacterInterface> = createEntityAdapter<CharacterInterface>();

export const initialState: ApplicationState = appAdapter.getInitialState({
    isLoading: false,
    error: null,
    pagination: null,
    entities: [],
    searchName: null,
    selectedCharacter: null,
    searchCharacters: [],
    currentPage: 1,
    changedCharacters: []
});

export const appReducer = createReducer(
    initialState,

    on(loadCharactersSuccess, (state, { characters, pagination }) => 
        appAdapter.addMany(characters, {
            ...state,
            pagination,
            isLoading: false,
            error: null
        })
    ),

    on(loadCharactersFailure, (state, { error }) => ({
            ...state,
            error: "Something went wrong...",
            isLoading: false
        })),

    on(updateSelectedCharacter, (state, { selectedCharacter }) => ({
        ...state,
        selectedCharacter,
        isLoading: false
    })),

    on(addSearchCharacter, (state, { characterName }) => ({
        ...state,
        searchCharacters: [...new Set([...state.searchCharacters, characterName])],
        isLoading: false
    })),

    on(updateCurrentPage, (state, { currentPage }) => ({
        ...state,
        currentPage,
        isLoading: true
    })),

    on(updateSearchName, (state, { searchName, currentPage }) => 
        appAdapter.removeAll(({
            ...state,
            isLoading: true,
            searchName,
            currentPage
        }))
    ),

    on(updateChangedCharacters, (state, { changedCharacters }) => ({
        ...state,
        changedCharacters,
        isLoading: true
  }))
);