import {defineStore} from 'pinia'
import {DefaultFilter, Pagination} from 'src/types'
import {LocalStorage} from 'quasar'
import {UserService} from 'src/services';
import {ResourceService} from 'src/services/resource-store.service';
import {FetchOptions} from 'src/services/abstract.service';
import {User} from 'src/models';

const URL = 'users'

export const useUserStore = defineStore('user', {
  state: () => ({
    unique: {} as User,
    all: [] as User[],
    list: [] as User[],
    pagination: {
      sortBy: 'id',
      descending: true,
      page: (LocalStorage.getItem('userListPage') as number) ?? 1,
      rowsPerPage: (LocalStorage.getItem('userListLimit') as number) ?? 10,
      rowsNumber: 1
    } as Pagination,
    form: {} as User,
    filter: {
      search: '',
      status: 'all'
    } as DefaultFilter,
    loading: false,
    fileLoading: false
  }),

  actions: {
    async fetch(options: FetchOptions) {
      this.all = await new ResourceService(URL, new UserService()).fetch(options) as User[]
    },
    async find(id: number) {
      this.unique = await new ResourceService(URL, new UserService()).find(id) as User
    },

    async save(form: User) {
      return await new ResourceService(URL, new UserService()).save(form)
    },
    async delete(id: number) {
      return await new ResourceService(URL, new UserService()).delete(id)
    },
    async selectList(options: FetchOptions) {
      this.list = await new ResourceService(URL, new UserService()).list(options) as User[]
    },
  }

})
