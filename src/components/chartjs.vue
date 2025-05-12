<script setup>
import {onMounted, defineProps, ref} from 'vue';
import Chart from 'chart.js/auto';
import axios from 'axios';
import 'chartjs-adapter-date-fns';
import {ru} from 'date-fns/locale';
import annotationPlugin from 'chartjs-plugin-annotation';
Chart.register(annotationPlugin);

const {
  productId,
  warehouseId,
  label,
  startDate,
  endDate
} = defineProps(['productId', 'warehouseId', 'label', 'startDate', 'endDate']);

const barChartCanvas = ref(null);
const lastInventoryValue = ref(0);
const quantityDiff = ref(0);
const stocks = ref([]);
const inTransits = ref([]);
const agentsData = ref([]);

const calculateAccumulation = (data) => {
  const groupedByDate = data.reduce((acc, item) => {
    acc[item.date] = acc[item.date] || { quantity: 0, orders: 0 };
    acc[item.date].quantity += item.quantity;
    acc[item.date].orders += item.orders; // Здесь изменение: использование item.orders вместо item.turnover
    return acc;
  }, {});

  return Object.keys(groupedByDate).map(date => {
    const { quantity, orders } = groupedByDate[date];
    return {
      date,
      accumulation: orders !== 0 ? quantity / orders : 0
    };
  });
};





onMounted(() => {
  fetchInventoryData();
});

const fetchInventoryData = () => {
  axios.get(`https://rest.well-good.ru/api/public/api/inventory?ProductID=${productId}&WarehouseID=${warehouseId}&startDate=${startDate}&endDate=${endDate}`)
      .then((response) => {
        const inventoryData = response.data.map(item => ({
          date: item.InventoryDate,
          turnover: item.Turnover,
          quantity: item.Quantity,
          realPrice: Math.round(item.AvgPrice * (1 - item.AvgDiscount / 100)),
          warehouse: item.WarehouseID,
          warehouseName: item.WarehouseName,
          dataFromAgents: Array.isArray(item.DataFromAgents) ? item.DataFromAgents : [],
          orders: item.Orders !== null ? item.Orders : 0, // Присваиваем 0, если Orders равен null
        }));


        const accumulationData = calculateAccumulation(inventoryData);

        // Обновленный вызов renderBarChart с передачей accumulationData
        renderBarChart(inventoryData, accumulationData);

        // Остальной код без изменений
        const groupedByDate = inventoryData.reduce((acc, item) => {
          acc[item.date] = acc[item.date] || [];
          acc[item.date].push(item);
          return acc;
        }, {});

        const sumByDate = {};
        Object.keys(groupedByDate).forEach(date => {
          sumByDate[date] = groupedByDate[date].reduce((sum, item) => sum + parseInt(item.quantity, 10), 0);
        });

        const sortedDates = Object.keys(sumByDate).sort();
        const lastDate = sortedDates.pop();
        const previousDate = sortedDates.pop();

        const lastInventoryTotal = sumByDate[lastDate] || 0;
        const previousInventoryTotal = sumByDate[previousDate] || 0;

        const inventoryDifference = lastInventoryTotal - previousInventoryTotal;

        const latestDate = inventoryData.reduce((latest, item) => item.date > latest ? item.date : latest, inventoryData[0].date);

        const latestData = inventoryData.filter(item => item.date === latestDate);

        agentsData.value = latestData.map(data => data.dataFromAgents).flat();

        lastInventoryValue.value = lastInventoryTotal;
        quantityDiff.value = inventoryDifference;

      })
      .catch((error) => {
        console.error('Ошибка при получении данных о запасах:', error);
      });
  if (warehouseId === 'all') {
    axios.get(`https://rest.well-good.ru/api/public/api/inventory?ProductID=${productId}&WarehouseID=home&startDate=${startDate}`)
        .then(response => {
          const latestEntries = {};
          response.data.forEach(item => {
            if (!latestEntries[item.WarehouseName] || new Date(item.InventoryDate) > new Date(latestEntries[item.WarehouseName].date)) {
              latestEntries[item.WarehouseName] = {
                date: item.InventoryDate,
                warehouse: item.WarehouseName,
                stock: item.stock,
                inTransit: item.inTransit
              };
            }
          });
          if (Object.keys(latestEntries).length > 0) {
            stocks.value = Object.values(latestEntries);
            inTransits.value = Object.values(latestEntries);
          } else {
            console.warn('Данные о запасах на складах не получены.');
          }
        })
        .catch(error => {
          console.error('Ошибка при получении данных о stock и inTransit:', error);
        });
  }
};


