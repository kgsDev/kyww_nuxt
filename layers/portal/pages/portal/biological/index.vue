<script setup lang="ts">
// This file is part of the Kentucky Watershed Watch project, which is licensed under the GNU General Public License v3.0 or later.
// For more information, see the LICENSE file in the root directory of this project.
// This file contains the Vue.js component for the Biological Assessment form in the KYWW portal.
// /biological/index.vue - Complete biological form with full functionality
import PolicyGuard from '../../components/PolicyGuard.vue';
import MapSelector from '../sites/MapSelector.vue';
import PhotoUpload from '../../components/PhotoUpload.vue';

const route = useRoute();
const isEditMode = computed(() => !!route.query.edit);
const sampleId = computed(() => route.query.edit as string);

const { user } = useDirectusAuth();
const toast = useToast();

const configPublic = useRuntimeConfig().public;

const isAdmin = computed(() => {
  return user.value?.role === configPublic.DEVADMIN_ROLE_ID || user.value?.role === configPublic.WWKYADMIN_ROLE_ID;
});

const originalSampler = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const submittedSampleId = ref(null);
const errorMessage = ref('');
const submissionStatus = ref('');
const submissionProgress = ref(0);
const uploadedFileTypes = ref([]);

// Photo upload state
const selectedFiles = ref({});
const existingPhotos = ref([]);
const photoUpload = ref(null);

// Form validation and modal states
const isConfirmationModalOpen = ref(false);
const isCancelModalOpen = ref(false);
const isErrorModalVisible = ref(false);
const showValidationErrors = ref(false);
const formErrors = ref([]);

// Header form fields (from sample form)
const volunteer_id = ref(user.value?.id); // Primary sampler
const selectedSamplerIds = ref([]);
const adults = ref();
const youths = ref();
const otherSamplers = ref('');
const directSiteId = ref('');
const wwkyid_pk = ref<number | null>(null);
const stream_name = ref('');
const wwkybasin = ref('');
const date = ref(new Date().toISOString().split('T')[0]);
const startTime = ref();
const totalVolunteerMinutes = ref();
const milesDriven = ref();

// Site validation
const isCheckingSiteId = ref(false);
const isSiteIdValid = ref(null);

// Available samplers
const availableSamplers = ref([]);

// Map state
const isMapOpen = ref(false);
const mapModalRef = ref(null);

// Biological assessment specific fields
const mussels = ref(false);
const stoneflies = ref(false);
const caddisfliesCaseBuilding = ref(false);
const mayflies = ref(false);
const waterPennies = ref(false);
const waterSnipe = ref(false);
const caddisfliesNetSpinning = ref(false);
const riffleBeetles = ref(false);
const operculateSnails = ref(false);
const blackFlyLarva = ref(false);
const craneFlyLarva = ref(false);
const hellgrammites = ref(false);
const clamsAndMussels = ref(false);
const crayfish = ref(false);
const dragonflies = ref(false);
const flatworms = ref(false);
const midges = ref(false);
const alderflies = ref(false);
const scuds = ref(false);
const nonOperculateSnails = ref(false);
const sowBugs = ref(false);
const leeches = ref(false);
const damselflies = ref(false);
const aquaticWorms = ref(false);
const otherAquaticBeetles = ref(false);

// Weather and habitat conditions
const weatherflowConditions = ref('');
const riffle = ref(false);
const leafPacks = ref(false);
const woodyDebris = ref(false);
const pools = ref(false);
const undercutBanks = ref(false);
const submergedAquaticPlants = ref(false);

// Other observations
const otherObs = ref('');

// Computed biological score
const habitatScore = computed(
	() =>
		(mussels.value ? 3 : 0) +
		(stoneflies.value ? 3 : 0) +
		(caddisfliesCaseBuilding.value ? 3 : 0) +
		(mayflies.value ? 3 : 0) +
		(waterPennies.value ? 3 : 0) +
		(waterSnipe.value ? 3 : 0) +
		(caddisfliesNetSpinning.value ? 3 : 0) +
		(riffleBeetles.value ? 3 : 0) +
		(operculateSnails.value ? 3 : 0) +
		(blackFlyLarva.value ? 3 : 0) +
		(craneFlyLarva.value ? 3 : 0) +
		(hellgrammites.value ? 2 : 0) +
		(clamsAndMussels.value ? 2 : 0) +
		(crayfish.value ? 2 : 0) +
		(dragonflies.value ? 2 : 0) +
		(flatworms.value ? 2 : 0) +
		(midges.value ? 2 : 0) +
		(alderflies.value ? 1 : 0) +
		(scuds.value ? 1 : 0) +
		(nonOperculateSnails.value ? 1 : 0) +
		(sowBugs.value ? 1 : 0) +
		(leeches.value ? 1 : 0) +
		(damselflies.value ? 1 : 0) +
		(aquaticWorms.value ? 1 : 0) +
		(otherAquaticBeetles.value ? 1 : 0),
);

const weatherflowConditionOptions = [
	{ value: '1', label: 'Flooded over banks' },
	{ value: '2', label: 'Water at bank level' },
	{ value: '4', label: 'Water below bank level, but flowing' },
	{ value: '6', label: 'Drought condition; not flowing' },
];

// Form validation
const isFormValid = computed(() => {
  formErrors.value = [];
  
  // Check required fields
  if (volunteer_id.value === undefined || volunteer_id.value === null) formErrors.value.push('Primary Sampler');
  if (adults.value === undefined || adults.value === null) formErrors.value.push('Number of Adult Participants');
  if (youths.value === undefined || youths.value === null) formErrors.value.push('Number of Youth Participants');
  if (totalVolunteerMinutes.value === undefined || totalVolunteerMinutes.value === null) formErrors.value.push('Total Volunteer Minutes');
  if (milesDriven.value === undefined || milesDriven.value === null) formErrors.value.push('Miles Driven');
  if (!wwkyid_pk.value) formErrors.value.push('Site ID');
  if (!date.value) formErrors.value.push('Sample Date');
  if (!startTime.value) formErrors.value.push('Start Time');
  
  return formErrors.value.length === 0;
});

