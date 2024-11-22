<template>
  <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
    <h3 class="text-lg font-bold mb-3 text-blue-800">Photos & Sample Form</h3>
    
    <!-- Sample Form Upload - Most Prominent -->
    <div class="mb-6">
      <label for="sampleForm" class="block mb-2 font-bold text-emerald-800 text-sm">
        Upload Sample Form<br>(PDF/Image, 10 MB limit):
      </label>
      <div class="relative">
        <input
          type="file"
          id="sampleForm"
          :ref="(el) => sampleFormRef = el"
          @change="handleSampleFormChange"
          accept="application/pdf,image/*"
          class="hidden"
        />
        <label
          for="sampleForm"
          class="flex items-center justify-center w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-xl"
        >
          <i class="fas fa-file-upload text-xl mr-2"></i>
          <span class="text-base font-bold">Click to Upload Sample Form</span>
        </label>
      </div>
    </div>

    <!-- Photo Uploads -->
    <div class="space-y-4">
      <div v-for="field in fields" :key="field" class="bg-white p-3 rounded-lg shadow-sm">
        <label :for="field" class="block mb-2 font-semibold text-gray-700 text-sm">
          {{ capitalizeFirstLetter(field) }} Image (10 MB limit):
        </label>
        <div class="relative">
          <input
            type="file"
            :id="field"
            :ref="(el) => { if (el) fileRefs[field] = el }"
            @change="handleFileChange(field)"
            accept="image/*"
            required
            class="hidden"
          />
          <label
            :for="field"
            class="flex items-center justify-center w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg"
          >
            <i class="fas fa-camera text-lg mr-2"></i>
            <span class="font-semibold text-sm">Upload {{ capitalizeFirstLetter(field) }} Photo</span>
          </label>
        </div>
      </div>
    </div>

    <!-- File Preview Area -->
    <div class="mt-4 space-y-1">
      <div v-if="sampleFormFile" class="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 p-2 rounded">
        <div class="flex items-center">
          <i class="fas fa-check-circle mr-2"></i>
          <span>Sample Form: {{ sampleFormFile.name }}</span>
        </div>
        <button 
          @click="deleteFile('sampleForm')" 
          class="text-red-500 hover:text-red-700 p-1"
          title="Remove file"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div 
        v-for="(file, field) in files" 
        :key="field" 
        class="flex items-center justify-between text-xs text-blue-700 bg-blue-50 p-2 rounded"
      >
        <div class="flex items-center">
          <i class="fas fa-check-circle mr-2"></i>
          <span>{{ capitalizeFirstLetter(field) }} Photo: {{ file.name }}</span>
        </div>
        <button 
          @click="deleteFile(field)" 
          class="text-red-500 hover:text-red-700 p-1"
          title="Remove file"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const toast = useToast();
const fields = ['upstream', 'downstream', 'other'];
const files = reactive({});
const fileRefs = reactive({});
const sampleFormFile = ref(null);
const sampleFormRef = ref(null);

const emit = defineEmits(['filesSelected']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds 10 MB limit.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    if (file.type === 'application/octet-stream') {
      // For 'application/octet-stream', check the file extension
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(extension)) {
        return { isValid: false, error: 'Unsupported file type. Allowed types are JPEG, PNG, GIF, and PDF.' };
      }
    } else {
      return { isValid: false, error: 'Unsupported file type. Allowed types are JPEG, PNG, GIF, and PDF.' };
    }
  }

  return { isValid: true };
};

const deleteFile = (field) => {
  if (field === 'sampleForm') {
    sampleFormFile.value = null;
    if (sampleFormRef.value) {
      sampleFormRef.value.value = ''; // Clear the file input
    }
  } else {
    delete files[field];
    if (fileRefs[field]) {
      fileRefs[field].value = ''; // Clear the file input
    }
  }
  emitFiles(); // Notify parent component of the change
  
  // Show toast notification
  toast.add({ 
    title: 'File Removed', 
    description: `${field === 'sampleForm' ? 'Sample form' : capitalizeFirstLetter(field) + ' photo'} has been removed.`,
    color: 'blue'
  });
};

const handleFileChange = (field) => {
  const file = fileRefs[field].files[0];
  if (file) {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.add({ title: 'File Error', description: `${capitalizeFirstLetter(field)} image: ${validation.error}`, color: 'red' });
      fileRefs[field].value = ''; // Clear the file input
    } else {
      files[field] = file;
      emitFiles();
    }
  }
};

const handleSampleFormChange = () => {
  const file = sampleFormRef.value.files[0];
  if (file) {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.add({ title: 'File Error', description: `Sample form file: ${validation.error}`, color: 'red' });
      sampleFormRef.value.value = ''; // Clear the file input
    } else {
      sampleFormFile.value = file;
      emitFiles();
    }
  }
};

const emitFiles = () => {
  const photoCount = Object.keys(files).filter(field => files[field] !== undefined).length;
  const formAdded = !!sampleFormFile.value;
  emit('filesSelected', {
    files: { ...files },
    sampleFormFile: sampleFormFile.value,
    photoCount,
    formAdded
  });
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const getFiles = () => files;

defineExpose({ getFiles });
</script>

<style scoped>
.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Optional: Add animation for hover states */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Optional: Add scale effect on hover */
label:hover {
  transform: translateY(-1px);
}

button {
  transition: all 0.2s ease-in-out;
}

button:hover {
  transform: scale(1.1);
}
</style>