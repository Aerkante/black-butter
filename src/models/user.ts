import {QTableProps} from 'quasar';

export interface User {
  id?: number
  name: string
  email: string
  password: string
}

export const UserTableCols: QTableProps['columns'] = [
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