const renderBarChart = (inventoryData, accumulationData = []) => {
  const canvas = barChartCanvas.value;
  if (!canvas) {
    console.error('Элемент canvas не найден');
    return;
  }

  const warehouseData = {};
  const labelData = [];
  const avgRealPriceData = []; // Массив для реальной цены

  inventoryData.forEach(item => {
    const {warehouse, quantity, date, warehouseName, realPrice} = item;

    // Добавляем данные о реальной цене в массив
    avgRealPriceData.push({x: date, y: realPrice});

    if (!warehouseData[warehouse]) {
      warehouseData[warehouse] = {
        warehouseName: warehouseName, // Добавляем название склада
        data: [],
        backgroundColor: `rgba(1, 105, 204, ${(0.6 - Object.keys(warehouseData).length * 0.3)})`,
        stacked: true,
        parsing: false
      };
    }
    warehouseData[warehouse].data.push({x: date, y: quantity}); // Сохраняем дату и значение

    if (!labelData.includes(date)) {
      labelData.push(date);
    }
  });

  // Проверяем наличие значений на каждую дату и устанавливаем 0, если значения нет
  Object.keys(warehouseData).forEach(warehouse => {
    labelData.forEach(date => {
      const dataPoint = warehouseData[warehouse].data.find(data => data.x === date);
      if (!dataPoint) {
        warehouseData[warehouse].data.push({x: date, y: 0});
      }
    });
    // Получаем только значения для графика
    warehouseData[warehouse].data = warehouseData[warehouse].data.map(data => data.y);
  });

  const interpolateColor = (color1, color2, factor) => {
    const c1 = color1.match(/\w\w/g).map((hex) => parseInt(hex, 16));
    const c2 = color2.match(/\w\w/g).map((hex) => parseInt(hex, 16));
    const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * factor));
    return `rgb(${result.join(", ")})`;
  };

  const datasets = Object.keys(warehouseData).map((warehouse, index) => {
    const totalWarehouses = Object.keys(warehouseData).length;

    // Устанавливаем градиент только в пределах синего цвета
    const startColor = "#7aa2cc"; // Светло-голубой
    const endColor = "#2253b4"; // Насыщенно-синий

    // Плавное распределение цвета
    const factor = index / Math.max(totalWarehouses - 1, 1); // Защита от деления на 0
    const color = interpolateColor(startColor, endColor, factor);

    // Минимальная и максимальная прозрачность
    const minAlpha = 0.3; // Достаточная видимость при наложении
    const maxAlpha = 0.5; // Более насыщенные цвета
    const alphaStep = (maxAlpha - minAlpha) / Math.max(totalWarehouses - 1, 1);
    const alpha = minAlpha + index * alphaStep; // Увеличение прозрачности

    return {
      label: warehouseData[warehouse].warehouseName,
      data: warehouseData[warehouse].data,
      backgroundColor: color.replace("rgb", "rgba").replace(")", `, ${alpha.toFixed(2)})`),
      stacked: true,
    };
  });



  // Добавляем новый набор данных для Turnover
  datasets.push({
    borderWidth: 3,
    borderColor: 'rgba(255,182,106,0.88)',
    label: 'Накопление',
    yAxisID: 'turnoverAxis',
    pointStyle: false,
    type: 'line', // Указываем тип линейного графика
    data: accumulationData.map(data => data.accumulation),
    stack: 'Stack 1',
    tension: 0.6, // Натяжение кривой
    spanGaps: true,
    pointRadius: 0,
    stepped: 'before',
  });

  // Аннотации
  const annotations = {
    line1: {
      type: 'line',
      drawTime: 'afterDatasetsDraw', // После отрисовки данных
      scaleID: 'turnoverAxis', // Используем идентификатор оси Y для накопления
      value: 20, // Значение Y, где должна быть аннотация
      borderColor: 'rgba(110,110,110,0.38)',
      borderWidth: 1,
      label: {
        content: 'Annotation',
        enabled: true,
      },
    },
  };


  const findMinPositiveValue = (data) => {
    let minPositiveValue = Infinity;
    for (const item of data) {
      if (item.y > 0 && item.y < minPositiveValue) {
        minPositiveValue = item.y;
      }
    }
    return minPositiveValue;
  };

  // Находим минимальное положительное значение средней цены, исключая нули
  let minPositiveAvgPrice = findMinPositiveValue(avgRealPriceData);
  // Добавляем к минимальному положительному значению небольшое смещение
  const minAvgPrice = minPositiveAvgPrice === Infinity ? 0 : minPositiveAvgPrice * 0.95; // Можно настроить коэффициент смещения по вашему усмотрению

  if (warehouseId === 'all') {
    // Добавляем новый набор данных для средней цены
    datasets.push({
      label: 'цена',
      data: avgRealPriceData.map(data => data.y),
      fill: false,
      borderColor: 'rgba(0,0,0,0.18)', // Оранжевый цвет линии
      tension: 0.4, // Натяжение кривой
      type: 'line', // Указываем тип линейного графика
      yAxisID: 'avgPriceAxis', // Идентификатор оси Y для средней цены
      pointStyle: false,
      stepped: 'before',
      spanGaps: true,
      pointRadius: 0
    });
  }

  const data = {
    labels: labelData,
    datasets: datasets,
    parsing: false,
    spanGaps: true
  };

  const options = {
    pointRadius: 0,
    spanGaps: true,
    normalized: true,
    animation: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        parsing: false
      },
      annotation: {
        annotations: annotations
      }
    },
    responsive: true,
    scales: {
      y: {
        display: false,
        type: 'linear',
        stacked: true,
        parsing: false,
        grid: {
          display: true
        },
        ticks: {
          stepSize: 50, beginAtZero: true
        }
      },
      avgPriceAxis: { // Ось Y для средней цены
        position: 'right', // Позиция оси
        display: false,
        parsing: false,
        grid: {
          display: false // Отключаем отображение сетки для оси средней цены
        },
        min: minAvgPrice,
      },
      turnoverAxis: { // Ось Y для средней цены
        position: 'left', // Позиция оси
        display: true,
        grid: {
          display: false // Отключаем отображение сетки для оси средней цены
        },
        max: 60,
        parsing: false,
        responsive: true,
        scales: {
          y: {
            suggestedMin: 0,
            suggestedMax: 0,
          }
        }

      },
      x: {
        display: false,
        align: 'end',
        stacked: true,
        type: 'time',
        parsing: false,
        ticks: {
          beginAtZero: true
        },
        adapters: {
          date: {
            locale: ru
          }
        },
        time: {
          tooltipFormat: 'd MM, y', stepSize: 1, unit: 'month', minUnit: 'month',
          displayFormats: {
            day: 'MMM YYYY'
          },
        },
        scaleLabel: {
          display: false,
        },
        grid: {
          display: true, color: 'rgba(0, 0, 0, 0.1)', // цвет линий
        }
      }
    },
    interaction: {
      mode: 'x', intersect: false,
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: data,
    parsing: false,
    options: options
  });
};