// Function to check if user can edit the form
const canEditForm = async () => {
  if (isAdmin.value) return true;
  if (!isEditMode.value || !sampleId.value) return true; // Allow new sample creation
  
  try {
    // Fetch the sample to check ownership
    const sample = await useDirectus(
      readItem('biological_samples', sampleId.value, {
        fields: [
          'volunteer_id',
          'user_created.id'
        ]
      })
    );

    return sample?.volunteer_id === user.value?.id || // Primary sampler
           sample?.user_created?.id === user.value?.id; // Created the sample
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Helper functions from sample form
const toNullableNumber = (value, min = -Infinity, max = Infinity) => {
  if (value === 0 || value === '0') return 0;
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
};

const toNullableInteger = (value, min = -2147483648, max = 2147483647) => {
  if (value === 0 || value === '0') return 0;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
};

// Site ID validation
const handleSiteIdInput = (event) => {
  directSiteId.value = event.target.value;
  isSiteIdValid.value = null;
};

const validateSiteId = async () => {
  if (!directSiteId.value) {
    isSiteIdValid.value = null;
    wwkyid_pk.value = null;
    stream_name.value = '';
    wwkybasin.value = '';
    return;
  }
  
  isCheckingSiteId.value = true;
  isSiteIdValid.value = null;
  
  try {
    const response = await useDirectus(
      readItems('wwky_sites', {
        filter: {
          wwkyid_pk: directSiteId.value
        },
        fields: ['wwkyid_pk', 'stream_name', 'wwkybasin']
      })
    );

    if (response && response.length > 0) {
      const site = response[0];
      wwkyid_pk.value = site.wwkyid_pk;
      stream_name.value = site.stream_name || "unnamed";
      wwkybasin.value = site.wwkybasin;
      isSiteIdValid.value = true;
    } else {
      isSiteIdValid.value = false;
      wwkyid_pk.value = null;
      stream_name.value = '';
      wwkybasin.value = '';
    }
  } catch (error) {
    console.error('Error validating site ID:', error);
    isSiteIdValid.value = false;
  } finally {
    isCheckingSiteId.value = false;
  }
};

// Map functions
const openMap = () => {
  isMapOpen.value = true;
};

const closeMap = () => {
  isMapOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (mapModalRef.value && !mapModalRef.value.contains(event.target as Node)) {
    closeMap();
  }
};

const handleSiteSelection = (site: { wwkyid_pk: number, stream_name: string, wwkybasin: string }) => {
  wwkyid_pk.value = site.wwkyid_pk;
  stream_name.value = site.stream_name || "unnamed";
  wwkybasin.value = site.wwkybasin;
  directSiteId.value = site.wwkyid_pk.toString();
  isSiteIdValid.value = true;
  closeMap();
};

// Sampler functions
const fetchSamplers = async () => {
  try {
    const response = await $fetch('/api/samplers', {
      query: {
        samplerId: user.value.id
      }
    });
    availableSamplers.value = response;
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to load available samplers',
      color: 'red'
    });
  }
};

const getSelectedSamplerName = (id) => {
  const sampler = availableSamplers.value.find(s => s.id === id);
  return sampler ? `${sampler.first_name} ${sampler.last_name}` : '';
};

const removeSampler = (id) => {
  selectedSamplerIds.value = selectedSamplerIds.value.filter(sId => sId !== id);
};

// Photo upload functions
const handleFilesSelected = (files) => {
  if (!files) return;
  try {
    selectedFiles.value = files;
    if (!validateFiles(files)) {
      toast.add({ title: 'File Size Error', description: 'One or more files exceed the 10 MB size limit.', color: 'red' });
    }
  } catch (error) {
    console.error('Error handling files:', error);
  }
};

// Validate file sizes and types
const validateFiles = (files) => {
  if (!files) return true;
  
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  let isValid = true;
  
  Object.values(files).forEach(file => {
    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE) {
        isValid = false;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        if (file.type === 'application/octet-stream') {
          const extension = file.name.split('.').pop().toLowerCase();
          if (!['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(extension)) {
            isValid = false;
          }
        } else {
          isValid = false;
        }
      }
    }
  });
  
  return isValid;
};

// File upload functions (adapted for biological samples)
const uploadFiles = async (sampleId, siteId, files, formType) => {
  const formData = new FormData();
  formData.append('sampleId', sampleId);
  formData.append('siteId', siteId);
  formData.append('formType', formType);
  
  const uploadedFiles = [];

  // Handle regular photos
  if (files.files) {
    Object.entries(files.files).forEach(([key, fileObj]) => {
      if (fileObj && fileObj.file instanceof File) {
        formData.append(key, fileObj.file);
        uploadedFiles.push({
          type: key,
          extension: 'png',
          origPhotoName: fileObj.name
        });
      }
    });
  }

  // Handle sample form file
  if (files.sampleFormFile && files.sampleFormFile.file instanceof File) {
    const formFile = files.sampleFormFile.file;
    const isImage = formFile.type.startsWith('image/');
    const storedExtension = isImage ? 'png' : 'pdf';
    
    formData.append('sampleFormFile', formFile);
    formData.append('isFormImage', isImage.toString());
    formData.append('storedExtension', storedExtension);
    
    uploadedFiles.push({
      type: 'form',
      extension: storedExtension,
      origPhotoName: formFile.name,
      isImage
    });

    if (isEditMode.value) {
      const existingForm = existingPhotos.value?.find?.(p => p?.type === 'form');
      if (existingForm?.file_path) {
        const oldExtension = existingForm.file_path.split('.').pop();
        if (oldExtension !== storedExtension) {
          formData.append('deleteOldFormFile', 'true');
          formData.append('oldFormExtension', oldExtension);
        }
      }
    }
  }

  formData.append('formAdded', !!files.sampleFormFile ? 'true' : 'false');

  try {
    const response = await fetch('/api/upload-files', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Failed to upload files: ${response.statusText}`);
    
    return uploadedFiles;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

const createOrUpdatePhotoRecords = async (sampleId, siteId, uploadedFiles) => {
  try {
    const existingRecords = await useDirectus(
      readItems('lu_biological_photos', {
        filter: { sample_id: { _eq: sampleId } }
      })
    );

    for (const { type, extension, origPhotoName, isImage } of uploadedFiles) {
      const finalExtension = type === 'form' ? extension : 'png';
      const filePath = `https://kyww.uky.edu/webshare/kyww_images/bio/${siteId}/${sampleId}/${type}_${sampleId}.${finalExtension}`;
      const existingRecord = existingRecords.find(record => record.type === type);

      const photoData = {
        file_path: filePath,
        origphotoname: origPhotoName,
        is_image: type === 'form' ? isImage : true
      };

      if (existingRecord) {
        await useDirectus(
          updateItem('lu_biological_photos', existingRecord.id, photoData)
        );
      } else {
        await useDirectus(
          createItem('lu_biological_photos', {
            sample_id: sampleId,
            type,
            ...photoData
          })
        );
      }
    }
  } catch (error) {
    console.error('Error updating photo records:', error);
    throw error;
  }
};

const updateSampleWithPhotoInfo = async (sampleId, files) => {
  try {
    const photoCount = Object.keys(files.files || {}).length;
    const hasForm = !!(files.sampleFormFile || files.existingFormFile);

    await useDirectus(updateItem('biological_samples', sampleId, {
      photos_added: photoCount,
      form_added: hasForm
    }));

  } catch (error) {
    console.error('Error updating sample photo info:', error);
    throw error;
  }
};

// Join table update function
const updateJoinTable = async (tableName, sampleId, relatedIds) => {
  try {
    await useDirectus(deleteItems(tableName, {
      filter: { biological_samples_id: { _eq: sampleId } }
    }));

    if (!relatedIds || !relatedIds.length) {
      return;
    }

    const relatedIdColumn = tableName === 'biological_samples_directus_users' 
      ? 'directus_users_id' 
      : tableName.replace('biological_samples_', '') + '_id';

    const items = relatedIds.map(id => ({
      biological_samples_id: sampleId,
      [relatedIdColumn]: id
    }));

    await useDirectus(createItems(tableName, items));
  } catch (error) {
    console.error(`Error updating join table ${tableName}:`, error);
    throw new Error(`Failed to update ${tableName}: ${error.message}`);
  }
};

