<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const inputValue = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue;
});

const handleIncrement = () => {
  const currentValue = inputValue.value;
  const newValue = currentValue === null || currentValue === undefined ? 0 : currentValue + 1;
  inputValue.value = newValue;
  emit('update:modelValue', newValue);
};

const handleDecrement = () => {
  const currentValue = inputValue.value;
  if (currentValue === null || currentValue === undefined || currentValue <= 0) return;
  inputValue.value = currentValue - 1;
  emit('update:modelValue', currentValue - 1);
};

const handleInput = (event) => {
  const value = event.target.value;
  if (value === '') {
    inputValue.value = null;
    emit('update:modelValue', null);
    return;
  }
  
  const numValue = parseInt(value);
  if (!isNaN(numValue) && numValue >= 0) {
    inputValue.value = numValue;
    emit('update:modelValue', numValue);
  }
};
</script>

<template>
  <div class="custom-number-input relative h-8">
    <div class="flex h-full">
      <!-- Icon if provided -->
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-2.5 flex items-center">
        <UIcon :name="icon" class="text-gray-500 w-4 h-4" />
      </div>
      
      <!-- Input field -->
      <input
        type="number"
        :value="inputValue"
        @input="handleInput"
        min="0"
        :required="required"
        :placeholder="placeholder"
        :class="{
          'pl-8': icon, // Add padding when icon is present
          'pl-3': !icon  // Normal padding when no icon
        }"
        class="w-full py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      
      <!-- Increment/Decrement buttons -->
      <div class="absolute inset-y-0 right-0 flex flex-col border-l border-gray-300">
        <button
          type="button"
          @click="handleIncrement"
          class="flex-1 px-1.5 hover:bg-gray-200 focus:outline-none text-xs leading-none h-[10px]"
        >
          ▲
        </button>
        <button
          type="button"
          @click="handleDecrement"
          class="flex-1 px-1.5 hover:bg-gray-200 focus:outline-none text-xs leading-none h-[10px] border-t border-gray-200"
          :disabled="!inputValue || inputValue <= 0"
        >
          ▼
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-number-input input::-webkit-outer-spin-button,
.custom-number-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.custom-number-input input[type=number] {
  -moz-appearance: textfield;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Adjust input height to match UInput */
input {
  height: 100%;
}

/* Make sure the input text doesn't overlap with the buttons */
input {
  padding-right: 20px;
}
</style>