import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CharacterInterface } from '../interfaces/characters.interface';
import { ApiResponse } from '../interfaces/pagination.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private httpClient: HttpClient) { }

  public getCharacters(page: number, name: string | null): Observable<ApiResponse<CharacterInterface>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('name', name ? name : '');
    return this.httpClient.get<ApiResponse<CharacterInterface>>(
      environment.baseUrl+"/character",
      { params }
    )
  }
}
