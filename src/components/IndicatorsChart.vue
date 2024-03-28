<template>
  <q-card class="q-pa-sm">
    <q-card-section class="text-center no-padding">
      <div class="text-h6">Indicadores gerais</div>
    </q-card-section>
    <template v-if="getDataSuccess">
      <q-card-section class="justify-center flex">
        <Bar v-model:data="data" :options="options" class="bg-white full-width"/>
      </q-card-section>
    </template>
    <template v-else>
      <div class="items-center text-center full-width full-height">
        <q-badge color="red text-white text-bold text-h5 q-ma-md">Erro ao gerar gráfico</q-badge>
      </div>
    </template>
  </q-card>
</template>

<script lang="ts" setup>
import {BarElement, CategoryScale, Chart as ChartJS, ChartOptions, LinearScale} from 'chart.js'
import {Bar} from 'vue-chartjs'
import {computed, inject, onMounted, ref} from 'vue';
import {useChartStore} from 'src/stores';
import {EventBus} from 'quasar';

ChartJS.register(BarElement, CategoryScale, LinearScale)
const bus = inject('bus') as EventBus
const store = useChartStore()
const data = computed(() => store.indicatorChart.metadata)

bus.on('new-report-record', async () => await getData())
bus.on('deleted-record', async () => await getData())

const getDataSuccess = ref(true)

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
  }

} as ChartOptions<'bar'>

const getData = async () => {
  const response = await store.getIndicatorChart()
  getDataSuccess.value = !!response;
}

onMounted(async () => await getData())

</script>

