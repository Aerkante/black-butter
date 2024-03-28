import {QTableProps} from 'quasar';
import {Zone} from 'src/models/zone';

export interface District {
  id?: number;
  name: string
  zone_id: number
  zone: Zone
  area: number
  population: number
  density: number
  households: number

}

export const DistrictTableCols: QTableProps['columns'] = [
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
    name: 'actions',
    label: 'Ações',
    align: 'center',
    field: ''
  }
]
