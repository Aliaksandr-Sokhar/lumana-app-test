import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { CharacterInterface } from '../interfaces/characters.interface';
import { ApiResponse, PaginationInfo } from '../interfaces/pagination.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private httpClient: HttpClient) { }

  public getCharacters(page: number, name: string | null, pagination: PaginationInfo | null): Observable<ApiResponse<CharacterInterface>> {
    if (pagination && page > pagination?.pages) {
      return EMPTY;
    }
    const params = new HttpParams()
      .set('page', page.toString())
      .set('name', name ? name : '');
    return this.httpClient.get<ApiResponse<CharacterInterface>>(
      environment.baseUrl+"/character",
      { params }
    )
  }
}
