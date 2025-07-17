<script setup lang="ts">
// /habitat/index.vue - Habitat assessment form for KYWW
// This page allows users to create or edit habitat assessment samples
// It includes a form with various fields, validation, and file uploads
// /habitat/index.vue - Complete habitat form with full functionality
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

// Habitat assessment specific fields
const siteNumber = ref();
const streamLocationDescription = ref('');

// Land use checkboxes - matching schema field names
const landUseIndustrial = ref(false);
const landUseDowntown = ref(false);
const landUseSuburban = ref(false);
const landUseCommercial = ref(false);
const landUseOpenspace = ref(false);
const landUseAgriculture = ref(false);
const landUseOther = ref('');

// Pollutant indicators
const odor = ref('');
const color = ref('');
const floatables = ref('');

// Physical assessment - 9 categories, each with 4 options (1-4, where 4 is best)
const selectedOptions = ref(Array(9).fill(null));

// Other observations
const otherObs = ref('');

// Computed habitat score
const habitatScore = computed(() => {
  const validSelections = selectedOptions.value.filter(val => val !== null);
  if (validSelections.length === 0) return 0;
  
  // Calculate total score (higher numbers = better conditions)
  // Convert to final scoring where higher is better
  return validSelections.reduce((acc, val) => acc + val, 0);
});

const habitatItems = [
  {
    title: 'Streambank Vegetation',
    description: 'Look above water level and on land next to stream. Mowing/grazing impacts?',
    options: [
      'Very little plant life at all along banks or in floodplain.',
      'Most trees and shrubs are gone.',
      'Some plants, shrubs and trees along banks.',
      'Lots of plants, shrubs and trees (not lawn or crops) covering banks and floodplain.'
    ]
  },
  {
    title: 'Stream Channel Alteration',
    description: 'Is the stream curving or straight? Have humans changed the stream channel?',
    options: [
      'Channel straightened and flowing along a rocky or paved channel.',
      'Channel mostly straightened, but vegetation still present and no rock or cement hardening of banks.',
      'Channel straightened in some places, but some natural bends still present. No bank hardening with concrete or rocks.',
      'Channel allowed to naturally bend and curve around landscape. Flow not impacted by manmade features, such as rock baskets or concrete.'
    ]
  },
  {
    title: 'Embeddedness',
    description: 'Are there rocks on the bottom and are they covered by silt? Is there a variety of rock sizes?',
    options: [
      'Rocks entirely buried by sand and silt.',
      'Rocks more than halfway buried (embedded) into sand/silt.',
      'Exposed rocks cover most of stream bed, with some sand/silt between & on rocks.',
      'Exposed rocks cover almost all of the stream bed with very little sand or silt between them.'
    ]
  },
  {
    title: 'Erosion',
    description: 'What length of banks is bare of vegetation?',
    options: [
      'Steep banks of bare, exposed soil with very little covered by large rocks and vegetation.',
      'Approx. 1/3 of bank area covered with large rocks and vegetation, 2/3 exposed soil.',
      'Approx. 2/3 of bank area covered with large rocks and vegetation, 1/3 exposed soil.',
      'Most of streambanks are covered with large rocks and vegetation with very little exposed soil.'
    ]
  },
  {
    title: 'Shelter for Macroinvertebrates',
    description: 'Look for rocks, limbs and leaves on the stream bottom.',
    options: [
      'No rocks, wood, or leaf packs. Stream bottom mainly mud or bedrock.',
      'No rocks or wood, but some leaf packs.',
      'Only small gravel-sized rocks, some wood and leaf packs.',
      'Lots of different sized rocks, submerged wood, and plenty of leaf packs.'
    ]
  },
  {
    title: 'Shelter for Fish',
    description: 'Good shelter includes deep pools, submerged wood and undercut banks.',
    options: [
      'No pools, wood, and undercut banks in the water.',
      'Very few pools, wood, and undercut banks in the water.',
      'Some pools, wood, and undercut banks in the water.',
      'Multiple pools, some submerged wood, and undercut banks in the water.'
    ]
  },
  {
    title: 'Riparian Vegetated Buffer Width',
    description: 'How wide is the band of trees and shrubs on each side of the stream?',
    options: [
      'EACH bank has 0‐5 feet of trees and shrubs.',
      'EACH bank has at least 5‐20 feet of trees and shrubs.',
      'EACH bank has at least 20‐50 feet of trees and shrubs.',
      'More than 50 feet of trees and shrubs extending out from EACH bank of the stream.'
    ]
  },
  {
    title: 'Bank Stability',
    description: 'Are the banks of the stream steep or more gradually sloped? More vertical = more unstable.',
    options: [
      'Banks extremely high compared to water surface (70 to 90-degree slope). More than half of bank surface area eroded.',
      'Banks steep (45 to-70-degree slope) with approximately half of bank surface showing erosion.',
      'Bank slope steeper (20 to 45-degree slope) and higher than water surface, less than half of bank surface showing erosion.',
      'Top of bank only slightly higher than water surface, bank gradually sloped (less than 20-degree incline). Minimal evidence of erosion.'
    ]
  },
  {
    title: 'Velocity & Depth Combinations',
    description: 'A variety of combinations provides a range of habitat conditions that support aquatic life.',
    options: [
      'Stream has only 1 type of velocity and depth combination.',
      'Stream has 2 of the velocity and depth combinations.',
      'Stream has 3 of the velocity and depth combinations.',
      'Stream has areas of (a) fast/deep water, (b) fast/shallow water, (c) slow/shallow areas, and (d) slow/deep areas.'
    ]
  }
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
  if (!streamLocationDescription.value) formErrors.value.push('Stream Location Description');
  
  return formErrors.value.length === 0;
});

