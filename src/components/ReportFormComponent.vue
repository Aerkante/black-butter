<template>
  <q-card>
    <q-form ref="qform" @reset="form.data = {...defaultData}" @submit.stop.prevent="save">
      <q-card-section>
        <div class="text-h6 text-dark">Reportar poluição em Manaus - AM</div>
      </q-card-section>
      <q-card-section class="row q-col-gutter-md">
        <q-input v-model="form.data.register" :rules="nameValidations()" class="col-12 col-md-4" filled
                 hide-bottom-space
                 label="Seu nome"
                 outlined/>
        <ZoneSelectorComponent v-model="form.data.zone" :rules="zoneValidations()" class="col-12 col-md-4" filled
                               hide-bottom-space
                               @update:modelValue="form.data.district = !!form.data.district?'' : form.data.district"/>
        <div class="col-12 col-md-4">
          <DistrictSelectorComponent v-model="form.data.district" :disable="!form.data.zone"
                                     :rules="districtValidations()"
                                     filled hide-bottom-space/>
          <q-tooltip v-if="!form.data.zone" :hide-delay="1000" class="bg-red">
            Primeiro selecione uma zona
          </q-tooltip>
        </div>
      </q-card-section>
      <IndexSliderComponent v-model:model-value="form.data"/>
      <q-card-actions align="right">
        <q-btn :disabled="loading" :loading="loading" color="red" label="Limpar" type="reset" unelevated/>
        <q-btn :disabled="loading" :loading="loading" class="q-ml-sm" color="secondary" label="Reportar" type="submit"
               unelevated/>
      </q-card-actions>
    </q-form>
  </q-card>
</template>

<script lang="ts" setup>

import {computed, inject, reactive, ref} from 'vue';
import {Report} from 'src/models';
import ZoneSelectorComponent from 'components/ZoneSelectorComponent.vue';
import DistrictSelectorComponent from 'components/DistrictSelectorComponent.vue';
import IndexSliderComponent from 'components/IndexSliderComponent.vue';
import {useReportStore} from 'src/stores';
import {useNotifier} from 'src/utils';
import {EventBus, QForm} from 'quasar';

const bus = inject('bus') as EventBus
const defaultData = {air_pollution_index: 1, sound_pollution_index: 1, water_pollution_index: 1} as Report
const store = useReportStore()
const notifier = useNotifier()
const form = reactive({data: {...defaultData}})
const qform = ref<QForm>()
const loading = computed(() => store.loading)
const nameValidations = () => [
  (name: string) => !!name && name?.length > 0 || 'Nome obrigatório',
  (name: string) => name?.length > 2 || 'Nome muito curto',
  (name: string) => name?.length < 50 || 'Nome muito longo',
  (name: string) => name?.replace(/ /g, '').length > 2 || 'Nome muito curto',
]

const zoneValidations = () => [
  (zone: string) => !!zone && zone?.length > 0 || 'Zona obrigatória',
]
const districtValidations = () => [
  (districtValidations: string) => !!districtValidations && districtValidations?.length > 0 || 'Bairro obrigatório',
]

const save = async () => {
  store.loading = true
  try {
    await store.save(form.data)
    notifier.success('Dados salvos com sucesso!')
    qform.value?.reset()
    qform.value?.resetValidation()

    bus.emit('new-report-record')
  } catch (e) {
    console.error(e)
    notifier.error('Erro ao salvar dados. Contate o administrador')
  } finally {
    store.loading = false
  }
}

bus.on('edit-report-record', (record: Report) => {
  form.data = {...record}
})
</script>
<style lang="scss">
</style>
