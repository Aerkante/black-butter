export interface FetchOptions {
  pagination: {
    page?: number;
    rowsPerPage?: number;
    descending: boolean;
    sortBy: string;
  };
  filter: {
    search: string;
    status: string;
    zone?: string;
  };
  company_id?: string;
}

export interface Query {
  page?: number;
  limit?: number;
  search: string;
  status: string;
  sort: string;
  company_id?: string;
}

export abstract class AbstractService {

  abstract createQuery(options: FetchOptions): Query
}
