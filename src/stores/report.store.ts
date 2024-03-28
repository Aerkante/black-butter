import {defineStore} from 'pinia'

import {DefaultFilter, Pagination} from 'src/types'
import {LocalStorage} from 'quasar'

import {ReportService} from 'src/services';
import {ResourceService} from 'src/services/resource-store.service';
import {FetchOptions} from 'src/services/abstract.service';
import {Report} from 'src/models';

const URL = 'reports'

export const useReportStore = defineStore('report', {
  state: () => ({
    unique: {} as Report,
    all: [] as Report[],
    list: [] as Report[],
    pagination: {
      sortBy: 'id',
      descending: true,
      page: (LocalStorage.getItem('reportListPage') as number) ?? 1,
      rowsPerPage: (LocalStorage.getItem('reportListLimit') as number) ?? 10,
      rowsNumber: 1
    } as Pagination,
    form: {} as Report,
    filter: {
      search: '',
      status: 'all'
    } as DefaultFilter,
    loading: false,
    fileLoading: false
  }),

  actions: {
    async fetch(options: FetchOptions) {
      this.all = await new ResourceService(URL, new ReportService()).fetch(options) as Report[]
    },
    async find(id: number) {
      this.unique = await new ResourceService(URL, new ReportService()).find(id) as Report
    },

    async save(form: Report) {
      return await new ResourceService(URL, new ReportService()).save(form)
    },
    async delete(id: number) {
      return await new ResourceService(URL, new ReportService()).delete(id)
    },
  }

})
