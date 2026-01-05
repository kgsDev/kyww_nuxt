<script setup lang="ts">
// /habitat/index.vue - Habitat assessment form for KYWW
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
const isWarningModalOpen = ref(false);
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

// Image modal state
const isImageModalOpen = ref(false);
const selectedImageIndex = ref<number | null>(null);

// Habitat assessment specific fields
const siteNumber = ref();

// Land use checkboxes - matching schema field names
const landUseIndustrial = ref(false);
const landUseDowntown = ref(false);
const landUseSuburban = ref(false);
const landUseCommercial = ref(false);
const landUseOpenspace = ref(false);
const landUseAgriculture = ref(false);
const landUseOther = ref('');

// Pollutant indicators - matching sample form structure
const odorNone = ref(false);
const odorRottenEggs = ref(false);
const odorChlorine = ref(false);
const odorRancidSour = ref(false);
const odorGasPetro = ref(false);
const odorMusty = ref(false);
const odorSweetFruity = ref(false);
const odorSharpPungent = ref(false);

// Water color - multiple selection allowed
const waterColorOptions = [
  { value: 1, label: 'Clear' },
  { value: 2, label: 'Brown/Muddy' },
  { value: 3, label: 'Green' },
  { value: 4, label: 'White' },
  { value: 5, label: 'Gray' },
  { value: 6, label: 'Orange' }
];
const waterColor = ref([]);

// Floatables on water surface
const waterSurfaceNone = ref(false);
const waterSurfaceOilSheen = ref(false);
const waterSurfaceAlgae = ref(false);
const waterSurfaceSoapSuds = ref(false);
const waterSurfaceSewage = ref(false);

// Physical assessment - 9 categories, each with 4 options (1-4, where 4 is best)
const selectedOptions = ref(Array(9).fill(null));

// Other observations
const otherObs = ref('');

// Computed habitat score - corrected to use values 1-4 where 4 is best
const habitatScore = computed(() => {
  const validSelections = selectedOptions.value.filter(val => val !== null);
  if (validSelections.length === 0) return 0;
  
  // Sum up the scores (1=Poor, 2=Marginal, 3=Fair, 4=Good)
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
  
  return formErrors.value.length === 0;
});

