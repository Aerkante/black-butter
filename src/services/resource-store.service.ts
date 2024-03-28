import {urlBuilder, useNotifier} from 'src/utils'
import {api} from 'src/boot/axios'
import {AbstractService, FetchOptions} from './abstract.service'
import {AxiosResponse} from 'axios';

const notify = useNotifier()

export class ResourceService<T> {
  constructor(private url: string, private service: AbstractService) {
  }

  async save(resource: T): Promise<AxiosResponse> {
    return await api.request({
      url: urlBuilder(this.url, {}, (resource as {
        id?: number
      })?.id || undefined),
      data: resource,
      method: (resource as {
        id?: number
      }).id ? 'PUT' : 'POST'
    })
  }

  async list(options: FetchOptions): Promise<T[]> {
    try {
      const query = this.service.createQuery(options)
      const response = await api.get<T[]>(urlBuilder(this.url, query as unknown as Record<string, unknown>))
      return response.data
    } catch (err) {
      console.log(err)
      return []
    }
  }

  async fetch(options: FetchOptions): Promise<T[]> {
    
    try {
      const query = this.service.createQuery(options)
      const response = await api.get(urlBuilder(this.url, query as unknown as Record<string, unknown>))
      const {data} = response
      return data.data
    } catch (error) {
      console.log(error)
      notify.error('Erro ao consultar api')
      return []
    }
  }

  async find(id: number): Promise<T | void> {
    try {
      const response = await api.get(urlBuilder(this.url, {}, id))
      return response.data as T
    } catch (error) {
      console.log(error)
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const response = await api.delete(urlBuilder(this.url, {}, id))
      const {status} = response
      return status >= 200 && status < 300
    } catch (error) {
      console.log(error)
      return false
    }
  }
}