</script>

<template>
  <div class="chart-container">
    <h3 :style="{ textDecoration: /^(REZ|LIE|SOC)/.test(label) ? 'underline' : 'initial' }">{{ label }}</h3>
    <div>
      <canvas ref="barChartCanvas" :style="{ background: lastInventoryValue <= 10 ? '#ff00001a' : '' }"
              style="position: relative; height:16vh; width:40vw"></canvas>
    </div>
    <div class="right-side-info">
      <div class="inventory-value">
        wb {{ lastInventoryValue }}
        <span v-if="quantityDiff !== 0">{{ quantityDiff }}</span>
      </div>
      <!-- Отображение информации о складах -->
      <div class="in_row">
        <p class="home-stocks" v-for="(stock, index) in stocks" :key="stock.warehouse">
          {{ stock.warehouse }} {{ stock.stock }}
          <span>{{ stock.inTransit }}</span>
          <!-- Добавляем разделительный элемент только между элементами -->
          <template v-if="index < stocks.length - 1">
            <span class="spacer">|</span>
          </template>
        </p>
      </div>
      <!-- Отображение информации о перемещениях только для последней даты -->
      <div class="home-stocks" v-for="agent in agentsData" :key="agent.FromWarehouseName">
        <p>{{ agent.QuantityFrom }} ← {{ agent.FromWarehouseName }}</p>
      </div>

    </div>
  </div>
</template>