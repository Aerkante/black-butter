<template>
  <q-page class="q-pa-md" padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <ReportFormComponent/>
      </div>
      <div class="col-12">
        <ReportListComponent/>
      </div>
      <div class="col-md-6 col-12">
        <ReportsChart/>
      </div>
      <div class="col-md-6 col-12">
        <ReportsByZoneChart/>
      </div>
      <div class=" col-12">
        <IndicatorsChart/>
      </div>
    </div>

  </q-page>
</template>

<script lang="ts" setup>
import ReportFormComponent from 'components/ReportFormComponent.vue';
import ReportListComponent from 'components/ReportListComponent.vue';
import ReportsChart from 'components/ReportsChart.vue';
import ReportsByZoneChart from 'components/ReportsByZoneChart.vue';
import IndicatorsChart from 'components/IndicatorsChart.vue';
</script>
