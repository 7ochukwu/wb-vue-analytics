<template>
  <div class="container">
    <div class="left-container">
      <div class="prod-btn-cont">
        <h3>Товары</h3>
        <div class="prod-buttons">
          <!-- Создание кнопок на основе данных о продуктах -->
          <button v-for="product in products" :key="product.ProductID"
                  @click="changeProductId(product.ProductID, product.ProductName)">
            {{ product.ProductName }}
          </button>
        </div>
      </div>
      <VueDatePicker
          class="calendar"
          v-model="date"
          :inline="{ input: true }"
          text-input
          auto-apply
          range
          multi-calendars
          vertical
          :preset-dates="presetDates"
          :model-value="date"
          @update:model-value="handleDate"
      >
        <template #preset-date-range-button="{ label, value, presetDate }">
        <span
            role="button"
            :tabindex="0"
            @click="presetDate(value)"
            @keyup.enter.prevent="presetDate(value)"
            @keyup.space.prevent="presetDate(value)">
          {{ label }}
        </span>
        </template>
      </VueDatePicker>
      <div class="warehouses-btn-cont">
        <h3>Склады</h3>
        <div class="prod-buttons warehouse_btn">
          <!-- Добавляем кнопки для выбора ProductID -->
          <button @click="changeProductId(66, 'REZ-black')">Тула</button>
          <button @click="changeProductId(68, 'REZ-moon')">Казань</button>
          <button @click="changeProductId(63, 'SOC-teen')">Невинномысск</button>
          <button @click="changeProductId(63, 'SOC-teen')">Краснодар</button>
        </div>
      </div>

    </div>
    <div class="main-container">
      <div class="prod-charts-wrapper">
        <h2 class="title-charts-container">Остатки <span>{{ selectedTitle }}</span></h2>
        <!-- Передача параметров в chartjs.vue -->
        <chartjs :productId="selectedProductId" :warehouseId="48"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Москва'" :startDate="startDate"
                 :endDate="endDate"/>
        <chartjs :productId="selectedProductId" :warehouseId="46"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Казань'" :startDate="startDate"
                 :endDate="endDate"/>
        <chartjs :productId="selectedProductId" :warehouseId="'43,49'"
                 :key="selectedProductId + '-' + startDate + '-' + endDate" :label="'Юг'" :startDate="startDate"
                 :endDate="endDate"/>
      </div>
      <div class="prod-charts-wrapper">
        <h2 class="title-charts-container">Склады</h2>
        <p>какой то текст</p>
      </div>
    </div>
    <div class="right-container">
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import {ref, onMounted} from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import chartjs from './components/chartjs.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  addMonths
} from 'date-fns';

const selectedProductId = ref(51); // Изначальное значение ProductID
const selectedTitle = ref('REZ-black'); // Реактивная переменная для заголовка
const date = ref('');
const startDate = ref('');
const endDate = ref('');
const presetDates = ref([
  {
    label: 'сегодня',
    value: [new Date(), new Date()]
  },
  /*  {
      label: 'месяц',
      value: [startOfMonth(new Date()), new Date()]
    },*/
  {
    label: '30 дней',
    value: [startOfDay(subDays(new Date(), 29)), endOfDay(new Date())]
  },
  {
    label: 'квартал',
    value: [startOfDay(subDays(new Date(), 90)), endOfDay(new Date())]
  },
  {
    label: 'полугодие',
    value: [startOfDay(subDays(new Date(), 180)), endOfDay(new Date())]
  },
  {
    label: 'год',
    value: [startOfDay(subDays(new Date(), 365)), endOfDay(new Date())]
  }
]);

// Реактивные переменные для хранения данных о продуктах
const products = ref([]);

// Выполнение запроса к серверу при монтировании компонента
onMounted(() => {
  axios.get('http://127.0.0.1:8000/api/products')
      .then(response => {
        // Обновление данных о продуктах
        products.value = response.data;
      })
      .catch(error => {
        console.error('Ошибка при получении данных о продуктах:', error);
      });
});

// Метод для изменения выбранного ProductID и обновления данных для всех диаграмм
const changeProductId = (productId, title) => {
  selectedProductId.value = productId;
  selectedTitle.value = title; // Установка заголовка при нажатии на кнопку
};

const handleDate = (selectedDates) => {
  // Преобразование даты начала периода
  startDate.value = new Date(selectedDates[0]).toISOString().split('T')[0];

  // Преобразование даты конца периода
  endDate.value = new Date(selectedDates[1]).toISOString().split('T')[0];
};

</script>

<style scoped>
/* Ваши стили */
</style>