// Prepare biological sample data
const prepareBiologicalData = () => {
  // Combine date and time for proper DateTime format
  let combinedDateTime = null;
  if (date.value && startTime.value) {
    combinedDateTime = `${date.value}T${startTime.value}:00.000Z`;
  }

  const baseData = {
    status: 'finalized',
    volunteer_id: volunteer_id.value,
    wwky_id: wwkyid_pk.value,
    participants_adults: adults.value === 0 ? 0 : toNullableInteger(adults.value),
    participants_youth: youths.value === 0 ? 0 : toNullableInteger(youths.value),
    total_volunteer_minutes: totalVolunteerMinutes.value === 0 ? 0 : toNullableInteger(totalVolunteerMinutes.value),
    miles_driven: milesDriven.value === 0 ? 0 : toNullableInteger(milesDriven.value),
    date: date.value,
    start_time: combinedDateTime,
    other_samplers: otherSamplers.value || null,
    other_observations: otherObs.value || null,
    
    // Biological specific fields - matching exact database field names
    weather_flow: weatherflowConditions.value || null,
    habitatzone_riffle: riffle.value,
    habitatzone_leafpacks: leafPacks.value,
    habitatzone_woodydebris: woodyDebris.value,
    habitatzone_pools: pools.value,
    habitatzone_undercutbanks: undercutBanks.value,
    habitatzone_submergedplants: submergedAquaticPlants.value,
    
    // Macroinvertebrates - matching exact database field names
    macroinvertebrate_musslesnative: mussels.value,
    macroinvertebrate_stoneflies: stoneflies.value,
    macroinvertebrate_caddisfliescasebuilding: caddisfliesCaseBuilding.value,
    macroinvertebrate_mayflies: mayflies.value,
    macroinvertebrate_waterpennies: waterPennies.value,
    macroinvertebrate_watersnipe: waterSnipe.value,
    macroinvertebrate_caddisfliesnetspinning: caddisfliesNetSpinning.value,
    macroinvertebrate_rifflebeetles: riffleBeetles.value,
    macroinvertebrate_operculatesnails: operculateSnails.value,
    macroinvertebrate_blackflylarvae: blackFlyLarva.value,
    macroinvertebrate_craneflylarvae: craneFlyLarva.value,
    macroinvertebrate_hellgrammites: hellgrammites.value,
    macroinvertebrate_clamsmusselsnonnative: clamsAndMussels.value,
    macroinvertebrate_crayfish: crayfish.value,
    macroinvertebrate_dragonflies: dragonflies.value,
    macroinvertebrate_flatworms: flatworms.value,
    macroinvertebrate_midges: midges.value,
    macroinvertebrate_alderflies: alderflies.value,
    macroinvertebrate_scuds: scuds.value,
    macroinvertebrate_nonoperculatesnails: nonOperculateSnails.value,
    macroinvertebrate_sowbugs: sowBugs.value,
    macroinvertebrate_leeches: leeches.value,
    macroinvertebrate_damselflies: damselflies.value,
    macroinvertebrate_aquaticworms: aquaticWorms.value,
    macroinvertebrate_otheraquaticbeetles: otherAquaticBeetles.value,
    biological_water_quality_score: habitatScore.value
  };

  // Remove null values
  Object.keys(baseData).forEach(key => 
    baseData[key] === null && delete baseData[key]
  );

  return { baseData };
};

// Fetch biological sample data for editing
const fetchBiologicalData = async (id: string) => {
  isLoading.value = true;
  try {
    await fetchSamplers();
    
    const sampleData = await useDirectus(
      readItem('biological_samples', id, {
        fields: [
          '*',
          'user_created.first_name',
          'user_created.last_name',
          'volunteer_id.first_name',
          'volunteer_id.last_name',
        ]
      })
    );

    if (!sampleData) {
      toast.add({
        title: 'Error',
        description: 'Biological sample not found',
        color: 'red'
      });
      return;
    }

    if (sampleData.user_created) {
      originalSampler.value = `${sampleData.user_created.first_name} ${sampleData.user_created.last_name}`;
    }

    // Set primary sampler
    if (sampleData.volunteer_id) {
      const matchingSampler = availableSamplers.value.find(s => 
        s.first_name === sampleData.volunteer_id.first_name && 
        s.last_name === sampleData.volunteer_id.last_name
      );
      if (matchingSampler) {
        volunteer_id.value = matchingSampler.id;
      }
    }

    // Basic fields
    wwkyid_pk.value = sampleData.wwky_id ? parseInt(sampleData.wwky_id) : null;
    directSiteId.value = wwkyid_pk.value ? wwkyid_pk.value.toString() : '';
    date.value = sampleData.date?.split('T')[0] || null;
    
    // Handle start_time - extract time from DateTime or use as-is if it's just time
    if (sampleData.start_time) {
      if (sampleData.start_time.includes('T')) {
        // It's a full DateTime, extract just the time part
        startTime.value = sampleData.start_time.split('T')[1].substring(0, 5);
      } else {
        // It's just a time string
        startTime.value = sampleData.start_time.substring(0, 5);
      }
    } else {
      startTime.value = null;
    }
    
    adults.value = sampleData.participants_adults !== null ? parseInt(sampleData.participants_adults) : null;
    youths.value = sampleData.participants_youth !== null ? parseInt(sampleData.participants_youth) : null;
    totalVolunteerMinutes.value = sampleData.total_volunteer_minutes !== null ? parseInt(sampleData.total_volunteer_minutes) : null;
    milesDriven.value = sampleData.miles_driven !== null ? parseInt(sampleData.miles_driven) : null;
    otherSamplers.value = sampleData.other_samplers || '';
    otherObs.value = sampleData.other_observations || '';

    // Additional samplers
    const additionalSamplersData = await useDirectus(
      readItems('biological_samples_directus_users', {
        filter: { biological_samples_id: { _eq: id } },
        fields: ['directus_users_id.*']
      })
    );

    if (additionalSamplersData && additionalSamplersData.length > 0) {
      const extractedIds = additionalSamplersData
        .map(s => s.directus_users_id.id)
        .filter(id => id !== sampleData.volunteer_id?.id); // Filter out primary sampler
      
      selectedSamplerIds.value = extractedIds;
    } else {
      console.log('No additional samplers found');
      selectedSamplerIds.value = [];
    }

    // Weather and habitat
    weatherflowConditions.value = sampleData.weather_flow || '';
    riffle.value = sampleData.habitatzone_riffle || false;
    leafPacks.value = sampleData.habitatzone_leafpacks || false;
    woodyDebris.value = sampleData.habitatzone_woodydebris || false;
    pools.value = sampleData.habitatzone_pools || false;
    undercutBanks.value = sampleData.habitatzone_undercutbanks || false;
    submergedAquaticPlants.value = sampleData.habitatzone_submergedplants || false;

    // Macroinvertebrates
    mussels.value = sampleData.macroinvertebrate_musslesnative || false;
    stoneflies.value = sampleData.macroinvertebrate_stoneflies || false;
    caddisfliesCaseBuilding.value = sampleData.macroinvertebrate_caddisfliescasebuilding || false;
    mayflies.value = sampleData.macroinvertebrate_mayflies || false;
    waterPennies.value = sampleData.macroinvertebrate_waterpennies || false;
    waterSnipe.value = sampleData.macroinvertebrate_watersnipe || false;
    caddisfliesNetSpinning.value = sampleData.macroinvertebrate_caddisfliesnetspinning || false;
    riffleBeetles.value = sampleData.macroinvertebrate_rifflebeetles || false;
    operculateSnails.value = sampleData.macroinvertebrate_operculatesnails || false;
    blackFlyLarva.value = sampleData.macroinvertebrate_blackflylarvae || false;
    craneFlyLarva.value = sampleData.macroinvertebrate_craneflylarvae || false;
    hellgrammites.value = sampleData.macroinvertebrate_hellgrammites || false;
    clamsAndMussels.value = sampleData.macroinvertebrate_clamsmusselsnonnative || false;
    crayfish.value = sampleData.macroinvertebrate_crayfish || false;
    dragonflies.value = sampleData.macroinvertebrate_dragonflies || false;
    flatworms.value = sampleData.macroinvertebrate_flatworms || false;
    midges.value = sampleData.macroinvertebrate_midges || false;
    alderflies.value = sampleData.macroinvertebrate_alderflies || false;
    scuds.value = sampleData.macroinvertebrate_scuds || false;
    nonOperculateSnails.value = sampleData.macroinvertebrate_nonoperculatesnails || false;
    sowBugs.value = sampleData.macroinvertebrate_sowbugs || false;
    leeches.value = sampleData.macroinvertebrate_leeches || false;
    damselflies.value = sampleData.macroinvertebrate_damselflies || false;
    aquaticWorms.value = sampleData.macroinvertebrate_aquaticworms || false;
    otherAquaticBeetles.value = sampleData.macroinvertebrate_otheraquaticbeetles || false;

    // Handle photos
    if (sampleData.photos_added || sampleData.form_added) {
      try {
        const photoRecords = await useDirectus(
          readItems('lu_biological_photos', {
            filter: { sample_id: { _eq: id } },
            fields: ['*']
          })
        );

        if (photoRecords?.length > 0) {
          existingPhotos.value = photoRecords.map(record => ({
            id: record.id,
            type: record.type,
            filePath: record.file_path,
            url: `${record.file_path}`,
            name: record.origphotoname || `${record.type}_${id}.${record.file_path.split('.').pop()}`,
            origphotoname: record.origphotoname,
            sample_id: id
          }));

          if (photoUpload.value && typeof photoUpload.value.setExistingPhotos === 'function') {
            photoUpload.value.setExistingPhotos(existingPhotos.value);
          }
        }
      } catch (error) {
        console.error('Error fetching photo records:', error);
        toast.add({
          title: 'Warning',
          description: 'Unable to load existing photos',
          color: 'yellow'
        });
      }
    }

  } catch (error) {
    console.error('Error fetching biological data:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to load biological assessment data',
      color: 'red'
    });
  } finally {
    isLoading.value = false;
  }
};

