import {defineStore} from 'pinia'

import {DefaultFilter, Pagination} from 'src/types'
import {LocalStorage} from 'quasar'

import {DistrictService} from 'src/services';
import {ResourceService} from 'src/services/resource-store.service';
import {FetchOptions} from 'src/services/abstract.service';
import {District} from 'src/models';

const URL = 'districts'

export const useDistrictStore = defineStore('district', {
    state: () => ({
        unique: {} as District,
        all: [] as District[],
        list: [] as District[],
        pagination: {
            sortBy: 'id',
            descending: true,
            page: (LocalStorage.getItem('districtListPage') as number) ?? 1,
            rowsPerPage: (LocalStorage.getItem('districtListLimit') as number) ?? 10,
            rowsNumber: 1
        } as Pagination,
        form: {} as District,
        filter: {
            search: '',
            status: 'all',
        } as DefaultFilter,
        loading: false,
        fileLoading: false
    }),

    actions: {
        async fetch(options: FetchOptions) {
            this.all = await new ResourceService(URL, new DistrictService()).fetch({
                ...options,
                filter: {...options.filter, zone: options.filter.zone}
            }) as District[]
        },
        async find(id: number) {
            this.unique = await new ResourceService(URL, new DistrictService()).find(id) as District
        },

        async save(form: District) {
            return await new ResourceService(URL, new DistrictService()).save(form)
        },
        async delete(id: number) {
            return await new ResourceService(URL, new DistrictService()).delete(id)
        },
        async selectList(options: FetchOptions) {
            this.list = await new ResourceService(URL, new DistrictService()).list({
                ...options,
                filter: {...options.filter, zone: options.filter.zone}
            }) as District[]
        },
    }

})
