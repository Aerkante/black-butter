<template>
  <q-card class="q-pa-md">
    <q-input v-model="tableFilter.search" debounce="300" filled label="Pesquisar"
             @keyup.enter="getData()"/>
    <q-table
      v-model:pagination="tablePagination"
      :columns="ReportTableCols"
      :loading="store.loading"
      :rows="data"
      :rows-per-page-options="[10, 25, 50, 100, 0]"

      row-key="id"
      title="Relatos"
      @update:pagination="getData()"
    >

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn class="q-mx-sm" color="primary"
                 dense icon="las la-edit" @click=" bus.emit('edit-report-record', props.row)"/>
          <q-btn class="q-mx-sm" color="negative"
                 dense icon="las la-trash"
                 @click="deleteModal = {open: true, id: props.row.id, name: props.row.name}"/>
        </q-td>
      </template>
      <template v-slot:body-cell-pollution="props">
        <q-td :props="props">
          <PollutionColumnComponent :report="props.row"/>
        </q-td>
      </template>
      <template v-slot:pagination="scope">
        <q-btn
          v-if="scope.pagesNumber > 2"
          :disable="scope.isFirstPage"
          color="grey-8"
          dense
          flat
          icon="first_page"
          round
          @click="scope.firstPage"
        />

        <q-btn
          :disable="scope.isFirstPage"
          color="grey-8"
          dense
          flat
          icon="chevron_left"
          round
          @click="scope.prevPage"
        />

        <q-btn
          :disable="scope.isLastPage"
          color="grey-8"
          dense
          flat
          icon="chevron_right"
          round
          @click="scope.nextPage"
        />

        <q-btn
          v-if="scope.pagesNumber > 2"
          :disable="scope.isLastPage"
          color="grey-8"
          dense
          flat
          icon="last_page"
          round
          @click="scope.lastPage"
        />
      </template>
    </q-table>
    <q-dialog v-model="deleteModal.open">
      <q-card>
        <q-card-section>
          Tem certeza que deseja excluir o dado {{ deleteModal.name }}?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="negative" label="Cancelar" @click="deleteModal = {open: false, id: 0, name: ''}"/>
          <q-btn color="primary" label="Sim" @click="destroy()"/>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script lang="ts" setup>
import {useReportStore} from 'src/stores';
import {computed, inject, ref, watch,} from 'vue';
import {Report, ReportTableCols} from 'src/models';
import {EventBus, QTable} from 'quasar';
import {useNotifier} from 'src/utils';
import PollutionColumnComponent from 'components/PollutionColumnComponent.vue';

const bus = inject('bus') as EventBus;
const store = useReportStore()
const deleteModal = ref({open: false, id: 0, name: ''})
const notify = useNotifier()
const tablePagination = ref({
    page: 1,
    rowsPerPage: 10,
    descending: false,
    sortBy: 'id'
  }
)
const tableFilter = ref({
    search: '',
    status: ''
  }
)

const data = computed<Report[]>(() => {
  return useReportStore().all
})

const getData = async () => {
  try {
    store.loading = true
    await store.fetch({
      pagination: tablePagination.value,
      filter: tableFilter.value
    })
  } catch (e) {
    console.error(e)
    notify.error('Erro ao buscar dados')
  } finally {
    store.loading = false
  }

}

const destroy = async () => {
  try {
    store.loading = true
    await store.delete(deleteModal.value.id)
    deleteModal.value = {open: false, id: 0, name: ''}
    notify.success('Removido com sucesso')
    await getData()
    bus.emit('deleted-record')
  } catch (e) {
    console.error(e)
    notify.error('Erro ao deletar dados. Contate o administrador. Error: ' + (e as unknown as
      {
        message: unknown
      }).message)
  } finally {
    store.loading = false
  }
}

bus.on('new-report-record', () => getData())
getData()

watch(
  () => tableFilter.value.search,
  () => getData()
)


</script>