// Function to check if user can edit the form
const canEditForm = async () => {
  if (isAdmin.value) return true;
  if (!isEditMode.value || !sampleId.value) return true;
  
  try {
    const sample = await useDirectus(
      readItem('habitat_samples', sampleId.value, {
        fields: [
          'volunteer_id',
          'user_created.id'
        ]
      })
    );

    return sample?.volunteer_id === user.value?.id ||
           sample?.user_created?.id === user.value?.id;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Helper functions
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

// Image modal functions
const openImageModal = (index: number) => {
  selectedImageIndex.value = index;
  isImageModalOpen.value = true;
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  selectedImageIndex.value = null;
};

const getImagePath = (index: number) => {
  const images = [
    '@/assets/form_icons/vegetation.webp',
    '@/assets/form_icons/streamchannel.webp',
    '@/assets/form_icons/embeddedness.webp',
    '@/assets/form_icons/erosion.webp',
    '@/assets/form_icons/macroinvertebrates.webp',
    '@/assets/form_icons/fish.webp',
    '@/assets/form_icons/riparian_buffer.webp',
    '@/assets/form_icons/bank_stability.webp',
    '@/assets/form_icons/velocity_depth.webp'
  ];
  return images[index];
};

const getImageTitle = (index: number) => {
  return habitatItems[index]?.title || '';
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

const validateFiles = (files) => {
  if (!files) return true;
  
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

const uploadFiles = async (sampleId, siteId, files, formType) => {
  const formData = new FormData();
  formData.append('sampleId', sampleId);
  formData.append('siteId', siteId);
  formData.append('formType', formType);
  
  const uploadedFiles = [];

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

// Helper function to get selected odors
const getSelectedOdors = () => {
  const odorValues = [
    { field: odorNone, value: 1 },
    { field: odorRottenEggs, value: 2 },
    { field: odorChlorine, value: 3 },
    { field: odorRancidSour, value: 4 },
    { field: odorGasPetro, value: 6 },
    { field: odorMusty, value: 7 },
    { field: odorSweetFruity, value: 8 },
    { field: odorSharpPungent, value: 9 },
  ];
  return odorValues.filter(odor => odor.field.value).map(odor => odor.value);
};

// Helper function to get selected water surfaces (floatables)
const getSelectedWaterSurfaces = () => {
  const waterSurfaceValues = [
    { field: waterSurfaceNone, value: 1 },
    { field: waterSurfaceOilSheen, value: 2 },
    { field: waterSurfaceAlgae, value: 3 },
    { field: waterSurfaceSoapSuds, value: 4 },
    { field: waterSurfaceSewage, value: 5 },
  ];
  return waterSurfaceValues.filter(surface => surface.field.value).map(surface => surface.value);
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
    
    landuse_industrial: landUseIndustrial.value,
    landuse_downtown: landUseDowntown.value,
    landuse_suburban: landUseSuburban.value,
    landuse_commercial: landUseCommercial.value,
    landuse_openspace: landUseOpenspace.value,
    landuse_agriculture: landUseAgriculture.value,
    landuse_other: landUseOther.value || null,
    
    physicalassessment_vegetation: selectedOptions.value[0] || null,
    physicalassessment_channelalteration: selectedOptions.value[1] || null,
    physicalassessment_embeddedness: selectedOptions.value[2] || null,
    physicalassessment_erosion: selectedOptions.value[3] || null,
    physicalassessment_macroinvertebrates: selectedOptions.value[4] || null,
    physicalassessment_fish: selectedOptions.value[5] || null,
    physicalassessment_riparianwidth: selectedOptions.value[6] || null,
    physicalassessment_bankstability: selectedOptions.value[7] || null,
    physicalassessment_velocitydepth: selectedOptions.value[8] || null,
    
    physical_assessment_score: habitatScore.value
  };

  return { 
    baseData,
    relationshipData: {
      odor: getSelectedOdors(),
      water_surface: getSelectedWaterSurfaces(),
      water_color: waterColor.value
    }
  };
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

    if (sampleData.volunteer_id) {
      const matchingSampler = availableSamplers.value.find(s => 
        s.first_name === sampleData.volunteer_id.first_name && 
        s.last_name === sampleData.volunteer_id.last_name
      );
      if (matchingSampler) {
        volunteer_id.value = matchingSampler.id;
      }
    }

    wwkyid_pk.value = sampleData.wwky_id ? parseInt(sampleData.wwky_id) : null;
    directSiteId.value = wwkyid_pk.value ? wwkyid_pk.value.toString() : '';
    date.value = sampleData.date?.split('T')[0] || null;
    startTime.value = sampleData.start_time || null;
    
    adults.value = sampleData.participants_adults !== null ? parseInt(sampleData.participants_adults) : null;
    youths.value = sampleData.participants_youth !== null ? parseInt(sampleData.participants_youth) : null;
    totalVolunteerMinutes.value = sampleData.total_volunteer_minutes !== null ? parseInt(sampleData.total_volunteer_minutes) : null;
    milesDriven.value = sampleData.miles_driven !== null ? parseInt(sampleData.miles_driven) : null;
    otherSamplers.value = sampleData.other_samplers || '';

    const additionalSamplersData = await useDirectus(
      readItems('habitat_samples_directus_users', {
        filter: { habitat_samples_id: { _eq: id } },
        fields: ['directus_users_id.*']
      })
    );

    if (additionalSamplersData && additionalSamplersData.length > 0) {
      const extractedIds = additionalSamplersData
        .map(s => s.directus_users_id.id)
        .filter(id => id !== sampleData.volunteer_id?.id);
      
      selectedSamplerIds.value = extractedIds;
    } else {
      selectedSamplerIds.value = [];
    }

    landUseIndustrial.value = sampleData.landuse_industrial || false;
    landUseDowntown.value = sampleData.landuse_downtown || false;
    landUseSuburban.value = sampleData.landuse_suburban || false;
    landUseCommercial.value = sampleData.landuse_commercial || false;
    landUseOpenspace.value = sampleData.landuse_openspace || false;
    landUseAgriculture.value = sampleData.landuse_agriculture || false;
    landUseOther.value = sampleData.landuse_other || '';

    // Fetch related data from join tables
    const [odors, waterSurfaces, waterColors] = await Promise.all([
      fetchRelatedData('habitat_samples_lu_odor', id),
      fetchRelatedData('habitat_samples_lu_water_surface', id),
      fetchRelatedData('habitat_samples_lu_water_color', id)
    ]);

    // Set odor checkboxes
    odorNone.value = odors?.includes(1) ?? false;
    odorRottenEggs.value = odors?.includes(2) ?? false;
    odorChlorine.value = odors?.includes(3) ?? false;
    odorRancidSour.value = odors?.includes(4) ?? false;
    odorGasPetro.value = odors?.includes(6) ?? false;
    odorMusty.value = odors?.includes(7) ?? false;
    odorSweetFruity.value = odors?.includes(8) ?? false;
    odorSharpPungent.value = odors?.includes(9) ?? false;

    // Set water surface (floatables) checkboxes
    waterSurfaceNone.value = waterSurfaces?.includes(1) ?? false;
    waterSurfaceOilSheen.value = waterSurfaces?.includes(2) ?? false;
    waterSurfaceAlgae.value = waterSurfaces?.includes(3) ?? false;
    waterSurfaceSoapSuds.value = waterSurfaces?.includes(4) ?? false;
    waterSurfaceSewage.value = waterSurfaces?.includes(5) ?? false;

    // Set water colors (multiple selection)
    waterColor.value = waterColors || [];

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

    otherObs.value = sampleData.other_observations || '';

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

// Helper function to fetch related data
const fetchRelatedData = async (table: string, sampleId: string) => {
  const response = await useDirectus(
    readItems(table, {
      filter: {
        habitat_samples_id: { _eq: sampleId }
      }
    })
  );
  return response.map(item => item[`${table.replace('habitat_samples_', '')}_id`]);
};

// Confirmation and submission functions
const confirmSubmission = () => {
  showValidationErrors.value = true;
  
  if (isFormValid.value) {
    isConfirmationModalOpen.value = true;
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.add({ 
      title: 'Form Validation Error', 
      description: `Please fix ${formErrors.value.length} error${formErrors.value.length > 1 ? 's' : ''} before submitting.`,
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
      const { baseData, relationshipData } = prepareHabitatData();
      await useDirectus(updateItem('habitat_samples', sampleId.value, baseData));
      
      await updateJoinTable('habitat_samples_lu_odor', sampleId.value, relationshipData.odor);
      await updateJoinTable('habitat_samples_lu_water_surface', sampleId.value, relationshipData.water_surface);
      await updateJoinTable('habitat_samples_lu_water_color', sampleId.value, relationshipData.water_color);
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
      const { baseData, relationshipData } = prepareHabitatData();
      const createdSample = await useDirectus(createItem('habitat_samples', baseData));
      
      createdSampleId = createdSample.id;
      sampleSiteId = createdSample.wwky_id;
      
      await updateJoinTable('habitat_samples_lu_odor', createdSampleId, relationshipData.odor);
      await updateJoinTable('habitat_samples_lu_water_surface', createdSampleId, relationshipData.water_surface);
      await updateJoinTable('habitat_samples_lu_water_color', createdSampleId, relationshipData.water_color);
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
    await deleteJoinTableEntries('habitat_samples_lu_odor', sampleId);
    await deleteJoinTableEntries('habitat_samples_lu_water_surface', sampleId);
    await deleteJoinTableEntries('habitat_samples_lu_water_color', sampleId);
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
  
  landUseIndustrial.value = false;
  landUseDowntown.value = false;
  landUseSuburban.value = false;
  landUseCommercial.value = false;
  landUseOpenspace.value = false;
  landUseAgriculture.value = false;
  landUseOther.value = '';
  
  odorNone.value = false;
  odorRottenEggs.value = false;
  odorChlorine.value = false;
  odorRancidSour.value = false;
  odorGasPetro.value = false;
  odorMusty.value = false;
  odorSweetFruity.value = false;
  odorSharpPungent.value = false;
  
  waterColor.value = [];
  
  waterSurfaceNone.value = false;
  waterSurfaceOilSheen.value = false;
  waterSurfaceAlgae.value = false;
  waterSurfaceSoapSuds.value = false;
  waterSurfaceSewage.value = false;
  
  selectedOptions.value = Array(9).fill(null);
  
  otherObs.value = '';
  
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

        <!-- Enhanced Validation Errors - Always visible when there are errors and sticky -->
        <div v-if="formErrors.length > 0" class="sticky top-4 z-40 mb-6">
          <div class="bg-orange-50 border-2 border-orange-400 p-4 rounded-lg shadow-lg max-w-2xl mx-auto">
            <div class="flex">
              <div class="flex-shrink-0">
                <UIcon 
                  name="i-heroicons-exclamation-triangle" 
                  class="h-5 w-5 text-orange-400"
                />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-orange-800">
                  Please complete these required fields:
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

        <!-- Submission Confirmation Screen -->
        <div v-if="isSubmitted" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-white p-4 sm:p-8 rounded-lg shadow-xl text-center max-w-md w-full">
            <h2 class="text-xl sm:text-2xl font-bold mb-4">Thank You!</h2>
            <p class="mb-4 text-sm sm:text-base">
              {{ isEditMode 
                ? `Habitat assessment ${sampleId} has been successfully updated.`
                : `Your habitat assessment (number: ${submittedSampleId}) has been successfully submitted.`
              }}
            </p>
            <p v-if="uploadedFileTypes.length > 0" class="mb-4 text-sm sm:text-base">Photos have also been uploaded.</p>
            <div class="flex flex-col sm:flex-row gap-2 sm:space-x-4 sm:space-y-0">
              <UButton 
                variant="solid" 
                @click="viewDashboard" 
                label="View Dashboard" 
                class="w-full sm:w-auto"
              />
              <UButton 
                v-if="!isEditMode"
                variant="outline" 
                @click="handleNewSample" 
                label="Submit Another Assessment" 
                class="w-full sm:w-auto"
              />
              <UButton
                v-if="wwkyid_pk"
                variant="outline"
                @click="viewSite"
                :label="`View Site ${wwkyid_pk}`"
                class="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        <!-- Main Form -->
        <div v-else class="max-w-7xl mx-auto p-2 sm:p-4">
          <h3 class="text-2xl sm:text-3xl text-center text-gray-900 border-2 border-gray-900 mb-4 bg-lime-500 font-bold p-2">Kentucky Watershed Watch Habitat Assessment Form</h3>

          <!-- PDF Download Link -->
          <div class="my-4 text-center">
            <a 
              href="https://kyww.uky.edu/webshare/kyww_images/Habitat%20assessment%20form%2020250815.pdf" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm text-sm sm:text-base"
            >
              <UIcon name="i-heroicons-document-text" class="mr-2" />
              Download PDF Version of Form
            </a>
            <p class="mt-2 text-xs sm:text-sm text-gray-600">Access the printable version of this form for field use</p>
          </div>

          <Form @submit.prevent="submitData">
            <div class="space-y-4">
              <!-- Header Section - Same as Sample Form -->
              <div class="border-4 p-2 sm:p-4 border-gray-900">
                <div class="p-2 mb-4">
                  <h1 class="text-lg sm:text-xl font-bold text-left text-gray-900 required-field">Required Fields</h1>
                </div>
                
                <!-- Responsive grid for form fields -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <UFormGroup class="lg:col-span-1" required>
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
                      :class="{ 'border-red-500': !volunteer_id && showValidationErrors }"
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
                  
                  <UFormGroup class="lg:col-span-2">
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
                          class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
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
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <UFormGroup required>
                    <label class="block mb-1 required-field"># Adult Participants:</label>
                    <UInput
                      v-model="adults"
                      icon="ic:baseline-group"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                      :class="{ 'border-red-500': (adults === null || adults === undefined) && showValidationErrors }"
                    />
                  </UFormGroup>
                  <UFormGroup required>
                    <label class="block mb-1 required-field"># Youth Participants:</label>
                    <UInput
                      v-model="youths"
                      icon="healthicons:child-program"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                      :class="{ 'border-red-500': (youths === null || youths === undefined) && showValidationErrors }"
                    />
                  </UFormGroup>
                  <UFormGroup required>
                    <label class="block mb-1 required-field">Total Volunteer Minutes:</label>
                    <UInput
                      v-model="totalVolunteerMinutes"
                      placeholder="Travel+Sampling"
                      type="number"
                      min="0"
                      required
                      :class="{ 'border-red-500': (totalVolunteerMinutes === null || totalVolunteerMinutes === undefined) && showValidationErrors }"
                    />
                  </UFormGroup>
                  <UFormGroup required>
                    <label class="block mb-1 required-field">Miles Driven:</label>
                    <UInput
                      v-model="milesDriven"
                      icon="fa-solid:car-side"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                      :class="{ 'border-red-500': (milesDriven === null || milesDriven === undefined) && showValidationErrors }"
                    />
                  </UFormGroup>
                </div>
                
                <div class="w-full mt-4">
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

                <!-- Site Information -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                  <UFormGroup>
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
                    <p v-if="isSiteIdValid === false" class="text-red-500 mt-1 text-sm">Invalid Site ID</p>
                    <p v-if="isSiteIdValid === true" class="text-green-500 mt-1 text-sm">Valid Site ID</p>
                    <label class="block mb-1 text-xs sm:text-sm">(To verify site after entry, click outside of box or press tab)</label>
                  </UFormGroup>
                  <UFormGroup>
                    <label class="block mb-1">or Select/Create a Site:</label>
                    <UButton label="Open Map" @click="openMap" class="w-full sm:w-auto" />
                  </UFormGroup>
                  <UFormGroup required>
                    <label class="block mb-1 required-field">Site ID:</label>
                    <UInput 
                      :model-value="wwkyid_pk !== null ? wwkyid_pk.toString() : ''" 
                      icon="bxs:been-here" 
                      :disabled="true" 
                      required
                      :class="{ 'border-red-500': !wwkyid_pk && showValidationErrors }"
                    />
                  </UFormGroup>
                  <UFormGroup>
                    <label class="block mb-1">Stream Name:</label>
                    <UInput v-model="stream_name" icon="mdi:water" :disabled="true"/>
                  </UFormGroup>
                  <UFormGroup>
                    <label class="block mb-1">Basin:</label>
                    <UInput v-model="wwkybasin" icon="mdi:terrain" :disabled="true"/>
                  </UFormGroup>
                </div>

                <!-- Date/Time Information -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <UFormGroup required>
                    <label class="block mb-1 required-field">Date:</label>
                    <UInput 
                      v-model="date" 
                      icon="solar:calendar-bold" 
                      type="date" 
                      required 
                      :class="{ 'border-red-500': !date && showValidationErrors }"
                    />
                  </UFormGroup>
                  <UFormGroup required>
                    <label class="block mb-1 required-field">Start Time:</label>
                    <UInput 
                      v-model="startTime" 
                      icon="mdi:clock-outline" 
                      type="time" 
                      required 
                      :class="{ 'border-red-500': !startTime && showValidationErrors }"
                    />
                  </UFormGroup>
                </div>
                
                <div class="p-2 text-xs sm:text-sm text-right mt-2">
                  <h1>Total time spent sampling at multiple sites should only be entered once.</h1>
                  <h1>Total miles driven to sample at multiple sites should only be entered once.</h1>
                </div>
              </div>

              <!-- Land Use Section -->
              <div class="border-4 p-2 sm:p-4 border-gray-900">
                <h2 class="text-xl sm:text-2xl text-center font-bold text-gray-900 mb-2">
                  Land Use in Drainage Area (Check all that apply)
                </h2>
                <p class="text-center p-2 font-bold text-sm sm:text-base">
                  NOTE: For this section, you can use visual indicators of land use, as well as your general familiarity with the area.
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 sm:p-4">
                  <div class="space-y-2 text-sm sm:text-base">
                    <UCheckbox v-model="landUseIndustrial" label="Industrial" />
                    <UCheckbox v-model="landUseDowntown" label="Downtown Residential" />
                    <UCheckbox v-model="landUseSuburban" label="Suburban Residential" />
                  </div>
                  <div class="space-y-2 text-sm sm:text-base">
                    <UCheckbox v-model="landUseCommercial" label="Commercial" />
                    <UCheckbox v-model="landUseOpenspace" label="Open Space" />
                    <UCheckbox v-model="landUseAgriculture" label="Agriculture" />
                    <UInput v-model="landUseOther" placeholder="Other (specify)" class="mt-2" />
                  </div>
                </div>
              </div>

              <!-- Pollutant Indicators Section -->
              <div class="border-4 p-2 sm:p-4 border-gray-900">
                <h2 class="text-xl sm:text-2xl text-center font-bold text-gray-900 mb-2">
                  Pollutant Indicators
                </h2>
                <p class="text-center p-2 font-bold text-sm sm:text-base">
                  Provide information about any potential pollutant indicators you notice. These indicators may range from strange odors, unusual colors, or floatables (suds, sewage, or petroleum). Refer to guidance, if needed.
                </p>
                
                <!-- Odor Section -->
                <div class="mt-4 p-2 sm:p-4 border-t-2 border-gray-300">
                  <h3 class="font-bold text-base sm:text-lg mb-3">Odor:</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm sm:text-base">
                    <UCheckbox v-model="odorNone" label="None" />
                    <UCheckbox v-model="odorRottenEggs" label="Rotten Eggs" />
                    <UCheckbox v-model="odorChlorine" label="Chlorine" />
                    <UCheckbox v-model="odorRancidSour" label="Rancid/Sour" />
                    <UCheckbox v-model="odorGasPetro" label="Gas/Petro" />
                    <UCheckbox v-model="odorMusty" label="Musty" />
                    <UCheckbox v-model="odorSweetFruity" label="Sweet/Fruity" />
                    <UCheckbox v-model="odorSharpPungent" label="Sharp/Pungent" />
                  </div>
                </div>

                <!-- Water Color Section -->
                <div class="mt-4 p-2 sm:p-4 border-t-2 border-gray-300">
                  <h3 class="font-bold text-base sm:text-lg mb-3">Water Color (select all that apply):</h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <UCheckbox 
                      v-for="option in waterColorOptions" 
                      :key="option.value"
                      :model-value="waterColor.includes(option.value)"
                      @update:model-value="(checked) => {
                        if (checked) {
                          if (!waterColor.includes(option.value)) {
                            waterColor.push(option.value);
                          }
                        } else {
                          const index = waterColor.indexOf(option.value);
                          if (index > -1) {
                            waterColor.splice(index, 1);
                          }
                        }
                      }"
                      :label="option.label"
                      class="text-sm sm:text-base"
                    />
                  </div>
                </div>

                <!-- Floatables Section -->
                <div class="mt-4 p-2 sm:p-4 border-t-2 border-gray-300">
                  <h3 class="font-bold text-base sm:text-lg mb-3">Floatables on Water Surface:</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm sm:text-base">
                    <UCheckbox v-model="waterSurfaceNone" label="None" />
                    <UCheckbox v-model="waterSurfaceOilSheen" label="Oil Sheen" />
                    <UCheckbox v-model="waterSurfaceAlgae" label="Algae" />
                    <UCheckbox v-model="waterSurfaceSoapSuds" label="Soap Suds" />
                    <UCheckbox v-model="waterSurfaceSewage" label="Sewage" />
                  </div>
                </div>
              </div>

              <!-- Physical Assessment Section -->
              <div class="border-4 border-gray-900">
                <h1 class="text-xl sm:text-2xl text-center text-gray-900 bg-lime-500 font-bold p-2">
                  Physical Assessment: Stream Corridor Assessment
                </h1>
                <p class="text-center text-gray-900 p-2 sm:p-4 text-sm sm:text-base">
                  <em>Based on Stream Corridor Assessment protocol from Maryland Department of Natural Resources.</em>
                  <br />
                  <strong>Instructions:
                  Select a stream segment of 100+ feet and observe the stream habitat in and on both sides of the water. Select the closest descriptions to that of your stream segment for each habitat characteristic.</strong>
                </p>

                <!-- Habitat Score Display -->
                <h2
                  v-if="selectedOptions.every((option) => option !== null)"
                  class="text-lg sm:text-xl text-center text-gray-900 p-2 sm:p-4 font-bold"
                  :class="{
                    'bg-red-400': habitatScore <= 15,
                    'bg-orange-400': habitatScore >= 16 && habitatScore <= 22,
                    'bg-yellow-400': habitatScore >= 23 && habitatScore <= 29,
                    'bg-green-400': habitatScore >= 30
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
                  class="text-lg sm:text-xl text-center text-gray-900 bg-lime-500 p-2 sm:p-4 font-bold"
                >
                  Please click on the rating for each category below.<br>Score will be calculated and displayed here once all categories are rated.
                </h2>

                <!-- Header Row -->
                <div class="hidden lg:grid grid-cols-5 bg-gray-200 border-t-2 border-gray-900 font-bold text-center text-sm xl:text-base">
                  <div class="border-r-2 border-gray-900 p-2 sm:p-3">Habitat Characteristic</div>
                  <div class="border-r-2 border-gray-900 p-2 sm:p-3 bg-green-200">Good (4)</div>
                  <div class="border-r-2 border-gray-900 p-2 sm:p-3 bg-yellow-200">Fair (3)</div>
                  <div class="border-r-2 border-gray-900 p-2 sm:p-3 bg-orange-200">Marginal (2)</div>
                  <div class="p-2 sm:p-3 bg-red-200">Poor (1)</div>
                </div>

                <!-- Physical Assessment Grid -->
                <div v-for="(item, groupIndex) in habitatItems" :key="groupIndex" class="border-t-2 border-gray-900">
                  <!-- Desktop/Tablet Layout -->
                  <div class="hidden lg:grid grid-cols-5">
                    <!-- Title cell with icon -->
                    <div class="grid-item title-cell border-r-2 border-gray-900 p-2 sm:p-4">
                      <div class="flex flex-col items-center">
                        <img 
                          v-if="groupIndex === 0"
                          src="@/assets/form_icons/vegetation.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 1"
                          src="@/assets/form_icons/streamchannel.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 2"
                          src="@/assets/form_icons/embeddedness.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 3"
                          src="@/assets/form_icons/erosion.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 4"
                          src="@/assets/form_icons/macroinvertebrates.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 5"
                          src="@/assets/form_icons/fish.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 6"
                          src="@/assets/form_icons/riparian_buffer.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 7"
                          src="@/assets/form_icons/bank_stability.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <img 
                          v-else-if="groupIndex === 8"
                          src="@/assets/form_icons/velocity_depth.webp" 
                          :alt="item.title"
                          class="w-16 h-16 sm:w-20 sm:h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                          @click="openImageModal(groupIndex)"
                        />
                        <p class="title font-bold text-sm sm:text-base">{{ item.title }}</p>
                        <p class="description text-xs sm:text-sm">{{ item.description }}</p>
                      </div>
                    </div>
                    
                    <!-- Option cells - reverse order for desktop (4, 3, 2, 1) -->
                    <div
                      v-for="optionIndex in [3, 2, 1, 0]"
                      :key="optionIndex"
                      class="grid-item option-cell cursor-pointer border-r-2 last:border-r-0 border-gray-900 p-2 sm:p-4 transition-all hover:opacity-80"
                      :class="{ 
                        'selected-good': selectedOptions[groupIndex] === 4 && optionIndex === 3,
                        'selected-fair': selectedOptions[groupIndex] === 3 && optionIndex === 2,
                        'selected-marginal': selectedOptions[groupIndex] === 2 && optionIndex === 1,
                        'selected-poor': selectedOptions[groupIndex] === 1 && optionIndex === 0,
                      }"
                      @click="selectedOptions[groupIndex] = optionIndex + 1"
                    >
                      <div class="clickable text-xs sm:text-sm">
                        {{ item.options[optionIndex] }}
                      </div>
                    </div>
                  </div>

                  <!-- Mobile Layout -->
                  <div class="lg:hidden p-2 sm:p-4">
                    <!-- Title with icon -->
                    <div class="flex flex-col items-center mb-4 pb-4 border-b-2 border-gray-300">
                      <img 
                        v-if="groupIndex === 0"
                        src="@/assets/form_icons/vegetation.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 1"
                        src="@/assets/form_icons/streamchannel.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 2"
                        src="@/assets/form_icons/embeddedness.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 3"
                        src="@/assets/form_icons/erosion.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 4"
                        src="@/assets/form_icons/macroinvertebrates.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 5"
                        src="@/assets/form_icons/fish.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 6"
                        src="@/assets/form_icons/riparian_buffer.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 7"
                        src="@/assets/form_icons/bank_stability.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <img 
                        v-else-if="groupIndex === 8"
                        src="@/assets/form_icons/velocity_depth.webp" 
                        :alt="item.title"
                        class="w-20 h-20 mb-2 object-contain cursor-pointer hover:scale-110 transition-transform"
                        @click="openImageModal(groupIndex)"
                      />
                      <p class="font-bold text-base text-center">{{ item.title }}</p>
                      <p class="text-sm text-gray-600 text-center mt-1">{{ item.description }}</p>
                    </div>
                    
                    <!-- Options stacked vertically for mobile -->
                    <div class="space-y-2">
                      <div
                        v-for="(option, optionIndex) in item.options"
                        :key="optionIndex"
                        class="p-3 border-2 rounded-lg cursor-pointer transition-all"
                        :class="{ 
                          'selected-good border-green-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 3,
                          'selected-fair border-yellow-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 2,
                          'selected-marginal border-orange-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 1,
                          'selected-poor border-red-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 0,
                          'border-gray-300': selectedOptions[groupIndex] !== optionIndex + 1
                        }"
                        @click="selectedOptions[groupIndex] = optionIndex + 1"
                      >
                        <div class="flex items-start gap-2">
                          <div class="flex-shrink-0 mt-1">
                            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                              :class="{
                                'bg-green-400 border-green-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 3,
                                'bg-yellow-400 border-yellow-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 2,
                                'bg-orange-400 border-orange-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 1,
                                'bg-red-400 border-red-500': selectedOptions[groupIndex] === optionIndex + 1 && optionIndex === 0,
                                'border-gray-400': selectedOptions[groupIndex] !== optionIndex + 1
                              }"
                            >
                              <span v-if="selectedOptions[groupIndex] === optionIndex + 1" class="text-white text-xs">✓</span>
                            </div>
                          </div>
                          <div class="flex-1">
                            <div class="font-semibold text-xs mb-1"
                              :class="{
                                'text-green-700': optionIndex === 3,
                                'text-yellow-700': optionIndex === 2,
                                'text-orange-700': optionIndex === 1,
                                'text-red-700': optionIndex === 0
                              }"
                            >
                              {{ optionIndex === 3 ? 'Good (4)' : optionIndex === 2 ? 'Fair (3)' : optionIndex === 1 ? 'Marginal (2)' : 'Poor (1)' }}
                            </div>
                            <div class="text-sm">{{ option }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Final Score Display -->
              <h2
                v-if="selectedOptions.every((option) => option !== null)"
                class="text-lg sm:text-xl text-center text-gray-900 border-4 border-gray-900 p-2 sm:p-4 font-bold"
                :class="{
                  'bg-red-400': habitatScore <= 15,
                  'bg-orange-400': habitatScore >= 16 && habitatScore <= 22,
                  'bg-yellow-400': habitatScore >= 23 && habitatScore <= 29,
                  'bg-green-400': habitatScore >= 30
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
                class="text-lg sm:text-xl text-center text-gray-900 border-4 border-gray-900 bg-lime-500 p-2 sm:p-4 font-bold"
              >
                Please click on the rating for each category above.<br>Score will be calculated and displayed here once all categories are rated.
              </h2>

              <!-- Other Observations and Photo Upload Section -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="border-4 p-2 sm:p-4 border-gray-900">
                  <h2 class="text-base sm:text-lg mb-3 font-bold">Other Observations or Measurements</h2>
                  <UFormGroup>
                    <UTextarea 
                      v-model="otherObs" 
                      rows="8"
                      class="w-full min-h-[150px] sm:min-h-[200px] resize-y"
                      placeholder="Enter any additional observations or measurements here..."
                    />
                  </UFormGroup>
                </div>
                <div class="border-4 p-2 sm:p-4 border-gray-900">
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
              <div class="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-4 mt-6">
                <UButton
                  @click="showCancelConfirmation"
                  variant="outline"
                  color="gray"
                  class="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </UButton>
                <UButton
                  @click="confirmSubmission"
                  class="text-gray-900 w-full sm:w-auto order-1 sm:order-2"
                  variant="solid"
                  :disabled="isSubmitting"
                  :color="formErrors.length > 0 ? 'red' : 'primary'"
                >
                  {{ isSubmitting ? 'Submitting...' : 
                    formErrors.length > 0 ? `Fix ${formErrors.length} Error${formErrors.length > 1 ? 's' : ''} to Submit` :
                    isEditMode ? 'Save Changes' : 'Submit Assessment' }}
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
                <div class="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-4">
                  <UButton 
                    @click="isCancelModalOpen = false" 
                    color="gray"
                    class="w-full sm:w-auto"
                  >
                    No, Continue Editing
                  </UButton>
                  <UButton 
                    @click="confirmCancel" 
                    color="yellow"
                    class="w-full sm:w-auto"
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
              <p class="text-sm sm:text-base">
                {{ isEditMode 
                  ? 'Are you sure you want to save these changes to the habitat assessment? Please review your modifications before confirming.'
                  : 'Are you sure you want to submit this habitat assessment? Please review your entries before confirming.'
                }}
              </p>
              <template #footer>
                <div class="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-4">
                  <UButton @click="isConfirmationModalOpen = false" color="gray" class="w-full sm:w-auto">
                    Cancel
                  </UButton>
                  <UButton @click="submitData" color="primary" class="w-full sm:w-auto">
                    {{ isEditMode ? 'Save Changes' : 'Submit Assessment' }}
                  </UButton>
                </div>
              </template>
            </UCard>
          </UModal>

          <!-- Loading Overlay -->
          <div v-if="isSubmitting" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white p-4 sm:p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
              <p class="mb-4 text-sm sm:text-base">{{ submissionStatus }}</p>
              <UProgress :model-value="submissionProgress" />
            </div>
          </div>
        </div>

        <!-- Map Modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="isMapOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="handleClickOutside">
              <div ref="mapModalRef" class="bg-white rounded-lg p-2 sm:p-4 max-w-[750px] w-full max-h-[90vh] h-full overflow-auto relative">
                <button @click="closeMap" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10">
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
            <div v-if="isErrorModalVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
                <h3 class="text-lg sm:text-xl font-bold mb-4">There was an error - Please try to submit again.</h3>
                <p class="mb-4 text-sm sm:text-base">{{ errorMessage }}</p>
                <div class="flex justify-end">
                  <UButton @click="isErrorModalVisible = false" label="Close" />
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Image Modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="isImageModalOpen" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" @click="closeImageModal">
              <div class="bg-white rounded-lg p-4 max-w-2xl w-full" @click.stop>
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-bold">{{ getImageTitle(selectedImageIndex) }}</h3>
                  <button @click="closeImageModal" class="text-gray-500 hover:text-gray-700">
                    <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                  </button>
                </div>
                <div class="flex justify-center">
                  <img 
                    v-if="selectedImageIndex === 0"
                    src="@/assets/form_icons/vegetation.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 1"
                    src="@/assets/form_icons/streamchannel.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 2"
                    src="@/assets/form_icons/embeddedness.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 3"
                    src="@/assets/form_icons/erosion.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 4"
                    src="@/assets/form_icons/macroinvertebrates.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 5"
                    src="@/assets/form_icons/fish.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 6"
                    src="@/assets/form_icons/riparian_buffer.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 7"
                    src="@/assets/form_icons/bank_stability.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                  <img 
                    v-else-if="selectedImageIndex === 8"
                    src="@/assets/form_icons/velocity_depth.webp"
                    :alt="getImageTitle(selectedImageIndex)"
                    class="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Attribution Bar -->
        <div class="bg-gray-100 border-t-2 border-gray-300 p-4 mt-6 text-xs text-gray-600">
          <h4 class="font-bold mb-2">Image Attributions:</h4>
          <ul class="space-y-1">
            <li>Erosion: <a href="https://www.flaticon.com/free-icon/erosion_8956532" target="_blank" class="text-blue-600 hover:underline">Flaticon</a></li>
            <li>Shelter for Macroinvertebrates: <a href="https://www.krisweb.com/aqualife/insect.htm" target="_blank" class="text-blue-600 hover:underline">KRIS Web</a></li>
            <li>Shelter for Fish: <a href="https://creazilla.com/media/digital-illustration/1795844/tippecanoe-darter" target="_blank" class="text-blue-600 hover:underline">Creazilla</a></li>
            <li>Riparian Vegetated Buffer: <a href="https://nc-cleanwater.com/2017/02/24/how-natural-vegetation-creates-stream-buffers-to-protect-waterbodies-from-stormwater-pollution-and-how-you-can-help-build-one/" target="_blank" class="text-blue-600 hover:underline">NC Clean Water</a></li>
            <li>Bank Stability: <a href="https://www.lakesuperiorstreams.org/understanding/streambank.htm" target="_blank" class="text-blue-600 hover:underline">Lake Superior Streams</a></li>
            <li>Velocity and Depth: <a href="https://basicwaterscience.com/biological-water-quality-parameters/stream-river-ecology/" target="_blank" class="text-blue-600 hover:underline">Basic Water Science</a></li>
          </ul>
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
  min-height: 150px;
  line-height: 1.5;
  padding: 0.75rem;
}

/* Physical Assessment Grid Styles */
.grid-item {
  border: 1px solid #9CA3AF;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.title-cell {
  background-color: #F3F4F6;
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

/* Accessible color scheme for selections */
.selected-good {
  background-color: #86EFAC !important; /* Green-300 */
  color: #14532D !important; /* Green-900 */
  font-weight: bold;
  border: 2px solid #16A34A !important; /* Green-600 */
}

.selected-fair {
  background-color: #FDE047 !important; /* Yellow-300 */
  color: #713F12 !important; /* Yellow-900 */
  font-weight: bold;
  border: 2px solid #CA8A04 !important; /* Yellow-600 */
}

.selected-marginal {
  background-color: #FDBA74 !important; /* Orange-300 */
  color: #7C2D12 !important; /* Orange-900 */
  font-weight: bold;
  border: 2px solid #EA580C !important; /* Orange-600 */
}

.selected-poor {
  background-color: #FCA5A5 !important; /* Red-300 */
  color: #7F1D1D !important; /* Red-900 */
  font-weight: bold;
  border: 2px solid #DC2626 !important; /* Red-600 */
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

/* Mobile responsive improvements */
@media (max-width: 640px) {
  :deep(.textarea) {
    min-height: 120px;
  }
  
  /* Better touch targets for mobile */
  :deep(input[type="radio"]),
  :deep(input[type="checkbox"]) {
    min-height: 1.25rem;
    min-width: 1.25rem;
  }
  
  /* Improve readability on small screens */
  :deep(label) {
    line-height: 1.4;
  }
}

/* Prevent horizontal overflow */
.overflow-x-hidden {
  overflow-x: hidden;
}

/* Enhanced validation styling */
.border-red-500 {
  border-color: #ef4444 !important;
}

/* Sticky validation positioning */
.sticky {
  position: sticky;
}
</style>