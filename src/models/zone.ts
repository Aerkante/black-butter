import {QTableProps} from 'quasar';

export interface Zone {
  id?: number
  name: string

}

export const ZoneTableCols: QTableProps['columns'] = [
  {
    name: 'id',
    label: 'ID',
    field: 'id',
    align: 'left'
  },
  {
    name: 'name',
    label: 'Nome',
    field: 'name',
    align: 'left'
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
    align: 'left'
  },
  {
    name: 'actions',
    label: 'Ações',
    align: 'center',
    field: ''
  }
]
