export interface ApiResponse<T> {
    info: PaginationInfo;
    results: T[];
}

export interface PaginationInfo {
    count: number;
    pages: number;
    next: string;
    prev: string | null
}