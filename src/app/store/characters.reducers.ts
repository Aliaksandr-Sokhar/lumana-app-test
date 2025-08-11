import { createEntityAdapter, EntityAdapter, EntityState } from "@ngrx/entity";
import { CharacterInterface } from "../interfaces/characters.interface";
import { PaginationInfo } from "../interfaces/pagination.interface";
import { createReducer, on } from "@ngrx/store";
import { addSearchCharacter, isLoading, loadCharactersFailure, loadCharactersSuccess, setSearchCharacters, updateCurrentPage, updateSearchName } from "./characters.actions";

export interface ApplicationState extends EntityState<CharacterInterface> {
    isLoading: boolean;
    error: string | null;
    pagination: PaginationInfo | null;
    selectedCharacter: CharacterInterface | null;
    searchCharacters: string[];
    searchName: null | string;
    currentPage: number;
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
});

export const appReducer = createReducer(
    initialState,

    on(loadCharactersSuccess, (state, { characters, pagination }) => 
        appAdapter.addMany(characters, {
            ...state,
            pagination,
            error: null
        })
    ),

    on(loadCharactersFailure, (state, { error }) => (
        {
            ...state,
            error: error.message || "Something went wrong..."
        }
    )),

    on(setSearchCharacters, (state, { selectedCharacter }) => ({
        ...state,
        selectedCharacter
    })),

    on(addSearchCharacter, (state, { characterName }) => 
        ({
        ...state,
        searchCharacters: [...new Set([...state.searchCharacters, characterName])]
    })),

    on(isLoading, (state, { isLoading }) => ({
        ...state,
        isLoading
    })),

    on(updateCurrentPage, (state, { currentPage }) => ({
        ...state,
        currentPage
    })),

    on(updateSearchName, (state, { searchName }) => 
        appAdapter.removeAll(({
            ...state,
            searchName
        }))
    )
);