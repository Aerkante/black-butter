<template>
  <q-select v-model="value" :disable="store.loading" :loading="store.loading" :options="data" emit-value label="Bairro"
            map-options
            option-label="name"
            option-value="name"
            outlined>
    <template v-slot:no-option>
      <q-item>
        <q-input v-model="listFilter.search" class="full-width" debounce="300" filled label="Pesquisar"/>
      </q-item>
      <q-item>
        <q-item-section class="text-grey">
          Nenhum resultado encontrado
        </q-item-section>
      </q-item>
    </template>
    <template v-slot:before-options>
      <q-input v-model="listFilter.search" debounce="300" filled label="Pesquisar"/>
    </template>
  </q-select>
</template>

<script lang="ts" setup>
import {useDistrictStore} from 'src/stores';
import {computed, ref, watch,} from 'vue';
import {District} from 'src/models';
import {useNotifier} from 'src/utils';

const props = defineProps({
  modelValue: {type: String}
})

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

const store = useDistrictStore()
const notify = useNotifier()

const listPagination = ref({
    descending: false,
    sortBy: 'id'
  }
)
const listFilter = ref({
    search: '',
    status: '',
    zone: useDistrictStore().filter.zone
  }
)

const data = computed<District[]>(() => {
  return useDistrictStore().list
})

const getData = async () => {
  try {
    store.loading = true
    await store.selectList({
      pagination: listPagination.value,
      filter: listFilter.value
    })
  } catch (e) {
    console.error(e)
    notify.error('Erro ao buscar dados')
  } finally {
    store.loading = false
  }

}

getData()

watch(
  () => listFilter.value.search,
  () => getData()
)
watch(
  () => store.filter.zone,
  () => {
    listFilter.value.zone = store.filter.zone
    getData()
  }
)

</script>
