<template>
  <q-card class="q-pa-sm">
    <q-card-section class="text-center no-padding">
      <div class="text-h6">Relatos (por bairro)</div>
    </q-card-section>
    <template v-if="getDataSuccess">
      <q-card-section class="justify-center flex">
        <Pie v-model:data="data" :options="options" class="bg-white full-width"/>
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
import {ArcElement, Chart as ChartJS, ChartOptions, Legend, Tooltip} from 'chart.js'
import {Pie} from 'vue-chartjs'
import {computed, inject, onMounted, ref} from 'vue';
import {useChartStore} from 'src/stores';
import {EventBus} from 'quasar';

ChartJS.register(ArcElement, Tooltip, Legend)
const bus = inject('bus') as EventBus
const store = useChartStore()
const data = computed(() => store.districtChart.metadata)

bus.on('new-report-record', async () => await getData())
bus.on('deleted-record', async () => await getData())

const getDataSuccess = ref(true)

const options = {
  responsive: true,
  maintainAspectRatio: false
} as ChartOptions

const getData = async () => {
  const response = await store.getDistrictChart()
  getDataSuccess.value = !!response;
}

onMounted(async () => await getData())

</script>

