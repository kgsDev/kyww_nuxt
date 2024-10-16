<!-- PhotoUpload.vue -->
<template>
  <h3 class="text-md mb-2">Photos:</h3>
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

    <!-- New field for uploading a PDF or image of the sample form -->
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
const fields = ['upstream', 'downstream', 'other']
const files = reactive({})
const fileRefs = reactive({})
const sampleFormFile = ref(null)
const sampleFormRef = ref(null)

const emit = defineEmits(['filesSelected'])

const handleFileChange = (field) => {
  files[field] = fileRefs[field].files[0]
  emitFiles()
}

const handleSampleFormChange = () => {
  sampleFormFile.value = sampleFormRef.value.files[0]
  emitFiles()
}

const emitFiles = () => {
  const photoCount = Object.keys(files).filter(field => files[field] !== undefined).length
  const formAdded = !!sampleFormFile.value
  emit('filesSelected', { 
    files: { ...files },  // Spread the files object
    sampleFormFile: sampleFormFile.value, 
    photoCount, 
    formAdded 
  })
}

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const getFiles = () => files

defineExpose({ getFiles })
</script>