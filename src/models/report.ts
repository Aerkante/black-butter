import {QTableProps} from 'quasar';

export interface Report {
    register: string
    district: string
    zone: string
    water_pollution_index: number
    sound_pollution_index: number
    air_pollution_index: number
    created_at: string
}

export const ReportTableCols: QTableProps['columns'] = [
    {
        name: 'id',
        label: 'ID',
        field: 'id',
        align: 'left'
    },
    {
        name: 'register',
        label: 'Registrado por',
        field: 'register',
        align: 'left'
    },
    {
        name: 'date',
        label: 'Registrado em',
        field: 'created_at',
        format: (val: string) => `${new Date(val).toLocaleDateString('pt-BR')} as ${new Date(val).toLocaleTimeString('pt-BR')}`,
        align: 'left'
    }, {
        name: 'local',
        label: 'Local',
        field: (row: Report) => `${row.district} - ${row.zone}`,
        align: 'left'
    },
    {
        name: 'pollution',
        label: 'Poluição',
        align: 'center',
        field: ''
    },
    {
        name: 'actions',
        label: 'Ações',
        align: 'center',
        field: ''
    }
]
