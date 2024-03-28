import {Report} from 'src/models/report';

export interface Chart {
    metadata: {
        label?: string;
        labels: string[],
        datasets?: [
            {
                backgroundColor?: string[],
                data?: unknown[]
            }
        ]
    }
    zones: string[]
    districts: string[]
    reports: Report[]
    start_at: string
    end_at: string
    filter_by: string
    type:
        'Bar' |
        'Bubble' |
        'Doughnut' |
        'Line' |
        'Pie' |
        'PolarArea' |
        'Radar' |
        'Scatter' |
        'Bar with reactive data' |
        'Custom chart' |
        'Events'
}
