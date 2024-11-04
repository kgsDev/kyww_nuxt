<template>
  <h3 class="text-md mb-2">Photos / Sample Form:</h3>
  <div class="space-y-4 text-sm">
    <div v-for="field in fields" :key="field">
      <label :for="field">{{ capitalizeFirstLetter(field) }} Image (10 MB limit):</label>
      <input
        type="file"
        :id="field"
        :ref="el => { if (el) fileRefs[field] = el }"
        @change="handleFileChange(field)"
        accept="image/*"
        required
      >
    </div>
    
    <div>
      <label for="sampleForm">Upload Sample Form<br>(PDF/Image, 10 MB limit):</label>
      <input
        type="file"
        id="sampleForm"
        ref="sampleFormRef"
        @change="handleSampleFormChange"
        accept="application/pdf,image/*"
      >
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