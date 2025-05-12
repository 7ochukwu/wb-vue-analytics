<template>
  <div class="container">
    <div class="left-container">
      <div class="prod-btn-cont left-side-widgets">
        <h3>Остатки по складам</h3>
        <div class="prod-buttons">
          <!-- Создание кнопок на основе данных о продуктах -->
          <button v-for="product in products" :key="product.ProductID"
                  @click="handleProductClick(product.ProductID, product.ProductName)"
                  :style="{ backgroundColor: /^(REZ|LIE|SOC|CAP|SUE)/.test(product.ProductName) ? '#ceffae' : 'initial' }">
            {{ product.ProductName }}
          </button>
        </div>
      </div>
      <VueDatePicker class="calendar" v-model="date" :inline="{ input: true }" text-input auto-apply range multi-calendars vertical :preset-dates="presetDates" :model-value="date" @update:model-value="handleDate">
        <template #preset-date-range-button="{ label, value, presetDate }">
        <span role="button" :tabindex="0" @click="presetDate(value)" @keyup.enter.prevent="presetDate(value)" @keyup.space.prevent="presetDate(value)">
          {{ label }}</span>
        </template>
      </VueDatePicker>
      <div class="warehouses-btn-cont left-side-widgets">
        <h3>Регион</h3>
        <div class="prod-buttons warehouse_btn">
          <button @click="toggleWarehouse('48,45', 'Остатки | Центральный регион')">Центр</button>
          <button @click="toggleWarehouse(46, 'Остатки | Казанский регион')">Казань</button>
          <button @click="toggleWarehouse('49,43', 'Остатки | Южный регион')">Юг</button>

        </div>
      </div>
      <div class="warehouses-btn-cont left-side-widgets">
        <h3>Склад</h3>
        <div class="prod-buttons warehouse_btn">
          <button @click="toggleWarehouse('all', 'Остатки | Суммарно')">Все</button>
          <button @click="toggleWarehouse(48, 'Остатки | Тула')">Тула</button>
          <button @click="toggleWarehouse(45, 'Остатки | Электросталь')">Электросталь</button>
          <button @click="toggleWarehouse(46, 'Остатки | Казань')">Казань</button>
        </div>
      </div>

    </div>
    <div class="main-container">
      <div v-if="showCharts" class="prod-charts-wrapper">
        <h2 class="title-charts-container">Остатки <span>{{ selectedTitle }}</span></h2>
        <!-- Передача параметров в chartjs.vue -->
        <chartjs :productId="selectedProductId" :warehouseId="'all'"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="''" :startDate="startDate"
                 :endDate="endDate"/>
        <chartjs :productId="selectedProductId" :warehouseId="'48,45,54,96'"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Центр'" :startDate="startDate"
                 :endDate="endDate"/>
        <chartjs :productId="selectedProductId" :warehouseId="46"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Казань'" :startDate="startDate"
                 :endDate="endDate"/>
        <chartjs :productId="selectedProductId" :warehouseId="'43,49'"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Юг'" :startDate="startDate"
                 :endDate="endDate"/>
      </div>
      <div v-else class="warehouse-charts-wrapper">
        <h2 class="title-charts-container">{{ selectedWarehouseTitle }}</h2>
        <chartjs v-for="product in products" :key="selectedProductIdWarehouses+ '-' + product.ProductID + '-' + selectedProductId + '-' + startDate + '-' + endDate"
                 :productId="product.ProductID" :warehouseId="selectedProductIdWarehouses"
                 :label="product.ProductName" :startDate="startDate" :endDate="endDate"/>
      </div>
    </div>
    <div class="right-container">
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ref, onMounted } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import chartjs from './components/chartjs.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import {subDays, startOfDay, endOfDay,} from 'date-fns';

const showCharts = ref(true); // Показывать ли диаграммы
const selectedProductId = ref(51); // Изначальное значение ProductID
const selectedProductIdWarehouses = ref(46);
const selectedTitle = ref('REZ-black'); // Реактивная переменная для заголовка
const selectedWarehouseTitle = ref('Центр'); // Реактивная переменная для заголовка
const date = ref('');
const startDate = ref('');
const endDate = ref('');
const products = ref([]);
const excludedProducts = ['CRA-blue', 'pink-rose', 'CRA-pink', 'CRAF-pink', 'CRAF-blue', 'BIG-sclown', 'BIG-sblack', 'CRAF-yellow', 'CRAF-white', 'BIG-sunicorn', 'BIG-semo', 'BIG-spink']; // Массив исключений
const presetDates = ref([
  {label: 'сегодня', value: [new Date(), new Date()]},
  {label: '30 дней', value: [startOfDay(subDays(new Date(), 29)), endOfDay(new Date())]},
  {label: 'квартал', value: [startOfDay(subDays(new Date(), 90)), endOfDay(new Date())]},
  {label: 'полугодие', value: [startOfDay(subDays(new Date(), 180)), endOfDay(new Date())]},
  {label: 'год', value: [startOfDay(subDays(new Date(), 365)), endOfDay(new Date())]}
]);

// Выполнение запроса к серверу при монтировании компонента
onMounted(() => {
  axios.get('https://rest.well-good.ru/api/public/api/products')
      .then(response => {
        // Фильтруем данные, исключая продукты из массива excludedProducts
        const filteredProducts = response.data.filter(product => !excludedProducts.includes(product.ProductName));
        // Обновление данных о продуктах
        products.value = filteredProducts;
      })
      .catch(error => {
        console.error('Ошибка при получении данных о продуктах:', error);
      });
});

// Метод для изменения выбранного ProductID и обновления данных для всех диаграмм
const handleProductClick = (productId, productName) => {
  selectedProductId.value = productId;
  selectedTitle.value = productName; // Устанавливаем заголовок выбранного продукта
  showCharts.value = true; // Показываем диаграммы при выборе продукта
};

const toggleWarehouse = (productId, productName) => {
  selectedProductIdWarehouses.value = productId;
  selectedWarehouseTitle.value = productName;
  if (showCharts.value) {
    showCharts.value = false;
  }
};

const handleDate = (selectedDates) => {
  // Преобразование даты начала периода
  startDate.value = new Date(selectedDates[0]).toISOString().split('T')[0];

  // Преобразование даты конца периода
  endDate.value = new Date(selectedDates[1]).toISOString().split('T')[0];
};
</script>
