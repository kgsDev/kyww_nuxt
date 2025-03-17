<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  xAxisKey: {
    type: String,
    required: true
  },
  yAxisSeries: {
    type: Array,
    required: true,
    // Each item should have { key, name, color }
  },
  height: {
    type: Number,
    default: 300
  }
});

const chartContainer = ref(null);
let chart = null;

const createChart = () => {
  if (!chartContainer.value) return;
  
  // Clear any existing chart
  if (chart) {
    chart.destroy();
  }
  
  const ctx = chartContainer.value.getContext('2d');
  
  // Prepare datasets
  const datasets = props.yAxisSeries.map((series, index) => {
    return {
      label: series.name,
      data: props.data.map(item => item[series.key]),
      backgroundColor: getBgColor(series.color, index),
      borderColor: getBorderColor(series.color),
      borderWidth: 1,
      categoryPercentage: 0.8,
      barPercentage: 0.7
    };
  });
  
  // Create the chart
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: props.data.map(item => item[props.xAxisKey]),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f0f0f0'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  });
};

// Helper function to get background colors with opacity
const getBgColor = (color, index) => {
  const colors = {
    blue: 'rgba(59, 130, 246, 0.7)',
    green: 'rgba(16, 185, 129, 0.7)',
    red: 'rgba(239, 68, 68, 0.7)',
    yellow: 'rgba(245, 158, 11, 0.7)',
    purple: 'rgba(139, 92, 246, 0.7)',
    orange: 'rgba(249, 115, 22, 0.7)',
    indigo: 'rgba(99, 102, 241, 0.7)',
    pink: 'rgba(236, 72, 153, 0.7)'
  };
  
  // Use color name if available, otherwise use index-based fallback
  return colors[color] || Object.values(colors)[index % Object.values(colors).length];
};

// Helper function to get border colors
const getBorderColor = (color) => {
  const colors = {
    blue: 'rgba(59, 130, 246, 1)',
    green: 'rgba(16, 185, 129, 1)',
    red: 'rgba(239, 68, 68, 1)',
    yellow: 'rgba(245, 158, 11, 1)',
    purple: 'rgba(139, 92, 246, 1)',
    orange: 'rgba(249, 115, 22, 1)',
    indigo: 'rgba(99, 102, 241, 1)',
    pink: 'rgba(236, 72, 153, 1)'
  };
  
  return colors[color] || '#666';
};

// Initialize chart on mount
onMounted(() => {
  // We need to import Chart.js dynamically
  import('chart.js').then(() => {
    // Wait a tick for the DOM to be ready
    setTimeout(() => {
      createChart();
    }, 0);
  });
});

// Recreate chart when data changes
watch(() => [props.data, props.yAxisSeries], () => {
  // Using nextTick to ensure DOM is updated
  nextTick(() => {
    createChart();
  });
}, { deep: true });

// Clean up on unmount
onUnmounted(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>

<template>
  <div :style="`height: ${height}px;`">
    <canvas ref="chartContainer"></canvas>
  </div>
</template>