// Function to check if user can edit the form
const canEditForm = async () => {
  if (isAdmin.value) return true;
  if (!isEditMode.value || !sampleId.value) return true; // Allow new sample creation
  
  try {
    // Fetch the sample to check ownership
    const sample = await useDirectus(
      readItem('habitat_samples', sampleId.value, {
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

// File upload functions (adapted for habitat samples)
const uploadFiles = async (sampleId, siteId, files, formType) => {
  console.log('Uploading files for sample:', sampleId, 'site:', siteId, 'formType:', formType);
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
      readItems('lu_habitat_photos', {
        filter: { sample_id: { _eq: sampleId } }
      })
    );

    for (const { type, extension, origPhotoName, isImage } of uploadedFiles) {
      const finalExtension = type === 'form' ? extension : 'png';
      const filePath = `https://kyww.uky.edu/webshare/kyww_images/hab/${siteId}/${sampleId}/${type}_${sampleId}.${finalExtension}`;
      const existingRecord = existingRecords.find(record => record.type === type);

      const photoData = {
        file_path: filePath,
        origphotoname: origPhotoName,
        is_image: type === 'form' ? isImage : true
      };

      if (existingRecord) {
        await useDirectus(
          updateItem('lu_habitat_photos', existingRecord.id, photoData)
        );
      } else {
        await useDirectus(
          createItem('lu_habitat_photos', {
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

    await useDirectus(updateItem('habitat_samples', sampleId, {
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
      filter: { habitat_samples_id: { _eq: sampleId } }
    }));

    if (!relatedIds || !relatedIds.length) {
      return;
    }

    const relatedIdColumn = tableName === 'habitat_samples_directus_users' 
      ? 'directus_users_id' 
      : tableName.replace('habitat_samples_', '') + '_id';

    const items = relatedIds.map(id => ({
      habitat_samples_id: sampleId,
      [relatedIdColumn]: id
    }));

    await useDirectus(createItems(tableName, items));
  } catch (error) {
    console.error(`Error updating join table ${tableName}:`, error);
    throw new Error(`Failed to update ${tableName}: ${error.message}`);
  }
};

// Prepare habitat sample data
const prepareHabitatData = () => {

  const baseData = {
    status: 'finalized',
    volunteer_id: volunteer_id.value,
    wwky_id: wwkyid_pk.value,
    participants_adults: adults.value === 0 ? 0 : toNullableInteger(adults.value),
    participants_youth: youths.value === 0 ? 0 : toNullableInteger(youths.value),
    total_volunteer_minutes: totalVolunteerMinutes.value === 0 ? 0 : toNullableInteger(totalVolunteerMinutes.value),
    miles_driven: milesDriven.value === 0 ? 0 : toNullableInteger(milesDriven.value),
    date: date.value,
    start_time: startTime.value || null,
    other_samplers: otherSamplers.value || null,
    other_observations: otherObs.value || null,
    stream_location_description: streamLocationDescription.value || null,
    
    // Land use fields - matching exact schema field names
    landuse_industrial: landUseIndustrial.value,
    landuse_downtown: landUseDowntown.value,
    landuse_suburban: landUseSuburban.value,
    landuse_commercial: landUseCommercial.value,
    landuse_openspace: landUseOpenspace.value,
    landuse_agriculture: landUseAgriculture.value,
    landuse_other: landUseOther.value || null,
    
    // Pollutant indicators
    odor: odor.value || null,
    color: color.value || null,
    floatables: floatables.value || null,
    
    // Physical assessment scores - matching exact schema field names
    physicalassessment_vegetation: selectedOptions.value[0] || null,
    physicalassessment_channelalteration: selectedOptions.value[1] || null,
    physicalassessment_embeddedness: selectedOptions.value[2] || null,
    physicalassessment_erosion: selectedOptions.value[3] || null,
    physicalassessment_macroinvertebrates: selectedOptions.value[4] || null,
    physicalassessment_fish: selectedOptions.value[5] || null,
    physicalassessment_riparianwidth: selectedOptions.value[6] || null,
    physicalassessment_bankstability: selectedOptions.value[7] || null,
    physicalassessment_velocitydepth: selectedOptions.value[8] || null,
    
    // Calculate habitat score
    physical_assessment_score: habitatScore.value
  };

  // Debug logging
  console.log('=== HABITAT DATA PREPARATION ===');
  console.log('Land use values:', {
    landuse_industrial: landUseIndustrial.value,
    landuse_downtown: landUseDowntown.value,
    landuse_suburban: landUseSuburban.value,
    landuse_commercial: landUseCommercial.value,
    landuse_openspace: landUseOpenspace.value,
    landuse_agriculture: landUseAgriculture.value,
    landuse_other: landUseOther.value
  });
  console.log('Pollutant indicators:', {
    odor: odor.value,
    color: color.value,
    floatables: floatables.value
  });
  console.log('Physical assessment scores:', selectedOptions.value);
  console.log('Final baseData being sent:', baseData);

  return { baseData };
};

// Fetch habitat sample data for editing
const fetchHabitatData = async (id: string) => {
  isLoading.value = true;
  try {
    await fetchSamplers();
    
    const sampleData = await useDirectus(
      readItem('habitat_samples', id, {
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
        description: 'Habitat sample not found',
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
    startTime.value = sampleData.start_time || null;
    
    adults.value = sampleData.participants_adults !== null ? parseInt(sampleData.participants_adults) : null;
    youths.value = sampleData.participants_youth !== null ? parseInt(sampleData.participants_youth) : null;
    totalVolunteerMinutes.value = sampleData.total_volunteer_minutes !== null ? parseInt(sampleData.total_volunteer_minutes) : null;
    milesDriven.value = sampleData.miles_driven !== null ? parseInt(sampleData.miles_driven) : null;
    otherSamplers.value = sampleData.other_samplers || '';
    streamLocationDescription.value = sampleData.stream_location_description || '';

    // Additional samplers
    const additionalSamplersData = await useDirectus(
      readItems('habitat_samples_directus_users', {
        filter: { habitat_samples_id: { _eq: id } },
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

    // Land use fields - matching exact schema field names
    landUseIndustrial.value = sampleData.landuse_industrial || false;
    landUseDowntown.value = sampleData.landuse_downtown || false;
    landUseSuburban.value = sampleData.landuse_suburban || false;
    landUseCommercial.value = sampleData.landuse_commercial || false;
    landUseOpenspace.value = sampleData.landuse_openspace || false;
    landUseAgriculture.value = sampleData.landuse_agriculture || false;
    landUseOther.value = sampleData.landuse_other || '';

    // Pollutant indicators
    odor.value = sampleData.odor || '';
    color.value = sampleData.color || '';
    floatables.value = sampleData.floatables || '';

    // Physical assessment scores - matching exact schema field names
    selectedOptions.value = [
      sampleData.physicalassessment_vegetation,
      sampleData.physicalassessment_channelalteration,
      sampleData.physicalassessment_embeddedness,
      sampleData.physicalassessment_erosion,
      sampleData.physicalassessment_macroinvertebrates,
      sampleData.physicalassessment_fish,
      sampleData.physicalassessment_riparianwidth,
      sampleData.physicalassessment_bankstability,
      sampleData.physicalassessment_velocitydepth
    ];

    // Other observations  
    otherObs.value = sampleData.other_observations || '';

    // Handle photos
    if (sampleData.photos_added || sampleData.form_added) {
      try {
        const photoRecords = await useDirectus(
          readItems('lu_habitat_photos', {
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
    console.error('Error fetching habitat data:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to load habitat assessment data',
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
    submissionStatus.value = 'Submitting habitat assessment...';
    submissionProgress.value = 25;

    if (isEditMode.value) {
      const { baseData } = prepareHabitatData();
      await useDirectus(updateItem('habitat_samples', sampleId.value, baseData));
      await updateJoinTable('habitat_samples_directus_users', sampleId.value, selectedSamplerIds.value);
      
      if (selectedFiles.value && (Object.keys(selectedFiles.value).length > 0 || selectedFiles.value.sampleFormFile)) {
        const uploadedFileTypes = await uploadFiles(sampleId.value, wwkyid_pk.value, selectedFiles.value, "hab");
        await createOrUpdatePhotoRecords(sampleId.value, wwkyid_pk.value, uploadedFileTypes);
        await updateSampleWithPhotoInfo(sampleId.value, selectedFiles.value);
      }
      
      toast.add({
        title: 'Success',
        description: 'Habitat assessment updated successfully',
        color: 'green'
      });
    } else {
      const { baseData } = prepareHabitatData();
      const createdSample = await useDirectus(createItem('habitat_samples', baseData));
      
      createdSampleId = createdSample.id;
      sampleSiteId = createdSample.wwky_id;
      
      await updateJoinTable('habitat_samples_directus_users', createdSampleId, selectedSamplerIds.value);

      submissionStatus.value = 'Uploading photos...';
      submissionProgress.value = 75;

      const formType = "hab";
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
    await deleteJoinTableEntries('habitat_samples_directus_users', sampleId);
    await useDirectus(deleteItem('habitat_samples', sampleId));
    await useDirectus(deleteItems('lu_habitat_photos', {
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
      filter: { habitat_samples_id: { _eq: sampleId } }
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
  navigateTo('/portal/habitat');
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
  streamLocationDescription.value = '';
  
  // Reset land use fields
  landUseIndustrial.value = false;
  landUseDowntown.value = false;
  landUseSuburban.value = false;
  landUseCommercial.value = false;
  landUseOpenspace.value = false;
  landUseAgriculture.value = false;
  landUseOther.value = '';
  
  // Reset pollutant indicators
  odor.value = '';
  color.value = '';
  floatables.value = '';
  
  // Reset physical assessment scores
  selectedOptions.value = Array(9).fill(null);
  
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
        await fetchHabitatData(sampleId.value);
      } catch (error) {
        console.error('Error fetching habitat data:', error);
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
          description: 'You do not have permission to edit this habitat assessment.',
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
          description: 'You do not have permission to edit this habitat assessment.',
          color: 'red'
        });
        navigateTo('/portal/');
      }
    }
    if (newPath === '/portal/habitat' && oldPath !== newPath) {
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
    fetchHabitatData(newSampleId);
  }
});
</script>

<template>
<PolicyGuard path="/portal/habitat">
  <div>
    <ClientOnly>
      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center min-h-screen">
        <ULoader />
      </div>

      <div v-else>
        <PortalPageHeader
          :title="isEditMode ? 'Edit Habitat Assessment ('+ sampleId +')' : 'New Habitat Assessment'"
          :breadcrumbs="isEditMode ? [
            {
              title: 'Portal',
              href: '/portal',
            },
            {
              title: 'Edit Habitat Assessment',
              href: '#',
            }
          ] : [
            {
              title: 'Portal',
              href: '/portal',
            },
            {
              title: 'New Habitat Assessment',
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
                ? `Habitat assessment ${sampleId} has been successfully updated.`
                : `Your habitat assessment (number: ${submittedSampleId}) has been successfully submitted.`
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
          <h1 class="text-2xl text-center text-gray-900 bg-lime-500 border-4 border-gray-900 mb-4">
            Kentucky Watershed Watch Habitat Assessment Form
          </h1>

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
                <div class="flex">
                  <UFormGroup class="p-2 basis-1/1" required>
                    <label class="block mb-1 required-field">Stream Location Description:</label>
                    <UInput 
                      v-model="streamLocationDescription" 
                      placeholder="Describe the specific location along the stream where assessment was conducted"
                      required 
                    />
                  </UFormGroup>
                </div>
                <div class="p-2 text-sm text-right">
                  <h1>Total time spent sampling at multiple sites should only be entered once.</h1>
                  <h1>Total miles driven to sample at multiple sites should only be entered once.</h1>
                </div>
              </div>

              <!-- Land Use Section -->
              <div class="border-b-4 border-l-4 border-r-4 border-gray-900 mb-6">
                <h2 class="text-2xl text-center border-b-2 border-gray-900 bg-lime-500 text-gray-900">
                  Land Use in Drainage Area (Check all that apply)
                </h2>
                <p class="text-center p-2">
                  NOTE: For this section, you can use visual indicators of land use, as well as your general familiarity with
                  the area.
                </p>
                <div class="flex p-4">
                  <UFormGroup class="basis-1/2">
                    <div class="space-y-2">
                      <UCheckbox v-model="landUseIndustrial" label="Industrial" />
                      <UCheckbox v-model="landUseDowntown" label="Downtown Residential" />
                      <UCheckbox v-model="landUseSuburban" label="Suburban Residential" />
                      <UCheckbox v-model="landUseCommercial" label="Commercial" />
                      <UCheckbox v-model="landUseOpenspace" label="Open Space" />
                      <UCheckbox v-model="landUseAgriculture" label="Agriculture" />
                      <UInput v-model="landUseOther" placeholder="Other (specify)" class="mt-2" />
                    </div>
                  </UFormGroup>
                </div>
              </div>

              <!-- Pollutant Indicators Section -->
              <div class="border-b-4 border-l-4 border-r-4 border-gray-900 mb-6">
                <h2 class="text-2xl text-center border-b-2 border-gray-900 bg-lime-500 text-gray-900">
                  Pollutant Indicators
                </h2>
                <p class="text-center border-b-2 border-gray-900 p-2">
                  Provide a brief description of any potential pollutant indicators you notice. These indicators may range
                  from strange odors, unusual colors, or floatables (suds, sewage, or petroleum). Refer to guidance, if
                  needed.
                </p>
                <div class="grid grid-cols-6 border-gray-900">
                  <div class="text-center border-b-2 border-r-2 p-2 border-gray-900 bg-gray-100">
                    <b>Indicator</b>
                  </div>
                  <div class="text-center p-2 border-b-2 col-span-5 border-gray-900 bg-gray-100">
                    <b>Description</b>
                  </div>
                  <div class="text-center border-b-2 border-r-2 p-2 border-gray-900 bg-gray-50">Odor</div>
                  <div class="col-span-5 p-2 border-b-2 border-gray-900">
                    <UTextarea v-model="odor" placeholder="Describe any unusual odors..." />
                  </div>
                  <div class="text-center p-2 border-b-2 border-r-2 border-gray-900 bg-gray-50">Color</div>
                  <div class="col-span-5 p-2 border-b-2 border-gray-900">
                    <UTextarea v-model="color" placeholder="Describe any unusual water color..." />
                  </div>
                  <div class="text-center p-2 border-r-2 border-gray-900 bg-gray-50">Floatables on water surface</div>
                  <div class="col-span-5 p-2 border-gray-900">
                    <UTextarea v-model="floatables" placeholder="Describe any floating materials..." />
                  </div>
                </div>
              </div>

              <!-- Physical Assessment Section -->
              <h1 class="text-2xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 bg-lime-500">
                Physical Assessment: Stream Corridor Assessment
              </h1>
              <p class="text-center text-gray-900 border-l-4 border-r-4 border-gray-900 p-2">
                <em>Based on Stream Corridor Assessment protocol from Maryland Department of Natural Resources.</em>
                <br />
                <b>Instructions:</b>
                Select a stream segment of 100+ feet and observe the stream habitat in and on both sides of the water. Select
                the closest descriptions to that of your stream segment for each habitat characteristic.
              </p>

              <!-- Habitat Score Display -->
              <h2
                v-if="selectedOptions.every((option) => option !== null)"
                class="text-xl text-center text-gray-900 border-t-4 border-l-4 border-r-4 border-gray-900 p-2"
                :class="{
                  'bg-red-500': habitatScore <= 15,
                  'bg-orange-500': habitatScore >= 16 && habitatScore <= 22,
                  'bg-yellow-500': habitatScore >= 23 && habitatScore <= 29,
                  'bg-green-500': habitatScore >= 30
                }"
              >
                Stream Corridor Score: {{ habitatScore }} - 
                {{ habitatScore <= 15 ? 'Poor' : '' }}
                {{ habitatScore >= 16 && habitatScore <= 22 ? 'Marginal' : '' }}
                {{ habitatScore >= 23 && habitatScore <= 29 ? 'Fair' : '' }}
                {{ habitatScore >= 30 ? 'Good' : '' }}
              </h2>
              <h2
                v-else
                class="text-xl text-center text-gray-900 border-t-4 border-l-4 border-r-4 border-gray-900 bg-lime-500 p-2"
              >
                Please select an option for each habitat characteristic.
              </h2>

              <!-- Physical Assessment Grid -->
              <div class="border-4 border-gray-900 mb-6">
                <div v-for="(item, groupIndex) in habitatItems" :key="groupIndex" class="grid-container">
                  <div class="grid-item title-cell">
                    <p class="title">
                      <strong>{{ item.title }}</strong>
                    </p>
                    <p class="description">{{ item.description }}</p>
                  </div>
                  <div
                    v-for="(option, optionIndex) in item.options"
                    :key="optionIndex"
                    class="grid-item option-cell"
                    :class="{ 'selected bg-lime-500 text-gray-900': selectedOptions[groupIndex] === optionIndex + 1 }"
                    @click="selectedOptions[groupIndex] = optionIndex + 1"
                  >
                    <div class="clickable">
                      <input
                        :id="`option_${groupIndex}_${optionIndex}`"
                        v-model="selectedOptions[groupIndex]"
                        type="radio"
                        :value="optionIndex + 1"
                        style="display: none"
                      />
                      <div>{{ option }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Final Score Display -->
              <h2
                v-if="selectedOptions.every((option) => option !== null)"
                class="text-xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 p-2 mb-6"
                :class="{
                  'bg-red-500': habitatScore <= 15,
                  'bg-orange-500': habitatScore >= 16 && habitatScore <= 22,
                  'bg-yellow-500': habitatScore >= 23 && habitatScore <= 29,
                  'bg-green-500': habitatScore >= 30
                }"
              >
                Stream Corridor Score: {{ habitatScore }} - 
                {{ habitatScore <= 15 ? 'Poor' : '' }}
                {{ habitatScore >= 16 && habitatScore <= 22 ? 'Marginal' : '' }}
                {{ habitatScore >= 23 && habitatScore <= 29 ? 'Fair' : '' }}
                {{ habitatScore >= 30 ? 'Good' : '' }}
              </h2>
              <h2
                v-else
                class="text-xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 bg-lime-500 p-2 mb-6"
              >
                Please select an option for each habitat characteristic.
              </h2>

              <!-- Other Observations and Photo Upload Section -->
              <div class="flex mb-6">
                <div class="border-4 p-4 border-gray-900 w-1/2 mr-2">
                  <h2 class="text-lg mb-3">Other Observations or Measurements</h2>
                  <UFormGroup>
                    <UTextarea 
                      v-model="otherObs" 
                      rows="10"
                      class="w-full min-h-[200px] resize-y"
                      placeholder="Enter any additional observations or measurements here..."
                    />
                  </UFormGroup>
                </div>
                <div class="border-4 p-4 border-gray-900 w-1/2">
                  <UFormGroup>
                    <PhotoUpload 
                      ref="photoUpload"
                      @filesSelected="handleFilesSelected"
                      :key="sampleId"
                      :initial-photos="existingPhotos"
                      :site-id="wwkyid_pk"
                      form-type="hab"
                    />
                  </UFormGroup>
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
                  ? 'Are you sure you want to save these changes to the habitat assessment? Please review your modifications before confirming.'
                  : 'Are you sure you want to submit this habitat assessment? Please review your entries before confirming.'
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

/* Physical Assessment Grid Styles */
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  border-bottom: 2px solid #374151;
}

.grid-item {
  border: 1px solid #9CA3AF;
  padding: 12px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.title-cell {
  background-color: #F3F4F6;
  border-right: 2px solid #374151;
  font-weight: bold;
}

.option-cell {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background-color: #FFFFFF;
}

.option-cell:hover {
  background-color: #F9FAFB;
  transform: translateY(-1px);
}

.option-cell.selected {
  background-color: #84CC16 !important;
  color: #1F2937 !important;
  font-weight: bold;
  border: 2px solid #65A30D;
}

.clickable {
  cursor: pointer;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.title {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.description {
  font-size: 12px;
  color: #6B7280;
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
  }
  
  .grid-item {
    min-height: 80px;
  }
  
  .title {
    font-size: 16px;
  }
  
  .description {
    font-size: 14px;
  }
}
</style>