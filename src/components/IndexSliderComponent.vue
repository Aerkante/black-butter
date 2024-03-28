<template>

  <q-card-section class="row q-col-gutter-lg">
    <div class="col-12 col-md-4">
      <q-item-label class="text-dark text-bold">Indicador de qualidade do ar
        <q-icon name="air" size="1.3rem"/>
      </q-item-label>

      <q-slider v-model="data.air_pollution_index" :color="indicatorColor(data.air_pollution_index)"
                :label-color="indicatorColor(data.air_pollution_index)"
                :label-value="`${data.air_pollution_index}: ${indicatorText(data.air_pollution_index)}`"
                :marker-labels="['1', '50', '100']"
                :markers="4"
                :max="100"
                :min="1" :step="1"
                label
                label-always
                marker-labels-class="text-bold text-dark"
                switch-label-side
      />
    </div>
    <div class="col-12 col-md-4">
      <q-item-label class="text-dark text-bold">Indicador de qualidade da água
        <q-icon name="water" size="1.3rem"/>
      </q-item-label>
      <q-slider v-model="data.water_pollution_index" :color="indicatorColor(data.water_pollution_index)"
                :label-color="indicatorColor(data.water_pollution_index)"
                :label-value="`${data.water_pollution_index}: ${indicatorText(data.water_pollution_index)}`"
                :marker-labels="['1', '50', '100']"
                :markers="4"
                :max="100"
                :min="1" :step="1"
                label
                label-always
                marker-labels-class="text-bold text-dark"
                switch-label-side
      />
    </div>
    <div class="col-12 col-md-4">
      <q-item-label class="text-dark text-bold">Indicador de poluição sonora
        <q-icon name="las la-assistive-listening-systems" size="1.3rem"/>
      </q-item-label>
      <q-slider v-model="data.sound_pollution_index" :color="indicatorColor(data.sound_pollution_index)"
                :label-color="indicatorColor(data.sound_pollution_index)"
                :label-value="`${data.sound_pollution_index}: ${indicatorText(data.sound_pollution_index)}`"
                :marker-labels="['1', '50', '100']"
                :markers="4"
                :max="100"
                :min="1" :step="1"
                label
                label-always
                marker-labels-class="text-bold text-dark"
                switch-label-side
      />
    </div>
  </q-card-section>
</template>

<script lang="ts" setup>

import {computed, PropType} from 'vue';
import {Report} from 'src/models';


const props = defineProps({
  modelValue: {type: Object as PropType<Report>}
})

const emit = defineEmits(['update:modelValue'])

const data = computed<Report>({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})
const indicatorColor = (value: number) => {
  if (value < 30) {
    return 'red'
  } else if (value < 40) {
    return 'orange'
  } else if (value >= 40 && value <= 50) {
    return 'yellow'
  } else {
    return 'green'
  }
}
const indicatorText = (value: number) => {
  if (value < 30) {
    return 'Crítico'
  } else if (value < 40) {
    return 'Alarmante'
  } else if (value >= 40 && value <= 50) {
    return 'Alerta'
  } else {
    return 'Bom'
  }
}

</script>
<style lang="scss">
</style>
