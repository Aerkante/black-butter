import {defineStore} from 'pinia'

import {DefaultFilter, Pagination} from 'src/types'
import {LocalStorage} from 'quasar'

import {ZoneService} from 'src/services';
import {ResourceService} from 'src/services/resource-store.service';
import {FetchOptions} from 'src/services/abstract.service';
import {Zone} from 'src/models';

const URL = 'zones'

export const useZoneStore = defineStore('zone', {
    state: () => ({
        unique: {} as Zone,
        all: [] as Zone[],
        list: [] as Zone[],
        pagination: {
            sortBy: 'id',
            descending: true,
            page: (LocalStorage.getItem('zoneListPage') as number) ?? 1,
            rowsPerPage: (LocalStorage.getItem('zoneListLimit') as number) ?? 10,
            rowsNumber: 1
        } as Pagination,
        form: {} as Zone,
        filter: {
            search: '',
            status: 'all'
        } as DefaultFilter,
        loading: false,
        fileLoading: false
    }),

    actions: {
        async fetch(options: FetchOptions) {
            this.all = await new ResourceService(URL, new ZoneService()).fetch(options) as Zone[]
        },
        async find(id: number) {
            this.unique = await new ResourceService(URL, new ZoneService()).find(id) as Zone
        },

        async save(form: Zone) {
            return await new ResourceService(URL, new ZoneService()).save(form)
        },
        async delete(id: number) {
            return await new ResourceService(URL, new ZoneService()).delete(id)
        },

        async selectList(options: FetchOptions) {
            this.list = await new ResourceService(URL, new ZoneService()).list(options) as Zone[]
        },
    }

})
