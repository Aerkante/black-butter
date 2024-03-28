import {AbstractService, FetchOptions, Query} from 'src/services/abstract.service';


export class DistrictService extends AbstractService {

  createQuery(options: FetchOptions): Query {
    if (!!options.pagination.page && options.pagination.page)
      return {
        page: options.pagination.page,
        limit: options.pagination.rowsPerPage,
        search: options.filter.search,
        status: options.filter.status,
        sort: options.pagination.sortBy,
      } as Query

    return {
      search: options.filter.search,
      status: options.filter.status,
      sort: options.pagination.sortBy,
      zone: options.filter.zone
    } as Query
  }
}
