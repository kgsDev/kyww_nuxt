<template>
  <div ref="uploadComponent">
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
              :ref="(el) => setFileRef(field, el)"
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
      <div class="mt-4 space-y-2">
        <!-- Existing Form File -->
        <div v-if="existingFormFile" 
            class="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 p-2 rounded">
          <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <div class="flex flex-col">
              <span>Existing Sample Form</span>
              <span class="text-gray-600">Original name: {{ existingFormFile.origPhotoName || 'Not available' }}</span>
              <span class="text-gray-600">Stored as: form_{{ existingFormFile.sample_id }}.{{ existingFormFile.file_path?.split('.').pop() || 'pdf' }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <a :href="existingFormFile.url" 
              target="_blank" 
              class="text-blue-500 hover:text-blue-700 p-1" 
              title="View file">
              <i class="fas fa-eye"></i>
            </a>
            <button 
              @click="confirmDelete('form')"
              class="text-red-500 hover:text-red-700 p-1" 
              title="Delete form">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- New Sample Form File -->
        <div v-if="sampleFormFile" 
            class="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 p-2 rounded">
          <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>New Sample Form: {{ sampleFormFile.name }}</span>
          </div>
          <button 
            @click="deleteFile('sampleForm')" 
            class="text-red-500 hover:text-red-700 p-1"
            title="Remove file">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Existing Photos -->
        <div v-for="(file, field) in existingFiles" 
            :key="`existing-${field}`" 
            class="flex items-center justify-between text-xs text-blue-700 bg-blue-50 p-2 rounded">
          <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <div class="flex flex-col">
              <span>Existing {{ capitalizeFirstLetter(field) }} Photo</span>
              <span class="text-gray-600">Original name: {{ file.origPhotoName || 'Not available' }}</span>
              <span class="text-gray-600">Stored as: {{ field }}_{{ file.sample_id }}.{{ file.file_path?.split('.').pop() || 'png' }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <a :href="file.url" 
              target="_blank" 
              class="text-blue-500 hover:text-blue-700 p-1" 
              title="View photo">
              <i class="fas fa-eye"></i>
            </a>
            <button 
              @click="confirmDelete(field)"
              class="text-red-500 hover:text-red-700 p-1" 
              title="Delete photo">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- New Photos -->
        <div v-for="(file, field) in files" 
            :key="`new-${field}`" 
            class="flex items-center justify-between text-xs text-blue-700 bg-blue-50 p-2 rounded">
          <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>New {{ capitalizeFirstLetter(field) }} Photo: {{ file.name }}</span>
          </div>
          <button 
            @click="deleteFile(field)" 
            class="text-red-500 hover:text-red-700 p-1"
            title="Remove file">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
  <UModal v-model="isDeleteModalOpen">
    <UCard>
      <template #header>
        <div class="text-xl font-bold text-red-600">
          Confirm Delete
        </div>
      </template>
      <div class="p-4">
        <p class="mb-4">
          Are you sure you want to delete this photo? This action cannot be undone.
        </p>
        <div class="text-sm text-gray-600">
          File: {{ fileToDelete ? capitalizeFirstLetter(fileToDelete) : '' }} Photo
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-4">
          <UButton 
            @click="isDeleteModalOpen = false"
            color="gray"
            :disabled="isLoading"
          >
            Cancel
          </UButton>
          <UButton 
            @click="deleteExistingFile"
            color="red"
            :loading="isLoading"
            :disabled="isLoading"
          >
            {{ isLoading ? 'Deleting...' : 'Delete Photo' }}
          </UButton>
        </div>
      </template>
    </UCard>
</UModal>

</template>

<script setup>
const props = defineProps({
  initialPhotos: {
    type: Array,
    default: () => []
  },
  siteId: {  // site ID prop
    type: [Number, String],
    required: true
  }
});

const isDeleteModalOpen = ref(false);
const fileToDelete = ref(null);
const isLoading = ref(false);

const uploadComponent = ref(null);
const toast = useToast();
const fields = ['upstream', 'downstream', 'other'];
const files = ref({});
const fileRefs = ref({});
const sampleFormFile = ref(null);
const sampleFormRef = ref(null);
const existingPhotos = ref([]);
const existingFiles = ref({});
const existingFormFile = ref(null);
const allFilesSelected = ref(false);
const requireOther = ref(false);

const logState = () => {
  console.log('Current component state:', {
    initialPhotos: props.initialPhotos,
    existingFormFile: existingFormFile.value,
    existingFiles: existingFiles.value,
    files: files.value
  });
};

onMounted(() => {
  fields.forEach(field => {
    if (!fileRefs.value[field]) {
      fileRefs.value[field] = null;
    }
  });
  emitFiles(); 
});

// function to handle setting refs
const setFileRef = (field, el) => {
  if (el) {
    fileRefs.value[field] = el;
  }
};

const emit = defineEmits(['filesSelected']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/jpg'];

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

const getFileInfo = (filePath) => {
  try {
    if (!filePath) return { name: 'unknown', extension: 'pdf' };
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    const [name, extension] = filename.split('.');
    return { name, extension: extension || 'pdf' };
  } catch (error) {
    console.error('Error parsing file path:', error);
    return { name: 'unknown', extension: 'pdf' };
  }
};

const deleteFile = (field) => {
  if (field === 'sampleForm') {
    sampleFormFile.value = null;
    if (sampleFormRef.value) {
      sampleFormRef.value.value = '';
    }
  } else {
    delete files.value[field];  // Now uses .value
    if (fileRefs.value[field]) {
      fileRefs.value[field].value = '';
    }
  }
  emitFiles();
  
  toast.add({ 
    title: 'File Removed', 
    description: `${field === 'sampleForm' ? 'Sample form' : capitalizeFirstLetter(field) + ' photo'} has been removed.`,
    color: 'blue'
  });
};

const confirmDelete = (field) => {
  fileToDelete.value = field;
  isDeleteModalOpen.value = true;
};

const deleteExistingFile = async () => {
  if (!fileToDelete.value) return;
  
  try {
    isLoading.value = true;
    const field = fileToDelete.value;
    const route = useRoute();
    const sampleId = route.query.edit;

    if (!sampleId) {
      throw new Error('Sample ID not found');
    }

    // Delete from database first
    await useDirectus(
      deleteItems('lu_sample_photos', {
        filter: {
          sample_id: { _eq: sampleId },
          type: { _eq: field }
        }
      })
    );

    // Then delete the file from disk
    const response = await fetch('/api/delete-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleId,
        siteId: props.siteId,
        fileType: field,
        formType: 'base'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    // Remove from existingFiles
    if (field === 'form') {
      existingFormFile.value = null;
    } else {
      delete existingFiles.value[field];
    }
    
    emitFiles();
    
    toast.add({ 
      title: 'Success', 
      description: `${field === 'form' ? 'Sample form' : capitalizeFirstLetter(field) + ' photo'} has been deleted.`,
      color: 'green'
    });

    isDeleteModalOpen.value = false;
    fileToDelete.value = null;

  } catch (error) {
    console.error('Error deleting file:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to delete file. Please try again.',
      color: 'red'
    });
  } finally {
    isLoading.value = false;
  }
};

const handleFileChange = (field) => {
  const fileInput = fileRefs.value[field];
  
  if (!fileInput || !fileInput.files) {
    return;
  }
  
  const file = fileInput.files[0];
  if (file) {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.add({ 
        title: 'File Error', 
        description: `${capitalizeFirstLetter(field)} image: ${validation.error}`, 
        color: 'red' 
      });
      fileInput.value = '';
    } else {
      files.value = {
        ...files.value,
        [field]: {
          file,
          name: file.name,
          type: field
        }
      };
      emitFiles();
    }
  }
};

const handleSampleFormChange = () => {
  const file = sampleFormRef.value.files[0];
  if (file) {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.add({ 
        title: 'File Error', 
        description: `Sample form file: ${validation.error}`, 
        color: 'red' 
      });
      sampleFormRef.value.value = '';
    } else {
      sampleFormFile.value = {
        file,
        name: file.name,
        type: 'form'
      };
      emitFiles();
    }
  }
};

const emitFiles = () => {
  // Get existing photos count (excluding form)
  const existingPhotoCount = Object.keys(existingFiles.value || {}).length;
  
  // Get new photos count (excluding form)
  const newPhotoCount = Object.keys(files.value || {}).length;
  
  // Check for form file (either new or existing)
  const hasForm = !!(sampleFormFile.value || existingFormFile.value);

  const allFiles = {
    files: files.value,
    sampleFormFile: sampleFormFile.value,
    existingFormFile: existingFormFile.value,
    existingFiles: existingFiles.value,
    formAdded: hasForm,
    photoCount: existingPhotoCount + newPhotoCount
  };

  console.log('Emitting file state:', {
    ...allFiles,
    existingPhotoCount,
    newPhotoCount,
    hasForm
  });
  
  emit('filesSelected', allFiles);
};

const setExistingPhotos = (photos) => {
  existingPhotos.value = photos;
  
  files.value = {};
  existingFiles.value = {};
  
  photos.forEach(photo => {
    if (photo.type === 'upstream' || photo.type === 'downstream' || photo.type === 'other') {
      // Extract actual filename from URL or create a descriptive one
      const fileName = photo.url.split('/').pop() || `${photo.type}_photo.png`;
      existingFiles.value[photo.type] = {
        url: photo.url,
        name: fileName,  // Use actual filename or descriptive name
        type: photo.type
      };
    } else if (photo.type === 'form') {
      const fileName = photo.url.split('/').pop() || 'sample_form.pdf';
      existingFormFile.value = {
        url: photo.url,
        name: fileName,
        type: 'form'
      };
    }
  });
  
 
  updateFilesSelected();
};

const handleInitialPhotos = (photos) => {
  console.log('Processing initial photos:', photos);
  
  // Clear existing state
  existingFiles.value = {};
  existingFormFile.value = null;
  
  if (!photos || !Array.isArray(photos)) {
    console.log('No photos to process');
    updateFilesSelected();
    return;
  }

  // Process each photo, including forms
  photos.forEach(photo => {
    if (!photo) return;
    
    const fileInfo = getFileInfo(photo.file_path);
    console.log('Processing photo:', { photo, fileInfo });

    // Get extension from file path or use default
    const extension = photo.file_path ? 
      photo.file_path.split('.').pop().toLowerCase() : 
      (photo.type === 'form' ? 'pdf' : 'png');

    if (photo.type === 'form') {
      existingFormFile.value = {
        url: photo.file_path || photo.url || '',
        name: `form_${photo.sample_id}.${extension}`,
        type: 'form',
        origPhotoName: photo.origphotoname || fileInfo.name || '',
        sample_id: photo.sample_id,
        file_path: photo.file_path,
        ...photo
      };
      console.log('Set form file:', existingFormFile.value);
    } else if (['upstream', 'downstream', 'other'].includes(photo.type)) {
      existingFiles.value[photo.type] = {
        url: photo.file_path || photo.url || '',
        name: `${photo.type}_${photo.sample_id}.${extension}`,
        type: photo.type,
        origPhotoName: photo.origphotoname || fileInfo.name || '',
        sample_id: photo.sample_id,
        file_path: photo.file_path,
        ...photo
      };
      console.log(`Added ${photo.type} to existingFiles:`, existingFiles.value[photo.type]);
    }
  });

  logState();
  updateFilesSelected();
};

const updateFilesSelected = () => {
  console.log('Updating files selected. Current state:', {
    hasExistingFormFile: !!existingFormFile.value,
    existingFormFile: existingFormFile.value,
    existingFilesCount: Object.keys(existingFiles.value).length
  });

  // Note: Don't require other photos for the form to be shown
  const allFiles = {
    files: existingFiles.value,
    sampleFormFile: sampleFormFile.value,
    existingFormFile: existingFormFile.value,
    formAdded: !!(sampleFormFile.value || existingFormFile.value),
    photoCount: Object.keys(existingFiles.value).length
  };

  console.log('Emitting file state:', allFiles);
  emit('filesSelected', allFiles);
};


const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const getFiles = () => files.value;

const reset = () => {
  files.value = {};
  existingFiles.value = {};
  existingFormFile.value = null;
  sampleFormFile.value = null;
  if (sampleFormRef.value) sampleFormRef.value.value = '';
  Object.values(fileRefs.value).forEach(ref => {
    if (ref) ref.value = '';
  });
  updateFilesSelected();
};

watch(() => props.initialPhotos, (newPhotos) => {
  console.log('Initial photos changed:', {
    photosLength: newPhotos?.length,
    hasPhotos: !!newPhotos?.length,
    photos: newPhotos
  });

  // Always process photos, even if array is empty
  handleInitialPhotos(newPhotos || []);
}, { immediate: true, deep: true });

watch([existingFormFile, files], ([newFormFile, newFiles]) => {
  console.log('File state changed:', {
    existingFormFile: newFormFile,
    files: newFiles
  });
}, { deep: true });

watch(() => props.initialPhotos, (newPhotos) => {
  if (newPhotos && newPhotos.length > 0) {
    console.log('Received new photos via props:', newPhotos);
    handleInitialPhotos(newPhotos);
  }
}, { immediate: true });

defineExpose({
  setExistingPhotos,
  getFiles,
  reset
});
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