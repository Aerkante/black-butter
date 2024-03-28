<template>
  <div class="row justify-center q-col-gutter-md">
    <div>
      <div>
        <q-icon name="air" size="1.5rem"/>
      </div>
      <div>
        <q-badge :color="indicatorColor(report.air_pollution_index)" name="circle" rounded size="1.5rem">
          {{ report.air_pollution_index }}
        </q-badge>
      </div>
    </div>
    <div>
      <div>
        <q-icon name="water" size="1.5rem"/>
      </div>
      <div>
        <q-badge :color="indicatorColor(report.water_pollution_index)" name="circle" size="1.5rem">
          {{ report.water_pollution_index }}
        </q-badge>
      </div>
    </div>
    <div>
      <div>
        <q-icon name="las la-assistive-listening-systems" size="1.5rem"/>
      </div>
      <div>
        <q-badge :color="indicatorColor(report.sound_pollution_index)" name="circle" size="1.5rem">
          {{ report.sound_pollution_index }}
        </q-badge>
      </div>
    </div>
  </div>

</template>

<script lang="ts" setup>
import {Report} from 'src/models';
import {PropType} from 'vue';

defineProps({
      report: {type: Object as PropType<Report>, required: true}
    }
)

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
</script>
