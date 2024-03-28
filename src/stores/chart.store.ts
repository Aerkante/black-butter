import {defineStore} from 'pinia'
import {Chart} from 'src/models';
import {api} from 'boot/axios';
import {urlBuilder} from 'src/utils';


const URL = 'charts'

type ChartPayload = {
    type: Chart['type'],
    filter_by?: string,
}

const defaultChart: Chart = {
    districts: [],
    type: 'Pie',
    filter_by: 'district',
    metadata: {
        datasets: [{
            data: [],
            backgroundColor: []
        }],
        labels: []
    },
    end_at: '',
    reports: [],
    start_at: '',
    zones: []
}

export const useChartStore = defineStore('chart', {
    state: () => ({
        districtChart: {...defaultChart},
        zoneChart: {...defaultChart, filter_by: 'zone'},
        indicatorChart: {...defaultChart, filter_by: 'indicator', metadata: {...defaultChart.metadata}}
    }),
    actions: {
        async getDistrictChart() {
            try {
                const payload: ChartPayload = {type: 'Pie', filter_by: 'District'}
                const response = await api.get(urlBuilder(URL, {...payload}))
                this.districtChart = response.data
                return response.data as Chart
            } catch (err) {
                console.error(err)
                return false
            }
        },
        async getZoneChart() {
            try {
                const payload: ChartPayload = {type: 'Pie', filter_by: 'Zone'}
                const response = await api.get(urlBuilder(URL, {...payload}))
                this.zoneChart = response.data
                return response.data as Chart
            } catch (err) {
                console.error(err)
                return false
            }
        },
        async getIndicatorChart() {
            try {
                const payload: ChartPayload = {type: 'Bar', filter_by: 'Indicator'}
                const response = await api.get(urlBuilder(URL, {...payload}))
                this.indicatorChart = response.data
                return response.data as Chart
            } catch (err) {
                console.error(err)
                return false
            }
        }
    }
})