// Confirmation and submission functions
const confirmSubmission = () => {
  showValidationErrors.value = true;
  
  if (isFormValid.value) {
    isConfirmationModalOpen.value = true;
  } else {
    toast.add({ 
      title: 'Form Validation Error', 
      description: 'Please fill in all required fields and correct any errors.',
      color: 'red'
    });
  }
};

// Submit data function
const submitData = async () => {
  isConfirmationModalOpen.value = false;
  if (!isFormValid.value) {
    errorMessage.value = 'Please fill in all required fields.';
    return;
  }

  const files = selectedFiles.value;
  const validationResult = validateFiles(files);
  if (validationResult !== true) {
    errorMessage.value = 'File validation failed. Please check file sizes and types.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  let createdSampleId = null;
  let sampleSiteId = null;

  try {
    submissionStatus.value = 'Submitting biological assessment...';
    submissionProgress.value = 25;

    if (isEditMode.value) {
      const { baseData } = prepareBiologicalData();
      await useDirectus(updateItem('biological_samples', sampleId.value, baseData));
      await updateJoinTable('biological_samples_directus_users', sampleId.value, selectedSamplerIds.value);
      
      if (selectedFiles.value && (Object.keys(selectedFiles.value).length > 0 || selectedFiles.value.sampleFormFile)) {
        const uploadedFileTypes = await uploadFiles(sampleId.value, wwkyid_pk.value, selectedFiles.value, "bio");
        await createOrUpdatePhotoRecords(sampleId.value, wwkyid_pk.value, uploadedFileTypes);
        await updateSampleWithPhotoInfo(sampleId.value, selectedFiles.value);
      }
      
      toast.add({
        title: 'Success',
        description: 'Biological assessment updated successfully',
        color: 'green'
      });
    } else {
      const { baseData } = prepareBiologicalData();
      const createdSample = await useDirectus(createItem('biological_samples', baseData));
      
      createdSampleId = createdSample.id;
      sampleSiteId = createdSample.wwky_id;
      
      await updateJoinTable('biological_samples_directus_users', createdSampleId, selectedSamplerIds.value);

      submissionStatus.value = 'Uploading photos...';
      submissionProgress.value = 75;

      const formType = "bio";
      const uploadedFileTypes = await uploadFiles(createdSampleId, sampleSiteId, files, formType);
      await createOrUpdatePhotoRecords(createdSampleId, sampleSiteId, uploadedFileTypes);
      await updateSampleWithPhotoInfo(createdSampleId, files);
    }

    submissionProgress.value = 100;
    submittedSampleId.value = createdSampleId || sampleId.value;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    isSubmitting.value = false;
    isSubmitted.value = true;
		
  } catch (error) {
    console.error('Error during submission:', error);
    errorMessage.value = `An error occurred: ${error.message}`;
    
    if (createdSampleId) {
      errorMessage.value += ' Rolling back changes...';
      await rollbackChanges(createdSampleId);
    }
    showErrorModal();
  } finally {
    isSubmitting.value = false;
  }
};

// Rollback function
const rollbackChanges = async (sampleId) => {
  try {
    await deleteJoinTableEntries('biological_samples_directus_users', sampleId);
    await useDirectus(deleteItem('biological_samples', sampleId));
    await useDirectus(deleteItems('lu_biological_photos', {
      filter: { sample_id: sampleId }
    }));
  } catch (rollbackError) {
    console.error('Error during rollback:', rollbackError);
    errorMessage.value += ' Rollback failed. Please contact support.';
  }
};

const deleteJoinTableEntries = async (tableName, sampleId) => {
  try {
    await useDirectus(deleteItems(tableName, {
      filter: { biological_samples_id: { _eq: sampleId } }
    }));
  } catch (error) {
    console.error(`Error deleting entries from ${tableName}:`, error);
  }
};

const showErrorModal = () => {
  isErrorModalVisible.value = true;
};

// Navigation functions
const viewDashboard = () => {
  navigateTo('/portal/');
};

const viewSite = () => {
  navigateTo(`/portal/sites/${wwkyid_pk.value}`);
};

const handleCancel = () => {
  if (wwkyid_pk.value) {
    navigateTo(`/portal/sites/${wwkyid_pk.value}`);
  } else {
    navigateTo('/portal/');
  }
};

const showCancelConfirmation = () => {
  isCancelModalOpen.value = true;
};

const confirmCancel = () => {
  isCancelModalOpen.value = false;
  handleCancel();
};

const handleNewSample = () => {
  resetForm();
  isSubmitted.value = false;
  navigateTo('/portal/biological');
};

// Reset form function
const resetForm = () => {
  // Reset all form fields
  volunteer_id.value = user.value?.id;
  selectedSamplerIds.value = [];
  adults.value = null;
  youths.value = null;
  otherSamplers.value = '';
  directSiteId.value = '';
  wwkyid_pk.value = null;
  stream_name.value = '';
  wwkybasin.value = '';
  date.value = new Date().toISOString().split('T')[0];
  startTime.value = null;
  totalVolunteerMinutes.value = null;
  milesDriven.value = null;
  
  // Reset biological fields
  weatherflowConditions.value = '';
  riffle.value = false;
  leafPacks.value = false;
  woodyDebris.value = false;
  pools.value = false;
  undercutBanks.value = false;
  submergedAquaticPlants.value = false;
  
  // Reset all macroinvertebrate fields
  mussels.value = false;
  stoneflies.value = false;
  caddisfliesCaseBuilding.value = false;
  mayflies.value = false;
  waterPennies.value = false;
  waterSnipe.value = false;
  caddisfliesNetSpinning.value = false;
  riffleBeetles.value = false;
  operculateSnails.value = false;
  blackFlyLarva.value = false;
  craneFlyLarva.value = false;
  hellgrammites.value = false;
  clamsAndMussels.value = false;
  crayfish.value = false;
  dragonflies.value = false;
  flatworms.value = false;
  midges.value = false;
  alderflies.value = false;
  scuds.value = false;
  nonOperculateSnails.value = false;
  sowBugs.value = false;
  leeches.value = false;
  damselflies.value = false;
  aquaticWorms.value = false;
  otherAquaticBeetles.value = false;
  
  otherObs.value = '';
  
  // Reset state
  formErrors.value = [];
  isConfirmationModalOpen.value = false;
  showValidationErrors.value = false;
  isLoading.value = false;
  isMapOpen.value = false;
  isSiteIdValid.value = null;
  isCheckingSiteId.value = false;
  isSubmitting.value = false;
  isSubmitted.value = false;
  submittedSampleId.value = '';
  submissionStatus.value = '';
  submissionProgress.value = 0;
  uploadedFileTypes.value = [];
  errorMessage.value = '';
  selectedFiles.value = {};
  existingPhotos.value = [];
  
  if (photoUpload.value && typeof photoUpload.value.reset === 'function') {
    photoUpload.value.reset();
  }
};

// Initialize component
const initializeComponent = async () => {
  try {
    volunteer_id.value = user.value?.id;
    await fetchSamplers();
    
    if (isEditMode.value && sampleId.value) {
      try {
        await fetchBiologicalData(sampleId.value);
      } catch (error) {
        console.error('Error fetching biological data:', error);
      }
    }
  } catch (error) {
    console.error('Error during component initialization:', error);
  }
};

// Lifecycle hooks
onMounted(async () => {
  try {
    if (isEditMode.value) {
      const hasPermission = await canEditForm();
      if (!hasPermission) {
        toast.add({
          title: 'Access Denied',
          description: 'You do not have permission to edit this biological assessment.',
          color: 'red'
        });
        navigateTo('/portal/');
        return;
      }
    }
    await initializeComponent();
  } catch (error) {
    console.error('Error in onMounted hook:', error);
  }
});

// Watch for route changes
watch(
  () => route.fullPath,
  async (newPath, oldPath) => {
    if (newPath.includes('edit=') && isEditMode.value) {
      const hasPermission = await canEditForm();
      if (!hasPermission) {
        toast.add({
          title: 'Access Denied',
          description: 'You do not have permission to edit this biological assessment.',
          color: 'red'
        });
        navigateTo('/portal/');
      }
    }
    if (newPath === '/portal/biological' && oldPath !== newPath) {
      resetForm();
      await nextTick();
      if (photoUpload.value) {
        photoUpload.value.reset();
      }
    }
  }
);

watch([isEditMode, sampleId], ([newIsEditMode, newSampleId]) => {
  if (newIsEditMode && newSampleId) {
    fetchBiologicalData(newSampleId);
  }
});
</script>

<template>
<PolicyGuard path="/portal/biological">
  <div>
    <ClientOnly>
      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center min-h-screen">
        <ULoader />
      </div>

      <div v-else>
        <PortalPageHeader
          :title="isEditMode ? 'Edit Biological Assessment ('+ sampleId +')' : 'New Biological Assessment'"
          :breadcrumbs="isEditMode ? [
            {
              title: 'Portal',
              href: '/portal',
            },
            {
              title: 'Edit Biological Assessment',
              href: '#',
            }
          ] : [
            {
              title: 'Portal',
              href: '/portal',
            },
            {
              title: 'New Biological Assessment',
              href: '#',
            }
          ]"
        />

        <!-- Submission Confirmation Screen -->
        <div v-if="isSubmitted" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div class="bg-white p-8 rounded-lg shadow-xl text-center">
            <h2 class="text-2xl font-bold mb-4">Thank You!</h2>
            <p class="mb-4">
              {{ isEditMode 
                ? `Biological assessment ${sampleId} has been successfully updated.`
                : `Your biological assessment (number: ${submittedSampleId}) has been successfully submitted.`
              }}
            </p>
            <p v-if="uploadedFileTypes.length > 0" class="mb-4">Photos have also been uploaded.</p>
            <div class="space-x-4">
              <UButton 
                variant="solid" 
                @click="viewDashboard" 
                label="View Dashboard" 
              />
              <UButton 
                v-if="!isEditMode"
                variant="outline" 
                @click="handleNewSample" 
                label="Submit Another Assessment" 
              />
              <UButton
                v-if="wwkyid_pk"
                variant="outline"
                @click="viewSite"
                :label="`View Site ${wwkyid_pk}`"
              />
            </div>
          </div>
        </div>

        <!-- Main Form -->
        <div v-else>
          <h1 class="text-2xl text-center text-gray-900 mb-4">Kentucky Watershed Watch Biological Assessment Form</h1>

          <Form @submit.prevent="submitData">
            <div class="relative items-start">
              <!-- Header Section - Same as Sample Form -->
              <div class="border-4 p-4 border-gray-900 bg-blue-50 mb-6">
                <div class="p-2">
                  <h1 class="text-1xl font-bold text-left text-gray-900 required-field">Required Fields</h1>
                </div>
                <div class="flex">
                  <UFormGroup class="p-2 basis-1/3" required>
                    <label class="block mb-1 required-field">Primary Sampler:</label>
                    <USelect
                      v-model="volunteer_id"
                      :options="availableSamplers.map(sampler => ({
                        value: sampler.id,
                        label: `${sampler.first_name} ${sampler.last_name}${sampler.id === user?.id ? ' (you)' : ''}`,
                        searchable: `${sampler.first_name.toLowerCase()} ${sampler.last_name.toLowerCase()} ${sampler.email.toLowerCase()}`
                      }))"
                      :filter="(options, search) => {
                        if (!search) return options
                        return options.filter(option => 
                          option.searchable.includes(search.toLowerCase())
                        )
                      }"
                      searchable
                      placeholder="Select primary sampler"
                      required
                    />
                    <template v-if="isEditMode">
                      <p v-if="originalSampler" class="text-sm text-gray-500 mt-1">
                        Originally entered by {{ originalSampler }}
                      </p>
                    </template>
                    <template v-else>
                      <p class="text-sm text-gray-600 mt-1">
                        Form entered by: {{ user?.first_name }} {{ user?.last_name }}
                      </p>
                    </template>
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-2/3">
                    <label class="block mb-1">Additional Samplers</label>
                    <div class="space-y-2">
                      <USelectMenu
                        v-model="selectedSamplerIds"
                        :options="availableSamplers"
                        multiple
                        searchable
                        placeholder="Search and select additional samplers"
                        value-attribute="id"
                        >
                        <template #option="{ option }">
                          <span>
                            {{ option.first_name }} {{ option.last_name }}
                            {{ option.id === user?.id ? ' (you)' : '' }}
                          </span>
                        </template>
                        <template #selected-option="{ option }">
                          <span>
                            {{ option.first_name }} {{ option.last_name }}
                            {{ option.id === user?.id ? ' (you)' : '' }}
                          </span>
                        </template>
                      </USelectMenu>
                    
                      <!-- Display selected samplers with remove option -->
                      <div class="flex flex-wrap gap-2 mt-2">
                        <div 
                          v-for="selectedId in selectedSamplerIds" 
                          :key="selectedId"
                          class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                        >
                          <span>{{ getSelectedSamplerName(selectedId) }}</span>
                          <button
                            @click="removeSampler(selectedId)"
                            class="text-blue-600 hover:text-blue-800"
                          >
                            <UIcon name="i-heroicons-x-mark" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </UFormGroup>

                  <UFormGroup class="p-2 basis-1/3" required>
                    <label class="block mb-1 required-field"># Adult Participants:</label>
                    <UInput
                      v-model="adults"
                      icon="ic:baseline-group"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/3" required>
                    <label class="block mb-1 required-field"># Youth Participants:</label>
                    <UInput
                      v-model="youths"
                      icon="healthicons:child-program"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </UFormGroup>
                </div>
                <div class="w-full px-2">
                  <UFormGroup>
                    <label class="block mb-1">Other non-KYWW Samplers:</label>
                    <UTextarea 
                      v-model="otherSamplers" 
                      rows="2"
                      class="w-full min-h-[60px] resize-y"
                      placeholder="List any non-KYWW samplers here"
                    />
                  </UFormGroup>
                </div>
                <div class="flex">
                  <UFormGroup class="p-2 basis-1/4">
                    <label class="block mb-1">Enter Site ID:</label>
                    <UInput
                      :model-value="directSiteId"
                      @input="handleSiteIdInput"
                      @blur="validateSiteId"
                      @change="validateSiteId"
                      icon="bxs:been-here"
                      placeholder="Enter Site ID"
                      :loading="isCheckingSiteId"
                    />
                    <p v-if="isSiteIdValid === false" class="text-red-500 mt-1">Invalid Site ID</p>
                    <p v-if="isSiteIdValid === true" class="text-green-500 mt-1">Valid Site ID</p>
                    <label class="block mb-1 text-sm">(click or tab out to check)</label>
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4">
                    <label class="block mb-1">or Select/Create a Site:</label>
                    <UButton label="Open Map" @click="openMap" />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4" required>
                    <label class="block mb-1 required-field">Site ID:</label>
                    <UInput :model-value="wwkyid_pk !== null ? wwkyid_pk.toString() : ''" icon="bxs:been-here" :disabled="true" required/>
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4">
                    <label class="block mb-1">Stream Name:</label>
                    <UInput v-model="stream_name" icon="mdi:water" :disabled="true"/>
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4">
                    <label class="block mb-1">Basin:</label>
                    <UInput v-model="wwkybasin" icon="mdi:terrain" :disabled="true"/>
                  </UFormGroup>
                </div>
                <div class="flex">
                  <UFormGroup class="p-2 basis-1/4" required>
                    <label class="block mb-1 required-field">Date:</label>
                    <UInput v-model="date" icon="solar:calendar-bold" type="date" required />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4" required>
                    <label class="block mb-1 required-field">Start Time:</label>
                    <UInput v-model="startTime" icon="mdi:clock-outline" type="time" required />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4" required>
                    <label class="block mb-1 required-field">Total Volunteer Minutes:</label>
                    <UInput
                      v-model="totalVolunteerMinutes"
                      placeholder="Travel+Sampling"
                      type="number"
                      min="0"
                      required
                    />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-1/4">
                    <label class="block mb-1 required-field">Miles Driven:</label>
                    <UInput
                      v-model="milesDriven"
                      icon="fa-solid:car-side"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </UFormGroup>
                </div>
                <div class="p-2 text-sm text-right">
                  <h1>Total time spent sampling at multiple sites should only be entered once.</h1>
                  <h1>Total miles driven to sample at multiple sites should only be entered once.</h1>
                </div>
              </div>

              <!-- Biological Assessment Content -->
              <div class="border-4 p-1 border-gray-900">
                <div class="flex">
                  <h3 class="p-2 basis-2/6 border-2 border-gray-900 text-center text-xl">Streamflow Conditions</h3>
                  <h3 class="p-2 basis-4/6 border-2 border-gray-900 text-center text-xl">Habitat Zone</h3>
                </div>
                <div class="flex">
                  <UFormGroup class="p-2 basis-2/6 border-2 border-gray-900">
                    <URadioGroup v-model="weatherflowConditions" :options="weatherflowConditionOptions" name="weatherflowConditions" />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-2/6 border-l-2 border-b-2 border-t-2 border-gray-900">
                    <UCheckbox v-model="riffle" name="riffle" label="Riffle" />
                    <UCheckbox v-model="leafPacks" name="leafPacks" label="Leaf Packs" />
                    <UCheckbox v-model="woodyDebris" name="woodyDebris" label="Woody Debris" />
                  </UFormGroup>
                  <UFormGroup class="p-2 basis-2/6 border-r-2 border-b-2 border-t-2 border-gray-900">
                    <UCheckbox v-model="pools" name="pools" label="Pools" />
                    <UCheckbox v-model="undercutBanks" name="undercutBanks" label="Undercut Banks" />
                    <UCheckbox
                      v-model="submergedAquaticPlants"
                      name="submergedAquaticPlants"
                      label="Submerged Aquatic Plants"
                    />
                  </UFormGroup>
                </div>
              </div>

              <p class="text-l text-gray-900">
                Click all of the macroinvertebrates that you find in your stream and the form will calculate your stream's
                biological water quality score.
              </p>

              <h2
                class="border-2 border-gray-900 text-xl text-gray-900 text-center p-2"
                :class="{
                  'bg-red-500': habitatScore < 19,
                  'bg-orange-500': habitatScore >= 19 && habitatScore <= 32,
                  'bg-yellow-500': habitatScore > 32 && habitatScore <= 41,
                  'bg-green-500': habitatScore > 41,
                }"
              >
                Biological Water Quality Score = {{ habitatScore }} - {{ habitatScore < 19 ? 'Poor' : '' }}
                {{ habitatScore >= 19 && habitatScore <= 32 ? 'Marginal' : '' }}
                {{ habitatScore > 32 && habitatScore <= 41 ? 'Fair' : '' }}
                {{ habitatScore > 41 ? 'Good' : '' }}
              </h2>

              <div class="flex">
                <h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">
                  Highly Sensitive
                </h2>
                <h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">Sensitive</h2>
                <h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">
                  Moderately Tolerant
                </h2>
                <h2 class="border-2 border-gray-900 bg-lime-500 basis-2/5 text-xl text-gray-900 text-center">Tolerant</h2>
              </div>

              <!-- Macroinvertebrates Grid -->
              <div class="flex">
                <div class="border-2 border-gray-900 basis-1/5">
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': mussels }" @click="mussels = !mussels">
                    <label for="mussels" class="cursor-pointer">Mussels (Native)</label>
                    <img src="@/assets/form_icons/mussels-native.png" alt="Mussels" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': stoneflies }" @click="stoneflies = !stoneflies">
                    <label for="stoneflies" class="cursor-pointer">Stoneflies</label>
                    <img src="@/assets/form_icons/stoneflies.png" alt="Stoneflies" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': caddisfliesCaseBuilding }"
                    @click="caddisfliesCaseBuilding = !caddisfliesCaseBuilding"
                  >
                    <label for="caddisfliesCaseBuilding" class="cursor-pointer">Caddisflies (case-building)</label>
                    <img src="@/assets/form_icons/caddisflies-case_building.png" alt="Caddisflies" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': mayflies }" @click="mayflies = !mayflies">
                    <label for="mayflies" class="cursor-pointer">Mayflies</label>
                    <img src="@/assets/form_icons/mayflies.png" alt="Mayflies" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': waterPennies }"
                    @click="waterPennies = !waterPennies"
                  >
                    <label for="waterPennies" class="cursor-pointer">Water Pennies</label>
                    <img src="@/assets/form_icons/water_pennies.png" alt="Water Pennies" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': waterSnipe }" @click="waterSnipe = !waterSnipe">
                    <label for="waterSnipe" class="cursor-pointer">Water Snipe</label>
                    <img src="@/assets/form_icons/water_snipe.png" alt="Water Snipe" />
                  </div>
                </div>
                <div class="border-2 border-gray-900 basis-1/5">
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': caddisfliesNetSpinning }"
                    @click="caddisfliesNetSpinning = !caddisfliesNetSpinning"
                  >
                    <label for="caddisfliesNetSpinning" class="cursor-pointer">Caddisflies (net-spinning)</label>
                    <img src="@/assets/form_icons/caddisflies-net_spinning.png" alt="Caddisflies" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': riffleBeetles }"
                    @click="riffleBeetles = !riffleBeetles"
                  >
                    <label for="riffleBeetles" class="cursor-pointer">Riffle Beetles (adults and larvae)</label>
                    <img src="@/assets/form_icons/riffle_beetles-adults_and_larvae.png" alt="Riffle Beetles" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': operculateSnails }"
                    @click="operculateSnails = !operculateSnails"
                  >
                    <label for="operculateSnails" class="cursor-pointer">Operculate Snails (Right-opening)</label>
                    <img src="@/assets/form_icons/operculate_snails-right_opening.png" alt="Operculate Snails" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': blackFlyLarva }"
                    @click="blackFlyLarva = !blackFlyLarva"
                  >
                    <label for="blackFlyLarva" class="cursor-pointer">Black Fly Larvae</label>
                    <img src="@/assets/form_icons/black_fly_larva.png" alt="Black Fly Larva" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': craneFlyLarva }"
                    @click="craneFlyLarva = !craneFlyLarva"
                  >
                    <label for="craneFlyLarva" class="cursor-pointer">Crane Fly Larvae</label>
                    <img src="@/assets/form_icons/crane_fly_larva.png" alt="Crane Fly Larva" />
                  </div>
                </div>
                <div class="border-2 border-gray-900 basis-1/5">
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': hellgrammites }"
                    @click="hellgrammites = !hellgrammites"
                  >
                    <label for="hellgrammites" class="cursor-pointer">Hellgrammites / Dobsonfly Larvae</label>
                    <img src="@/assets/form_icons/hellgrammites.png" alt="Hellgrammites" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': clamsAndMussels }"
                    @click="clamsAndMussels = !clamsAndMussels"
                  >
                    <label for="clamsAndMussels" class="cursor-pointer">Clams and Mussels (Asian)</label>
                    <img src="@/assets/form_icons/clams_and_mussels-asian.png" alt="Clams and Mussels" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': crayfish }" @click="crayfish = !crayfish">
                    <label for="crayfish" class="cursor-pointer">Crayfish</label>
                    <img src="@/assets/form_icons/crayfish.png" alt="Crayfish" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': dragonflies }" @click="dragonflies = !dragonflies">
                    <label for="dragonflies" class="cursor-pointer">Dragonflies</label>
                    <img src="@/assets/form_icons/dragonflies.png" alt="Dragonflies" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': flatworms }" @click="flatworms = !flatworms">
                    <label for="flatworms" class="cursor-pointer">Flatworms / Planaria</label>
                    <img src="@/assets/form_icons/flatworms_planaria.png" alt="Flatworms" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': midges }" @click="midges = !midges">
                    <label for="midges" class="cursor-pointer">Midges / Chironomids</label>
                    <img src="@/assets/form_icons/midges_chironomids.png" alt="Midges" />
                  </div>
                </div>
                <div class="border-2 border-gray-900 basis-2/5">
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': alderflies }" @click="alderflies = !alderflies">
                    <label for="alderflies" class="cursor-pointer">Alderflies</label>
                    <img src="@/assets/form_icons/alderflies.png" alt="Alderflies" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': scuds }" @click="scuds = !scuds">
                    <label for="scuds" class="cursor-pointer">Scuds / Amphipods</label>
                    <img src="@/assets/form_icons/scuds_amphipods.png" alt="Scuds" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': nonOperculateSnails }"
                    @click="nonOperculateSnails = !nonOperculateSnails"
                  >
                    <label for="nonOperculateSnails" class="cursor-pointer">Non-operculate Snails (Left-opening)</label>
                    <img src="@/assets/form_icons/non_operculate_snails-left_opening.png" alt="Non-operculate Snails" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': sowBugs }" @click="sowBugs = !sowBugs">
                    <label for="sowBugs" class="cursor-pointer">Sow Bugs</label>
                    <img src="@/assets/form_icons/sow_bugs.png" alt="Sow Bugs" />
                  </div>
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': leeches }" @click="leeches = !leeches">
                    <label for="leeches" class="cursor-pointer">Leeches</label>
                    <img src="@/assets/form_icons/leeches.png" alt="Leeches" />
                  </div>
                </div>
                <div class="border-b-2 border-r-2 border-t-2 border-gray-900 basis-1/5">
                  <div class="p-2 cursor-pointer" :class="{ 'bg-lime-500 text-gray-900': damselflies }" @click="damselflies = !damselflies">
                    <label for="damselflies" class="cursor-pointer">Damselflies</label>
                    <img src="@/assets/form_icons/damselflies.png" alt="Damselflies" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': aquaticWorms }"
                    @click="aquaticWorms = !aquaticWorms"
                  >
                    <label for="aquaticWorms" class="cursor-pointer">Aquatic Worms</label>
                    <img src="@/assets/form_icons/aquatic_worms.png" alt="Aquatic Worms" />
                  </div>
                  <div
                    class="p-2 cursor-pointer"
                    :class="{ 'bg-lime-500 text-gray-900': otherAquaticBeetles }"
                    @click="otherAquaticBeetles = !otherAquaticBeetles"
                  >
                    <label for="otherAquaticBeetles" class="cursor-pointer">Other Aquatic Beetles (adults and larvae)</label>
                    <img src="@/assets/form_icons/other_aquatic_beetles-adults_and_larvae.png" alt="Other Aquatic Beetles" />
                  </div>
                </div>
              </div>

              <div>
                <h2
                  class="border-2 border-gray-900 text-xl text-gray-900 text-center p-2"
                  :class="{
                    'bg-red-500': habitatScore < 19,
                    'bg-orange-500': habitatScore >= 19 && habitatScore <= 32,
                    'bg-yellow-500': habitatScore > 32 && habitatScore <= 41,
                    'bg-green-500': habitatScore > 41,
                  }"
                >
                  Biological Water Quality Score = {{ habitatScore }} - {{ habitatScore < 19 ? 'Poor' : '' }}
                  {{ habitatScore >= 19 && habitatScore <= 32 ? 'Marginal' : '' }}
                  {{ habitatScore > 32 && habitatScore <= 41 ? 'Fair' : '' }}
                  {{ habitatScore > 41 ? 'Good' : '' }}
                </h2>
              </div>

              <div>
                <p class="text-sm">
                  Images are not shown to scale. Images from the following sources: Zebra mussel Image: fieldguide.mt.gov;
                  Operculate Snail Image: mdc.mo.gov; Aquatic Worm Image: nwnature.net, All other images from
                  Macroinvertebrates.org
                </p>
                <p>
                  <strong>NOTE:</strong>
                  Common macroinvertebrates such as water boatmen, backswimmers, water scorpions, giant water bugs, water
                  striders, and fishing spiders are not included on the form as their presences is not linked to tolerance or
                  sensitivity to pollution.
                </p>
              </div>

              <!-- Other Observations and Photo Upload Section -->
              <div class="flex">
                <div class="border-4 p-1 border-gray-900 w-1/2">
                  <h2 class="text-lg">Other Observations or Measurements</h2>
                  <UFormGroup class="p-2">
                    <UTextarea 
                      v-model="otherObs" 
                      rows="10"
                      class="w-full min-h-[200px] resize-y"
                      placeholder="Enter any additional observations or measurements here..."
                    />
                  </UFormGroup>
                </div>
                <div class="border-4 p-1 border-gray-900 w-1/2">
                  <UFormGroup class="p-2">
                    <PhotoUpload 
                      ref="photoUpload"
                      @filesSelected="handleFilesSelected"
                      :key="sampleId"
                      :initial-photos="existingPhotos"
                      :site-id="wwkyid_pk",
                      form-type="bio"
                    />
                  </UFormGroup>
                </div>
                <div class="border-4 p-1 border-gray-900 w-1/2">
                  <div class="flex flex-col items-center text-center">
                    <div class="p-4">
                      <img 
                        src="assets/KyWW_logo.png" 
                        alt="Kentucky Watershed Watch Logo" 
                        class="w-48 h-auto"
                      />
                    </div>
                    <div class="p-4">
                      <h2 class="text-lg">
                        Visit
                        <a href="https://www.kywater.org" target="_blank" class="text-blue-600 hover:text-blue-800">www.kywater.org</a>
                        to view data. For questions or feedback, email <a href="mailto:contact@kywater.org" class="text-blue-600 hover:text-blue-800">contact@kywater.org</a>.
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit and Cancel Buttons -->
              <div class="flex justify-end space-x-4 mt-6">
                <UButton
                  @click="showCancelConfirmation"
                  variant="outline"
                  color="gray"
                >
                  Cancel
                </UButton>
                <UButton
                  @click="confirmSubmission"
                  class="text-gray-900"
                  variant="solid"
                  :disabled="!isFormValid || isSubmitting"
                >
                  {{ isSubmitting ? 'Submitting...' : isEditMode ? 'Save Changes' : 'Submit Assessment' }}
                </UButton>
              </div>
            </div>
          </Form>

          <!-- Cancel Confirmation Modal -->
          <UModal v-model="isCancelModalOpen">
            <UCard>
              <template #header>
                <div class="text-xl font-bold text-yellow-600">
                  Confirm Cancel
                </div>
              </template>
              <div class="p-4">
                <p class="mb-4">
                  Are you sure you want to cancel? Any unsaved changes will be lost.
                </p>
              </div>
              <template #footer>
                <div class="flex justify-end space-x-4">
                  <UButton 
                    @click="isCancelModalOpen = false" 
                    color="gray"
                  >
                    No, Continue Editing
                  </UButton>
                  <UButton 
                    @click="confirmCancel" 
                    color="yellow"
                  >
                    Yes, Cancel
                  </UButton>
                </div>
              </template>
            </UCard>
          </UModal>

          <!-- Confirmation Modal -->
          <UModal v-model="isConfirmationModalOpen">
            <UCard>
              <template #header>
                <div class="text-xl font-bold">
                  {{ isEditMode ? 'Confirm Changes' : 'Confirm Submission' }}
                </div>
              </template>
              <p>
                {{ isEditMode 
                  ? 'Are you sure you want to save these changes to the biological assessment? Please review your modifications before confirming.'
                  : 'Are you sure you want to submit this biological assessment? Please review your entries before confirming.'
                }}
              </p>
              <template #footer>
                <div class="flex justify-end space-x-4">
                  <UButton @click="isConfirmationModalOpen = false" color="gray">
                    Cancel
                  </UButton>
                  <UButton @click="submitData" color="primary">
                    {{ isEditMode ? 'Save Changes' : 'Submit Assessment' }}
                  </UButton>
                </div>
              </template>
            </UCard>
          </UModal>

          <!-- Loading Overlay -->
          <div v-if="isSubmitting" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white p-8 rounded-lg shadow-xl text-center">
              <p class="mb-4">{{ submissionStatus }}</p>
              <UProgress :model-value="submissionProgress" />
            </div>
          </div>
        </div>

        <!-- Map Modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="isMapOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="handleClickOutside">
              <div ref="mapModalRef" class="bg-white rounded-lg p-4 max-w-[750px] w-full max-h-[500px] h-full overflow-auto relative">
                <button @click="closeMap" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                  <i class="fas fa-times"></i>
                </button>
                <MapSelector @select-site="handleSiteSelection" />
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Error Modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="isErrorModalVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-xl font-bold mb-4">There was an error - Please try to submit again.</h3>
                <p class="mb-4">{{ errorMessage }}</p>
                <div class="flex justify-end">
                  <UButton @click="isErrorModalVisible = false" label="Close" />
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>

      <!-- Form Validation Errors -->
      <div v-if="formErrors.length > 0" class="mb-4 mt-6 mx-auto max-w-4xl">
        <div class="bg-orange-50 border-2 border-orange-400 p-4 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <UIcon 
                name="i-heroicons-exclamation-triangle" 
                class="h-5 w-5 text-orange-400"
              />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-orange-800">
                Please make sure these are filled:
              </h3>
              <div class="mt-2 text-sm text-orange-700">
                <ul class="list-disc pl-5 space-y-1">
                  <li v-for="(error, index) in formErrors" :key="index">
                    {{ error }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</PolicyGuard>
</template>

<style scoped>
.required-field::after {
  content: '*';
  color: red;
  margin-left: 4px;
}

.required-field {
  font-weight: bold;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hide number input spinners globally */
:deep(input[type="number"]::-webkit-outer-spin-button),
:deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

:deep(input[type="number"]) {
  -moz-appearance: textfield;
}

:deep(.textarea) {
  min-height: 200px;
  line-height: 1.5;
  padding: 0.75rem;
}
</style>