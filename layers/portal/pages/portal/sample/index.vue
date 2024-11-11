<script setup lang="ts">
import MapSelector from '../sites/MapSelector.vue';
import PhotoUpload from '../../components/PhotoUpload.vue';

// Add these to your reactive variables
const toast = useToast();
const formErrors = ref([]);

const { user } = useDirectusAuth();

const wwkyid_pk = ref<number | null>(null);
const stream_name = ref('');
const wwkybasin = ref('');

const isConfirmationModalOpen = ref(false);

// Update the confirmSubmission function
const confirmSubmission = () => {
  if (isFormValid.value) {
    isConfirmationModalOpen.value = true;
  } else {
    toast.add({ title: 'Form Error', description: formErrors.value.join(' '), color: 'red' });
  }
};

const isMapOpen = ref(false);
const mapModalRef = ref(null);

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

//this handles the map selection
const handleSiteSelection = (site: { wwkyid_pk: number, stream_name: string, wwkybasin: string }) => {
  wwkyid_pk.value = site.wwkyid_pk;
  stream_name.value = site.stream_name || "unnamed";
  wwkybasin.value = site.wwkybasin;
  closeMap();
};

//this handles the site entered directly by the user
const directSiteId = ref<string>('');
const isSiteIdValid = ref<boolean | null>(null);
const isCheckingSiteId = ref(false);

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

const handleSiteIdInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  directSiteId.value = target.value;
  isSiteIdValid.value = null; // Reset validation state when user starts typing
};


//All the options for the form:
const currentWeatherOptions = [
  {
    value: '1',
    label: 'Clear/Sunny',
    icon: 'fas fa-sun',
  },
  {
    value: '2',
    label: 'Overcast',
    icon: 'mdi mdi-weather-cloudy',
  },
  {
    value: '3',
    label: 'Intermittent Rain',
    icon: 'mdi mdi-weather-partly-rainy',
  },
  {
    value: '4',
    label: 'Steady Rain',
    icon: 'mdi mdi-weather-rainy',
  },
  {
    value: '5',
    label: 'Heavy Rain',
    icon: 'mdi mdi-weather-pouring',
  },
];

const rainfallOptions = [
	{
		value: '1',
		label: '0"',
	},
	{
		value: '2',
		label: '0.1"',
	},
	{
		value: '3',
		label: '0.5"',
	},
	{
		value: '4',
		label: '1"',
	},
	{
		value: '5',
		label: '1.5"',
	},
	{
		value: '6',
		label: '>1.5"',
	},
];

const waterColorOptions = [
	{
		value: '1',
		label: 'Clear',
	},
	{
		value: '2',
		label: 'Brown/Muddy',
	},
	{
		value: '3',
		label: 'Green',
	},
	{
		value: '4',
		label: 'White',
	},
	{
		value: '5',
		label: 'Gray',
	},
	{
		value: '6',
		label: 'Orange',
	},
];

const streamFlowVisualOptions = [
	{
		value: '1',
		label: 'Flood',
	},
	{
		value: '2',
		label: 'Bankfull',
	},
	{
		value: '3',
		label: 'Normal',
	},
	{
		value: '4',
		label: 'Low',
	},
	{
		value: '5',
		label: 'Ponded',
	},
	{
		value: '6',
		label: 'Dry',
	},
];

const trashOptions = [
	{
		value: '1',
		label: 'None',
	},
	{
		value: '2',
		label: 'Minor',
	},
	{
		value: '3',
		label: 'Several Bags',
	},
	{
		value: '4',
		label: 'Tires / Large Debris',
	},
	{
		value: '5',
		label: 'Abundant / Dump Site',
	},
];

const turbidityOptions = [
	{
		value: '1',
		label: 'Clear',
	},
	{
		value: '2',
		label: 'Slightly Cloudy',
	},
	{
		value: '3',
		label: 'Cloudy',
	},
	{
		value: '4',
		label: 'Very Turbid',
	},
];

const sampler = ref(user?.value?.display_name);
const adults = ref();
const youths = ref();
const date = ref();
const startTime = ref();
const totalVolunteerMinutes = ref();
const milesDriven = ref();
const currentWeather = ref();
const rainfall = ref();
const waterColor = ref();
const odorNone = ref();
const odorRottenEggs = ref();
const odorChlorine = ref();
const odorRancidSour = ref();
const odorGasPetro = ref();
const odorMusty = ref();
const odorSweetFruity = ref();
const odorSharpPungent = ref();
const waterSurfaceNone = ref();
const waterSurfaceOilSheen = ref();
const waterSurfaceAlgae = ref();
const waterSurfaceSoapSuds = ref();
const waterSurfaceSewage = ref();
const waterSurfaceErosion = ref();
const streamFlowVisual = ref();
const streamFlowMeasured = ref();
const waterTemperature = ref();
const pH = ref();
const dissolvedOxygen = ref();
const conductivity = ref();
const manufacturer = ref();
const model = ref();
const iCertifyCheckbox = ref();
const timeINIncubator = ref();
const timeOUTIncubator = ref();
const bacterialSourceHuman = ref();
const bacterialSourceDuckGoose = ref();
const bacterialSourceLivestock = ref();
const bacterialSourcePetWaste = ref();
const bacterialSourceWildlife = ref();
const ecoliA_count = ref();
const sampleVolA = ref();
const ecoliB_count = ref();
const sampleVolB = ref();
const ecoliC_count = ref();
const sampleVolC = ref();
const conductivityMeterCalibrationDate = ref();
const streamMeter = ref();
const bacterialSourceOther = ref();
const trash = ref();
const turbidity = ref();
const useTurbidMeter = ref(false)
const useTransparencyTube = ref(false)
const transparencyTubeMeasured= ref();
const turbidMeterMeasured = ref()

//photo upload
const photoUpload = ref(null);
const allFilesSelected = ref(false)

//***********THIS IS FOR TESTING _ REMOVE LATER
const fillFormWithTestData = () => {
  // Sample data
  adults.value = 3;
  youths.value = 2;
  totalVolunteerMinutes.value = 120;
  milesDriven.value = 15;
  currentWeather.value = 1; // Assuming 1 represents 'Clear/Sunny'
  rainfall.value = 2; // Assuming 2 represents '0.1"'
  waterColor.value = 1; // Assuming 1 represents 'Clear'
  odorChlorine.value = true;
  odorGasPetro.value = true;
  waterSurfaceOilSheen.value = true;
  waterSurfaceAlgae.value = true;
  waterTemperature.value = 20.5;
  pH.value = 7.2;
  dissolvedOxygen.value = 8.5;
  conductivity.value = 1500;
  conductivityMeterCalibrationDate.value = new Date().toISOString().split('T')[0]; // Today's date
  conductivityMeterCalibrationDate.value = new Date().toISOString().split('T')[0]; // Today's date
  streamFlowVisual.value = 3; // Assuming 3 represents 'Normal'
  streamFlowMeasured.value = 2.5;
  manufacturer.value = 'TestManufacturer';
  model.value = 'TestModel';
  iCertifyCheckbox.value = true;
  timeINIncubator.value = '09:00';
  timeOUTIncubator.value = '09:00';
  ecoliA_count.value = 12;
  sampleVolA.value = 10;
  ecoliB_count.value = 10;
  sampleVolB.value = 10;
  ecoliC_count.value = 14;
  sampleVolC.value = 10;
  bacterialSourceHuman.value = true;
  bacterialSourceLivestock.value = true;
  other.value = 'This is a test observation.';
  date.value = new Date().toISOString().split('T')[0]; // Today's date
  startTime.value = '08:00';
  wwkyid_pk.value = 3253;
  turbidity.value = 2; // Assuming 2 represents 'Slightly Cloudy'
  transparencyTubeMeasured.value = 60;
  turbidMeterMeasured.value = 5;
  useTransparencyTube.value = true;
  useTurbidMeter.value = true;
  trash.value = 2; // Assuming 2 represents 'Minimal'
};

//DEV TESTING: Fill the form with test data
// 3. Using a keyboard shortcut
onMounted(() => {
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'f') {
        fillFormWithTestData();
      }
    });
  }
});

//************END DEV TESTING


//Validations:
const isPHValid = computed(() => {
  const value = parseFloat(pH.value);
  return value >= 0 && value <= 14;
});

const isTemperatureValid = computed(() => {
  const value = parseFloat(waterTemperature.value);
  return value >= 0 && value <= 40;
});

//outside these and DO is allowed but you get a warning
const isDissolvedOxygenValid = computed(() => {
  const value = parseFloat(dissolvedOxygen.value);
  return value >= 0 && value <= 14;
});

//above 25 and you can't be doing that
const isDOValid = computed(() => {
  const value = parseFloat(dissolvedOxygen.value);
  return value <= 25;
});

const isConductivityHigh = computed(() => {
  const value = parseFloat(conductivity.value);
  return value > 2000;
});

//calculate the ecoli amount in the samples
const ecoliA = computed(() => {
	return ecoliA_count.value && sampleVolA.value ? (ecoliA_count.value / sampleVolA.value) * 100 : 0;
});

const ecoliB = computed(() => {
	return ecoliB_count.value && sampleVolB.value ? (ecoliB_count.value / sampleVolB.value) * 100 : 0;
});

const ecoliC = computed(() => {
	return ecoliC_count.value && sampleVolC.value ? (ecoliC_count.value / sampleVolC.value) * 100 : 0;
});

//calculate the ecoli variation
const ecoliVariation = computed(() => {
  const values = [ecoliA.value, ecoliB.value, ecoliC.value].map(v => parseFloat(v) || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max - min;
});

//check if the ecoli variation is high
const isEcoliVariationHigh = computed(() => {
  return ecoliVariation.value > 1000;
});

//calculate the average ecoli count
const averageEcoli = computed(() => {
	let a = ecoliA.value && sampleVolA.value ? (ecoliA.value) : -1;
	let b = ecoliB.value && sampleVolB.value ? (ecoliB.value) : -1;
	let c = ecoliC.value && sampleVolC.value ? (ecoliC.value) : -1;
	if (a === -1 || b === -1 || c === -1) return 'Please enter all measurements.';
	return Math.round((a + b + c) / 3);
});

const other = ref();

const isSubmitting = ref(false);
const isSubmitted = ref(false);
const submittedSampleId = ref('');
const submissionStatus = ref('');
const submissionProgress = ref(0);
const uploadedFileTypes = ref([]);
const errorMessage = ref('');


// Validate the form before submission
const isFormValid = computed(() => {
  formErrors.value = [];
  
  if (!date.value || !startTime.value || !wwkyid_pk.value) {
    formErrors.value.push('Please fill in all required fields.');
  }
  
  if (pH.value && !isPHValid.value) {
    formErrors.value.push('pH must be between 0 and 14. Please check your measurement/value.');
  }
  
  if (dissolvedOxygen.value && !isDOValid.value) {
    formErrors.value.push('Dissolved oxygen value is too high (>25). Please check your measurement/value.');
  }

  if (!validateFiles(selectedFiles.value)) {
    formErrors.value.push('One or more files exceed the 10 MB size limit.');
  }
  
  return formErrors.value.length === 0;
});

const selectedFiles = ref({}); // ref to store the selected files

// Handle file selection
const handleFilesSelected = (files) => {
  selectedFiles.value = files;
  if (!validateFiles(files)) {
    toast.add({ title: 'File Size Error', description: 'One or more files exceed the 10 MB size limit.', color: 'red' });
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

const submitData = async () => {
	isConfirmationModalOpen.value = false;
	if (!isFormValid.value) {
    	errorMessage.value = 'Please fill in all required fields.';
    	return;
  	}
	// Get and validate file sizes before proceeding
	const files = selectedFiles.value;
	const validationResult = validateFiles(files);
	if (validationResult !== true) {
		errorMessage.value = 'File validation failed:\n' + validationResult.join('\n');
		return;
	}

	isSubmitting.value = true;
  	errorMessage.value = '';
	let createdSampleId = null;
	let sampleSiteId = null;

  try {
   // Submit form data
   submissionStatus.value = 'Submitting form data...';
    submissionProgress.value = 25;

    const sampleData = prepareSampleData();

    // Remove relationship fields from initial submission
    const { odor, water_surface, bacterial_sources, water_color, ...baseData } = sampleData;
    const createdSample = await useDirectus(createItem('base_samples', baseData));

    createdSampleId = createdSample.id;
	sampleSiteId = createdSample.wwky_id;

    // Step 2: Update join tables
    submissionStatus.value = 'Updating relationships...';
    submissionProgress.value = 50;

    await updateJoinTable('base_samples_lu_odor', createdSampleId, odor);
    await updateJoinTable('base_samples_lu_water_surface', createdSampleId, water_surface);
    await updateJoinTable('base_samples_lu_bacterial_sources', createdSampleId, bacterial_sources);
    await updateJoinTable('base_samples_lu_water_color', createdSampleId, water_color);

    // Step 3: Handle file uploads
    submissionStatus.value = 'Uploading photos...';
    submissionProgress.value = 75;

    const formType = "base";
    const uploadedFileTypes = await uploadFiles(createdSampleId, sampleSiteId, files, formType);

    // Step 4: Create records in lu_sample_photos
    await createPhotoRecords(createdSampleId, sampleSiteId, uploadedFileTypes);

    // Step 5: Update base_samples with photo information
    await updateSampleWithPhotoInfo(createdSampleId, files);

    submissionProgress.value = 100;
    submittedSampleId.value = createdSampleId;
    isSubmitted.value = true;
  } catch (error) {
    console.error('Error during submission:', error);
    errorMessage.value = `An error occurred: ${error.message}. `;
    
    if (createdSampleId) {
      errorMessage.value += 'Rolling back changes...';
      await rollbackChanges(createdSampleId);
    }
    showErrorModal();
  } finally {
    isSubmitting.value = false;
  }
};

//updates the join tables
const updateJoinTable = async (tableName, sampleId, relatedIds) => {
  try {
    // First, remove any existing relationships
    await useDirectus(deleteItems(tableName, {
      filter: { base_samples_id: { _eq: sampleId } }
    }));

    // Extract the correct column name for the related ID
    const relatedIdColumn = tableName.replace('base_samples_', '') + '_id';

    // Then, create new relationships
    const items = relatedIds.map(id => ({
      base_samples_id: sampleId,
      [relatedIdColumn]: id
    }));

    if (items.length > 0) {
      await useDirectus(createItem(tableName, items));
    }
  } catch (error) {
    console.error(`Error updating join table ${tableName}:`, error);
    throw new Error(`Failed to update ${tableName}`);
  }
};

const prepareSampleData = () => {
  // Helper functions (unchanged)
  const toNullableNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const toNullableInteger = (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };

  // Prepare sample data
  const sampleData = {
    status: 'draft',
    participants_adults: toNullableInteger(adults.value),
    participants_youth: toNullableInteger(youths.value),
    total_volunteer_minutes: toNullableInteger(totalVolunteerMinutes.value),
    miles_driven: toNullableInteger(milesDriven.value),
    water_temperature: toNullableNumber(waterTemperature.value),
    pH: toNullableNumber(pH.value),
    dissolved_oxygen: toNullableNumber(dissolvedOxygen.value),
    conductivity: toNullableNumber(conductivity.value),
    stream_flow_measurement: toNullableNumber(streamFlowMeasured.value),
    field_multimeter_manufacturer: manufacturer.value || null,
    field_multimeter_model: model.value || null,
    field_multimeter_certify: iCertifyCheckbox.value,
    bacteria_time_in: timeINIncubator.value || null,
    bacteria_time_out: timeOUTIncubator.value || null,
	bacteria_sample_a_ecoli_count: toNullableInteger(ecoliA_count.value),
    bacteria_sample_a_ecoli: toNullableNumber(ecoliA.value),
    bacteria_sample_a_volume: toNullableNumber(sampleVolA.value),
	bacteria_sample_b_ecoli_count: toNullableInteger(ecoliB_count.value),
    bacteria_sample_b_ecoli: toNullableNumber(ecoliB.value),
    bacteria_sample_b_volume: toNullableNumber(sampleVolB.value),
	bacteria_sample_c_ecoli_count: toNullableInteger(ecoliC_count.value),
    bacteria_sample_c_ecoli: toNullableNumber(ecoliC.value),
    bacteria_sample_c_volume: toNullableNumber(sampleVolC.value),
    other_observations_or_measurements: other.value || null,
    volunteer_id: user.value?.id || null,
    date: date.value || null,
    start_time: startTime.value || null,
    wwky_id: toNullableInteger(wwkyid_pk.value),
    rainfall_amount: toNullableInteger(rainfall.value),
    current_weather: toNullableInteger(currentWeather.value),
    stream_flow_visual: toNullableInteger(streamFlowVisual.value),
    turbidity: toNullableInteger(turbidity.value),
    transparency_tube_measure: toNullableInteger(transparencyTubeMeasured.value),
    turbidtube_measure: toNullableInteger(turbidMeterMeasured.value),
    trash: toNullableInteger(trash.value),
    odor: getSelectedOdors(),
    water_surface: getSelectedWaterSurfaces(),
    bacterial_sources: getSelectedBacterialSources(),
    water_color: waterColor.value ? [parseInt(waterColor.value)] : []
  };

  // Remove any properties with null values
  Object.keys(sampleData).forEach(key => 
    sampleData[key] === null && delete sampleData[key]
  );

  return sampleData;
};

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

const getSelectedWaterSurfaces = () => {
  const waterSurfaceValues = [
    { field: waterSurfaceNone, value: 1 },
    { field: waterSurfaceOilSheen, value: 2 },
    { field: waterSurfaceAlgae, value: 3 },
    { field: waterSurfaceSoapSuds, value: 4 },
    { field: waterSurfaceSewage, value: 5 },
    { field: waterSurfaceErosion, value: 6 },
  ];
  return waterSurfaceValues.filter(surface => surface.field.value).map(surface => surface.value);
};

const getSelectedBacterialSources = () => {
  const bacterialSourceValues = [
    { field: bacterialSourceDuckGoose, value: 1 },
    { field: bacterialSourceHuman, value: 2 },
    { field: bacterialSourceLivestock, value: 3 },
    { field: bacterialSourcePetWaste, value: 4 },
    { field: bacterialSourceWildlife, value: 5 },
    { field: bacterialSourceOther, value: 6 },
  ];
  return bacterialSourceValues.filter(source => source.field.value).map(source => source.value);
};


// File upload handler
const uploadFiles = async (sampleId, siteId, files, formType) => {
  const formData = new FormData();
  formData.append('sampleId', sampleId);
  formData.append('siteId', siteId);
  formData.append('formType', formType);
  formData.append('formAdded', files.formAdded ? 'true' : 'false');

  // Append each file with a unique key
  const fileKeys = ['upstream', 'downstream', 'other'];
  fileKeys.forEach(key => {
    if (files.files && files.files[key] instanceof File) {
      //console.log(`Appending file: ${key}, Type: ${files.files[key].type}, Size: ${files.files[key].size} bytes`);
      formData.append(key, files.files[key], files.files[key].name);
    } else {
      console.log(`No file found for key: ${key}`);
    }
  });

  // Append the sample form file
  if (files.sampleFormFile instanceof File) {
    //console.log(`Appending file: sampleFormFile, Type: ${files.sampleFormFile.type}, Size: ${files.sampleFormFile.size} bytes`);
    formData.append('sampleFormFile', files.sampleFormFile, files.sampleFormFile.name);
  } else {
    console.log('No sample form file found');
  }

  try {
    //console.log('Sending request to /api/upload-files');
    const response = await fetch('/api/upload-files', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Failed to upload files: ${response.statusText}`);

    const result = await response.json();
    return result.uploadedFileTypes;

  } catch (error) {
    console.error('Error uploading files:', error);
    alert(`Error uploading files: ${error.message}`);
    throw error;
  }
};

const createPhotoRecords = async (sampleId, siteId, uploadedFileTypes) => {
  for (const type of uploadedFileTypes) {
    const filePath = `/webshare/kyww_images/base/${sampleId}/${siteId}/${type}_${sampleId}.jpg`;
    await useDirectus(
      createItem('lu_sample_photos', {
        sample_id: sampleId,
        type,
        file_path: filePath,
      })
    );
  }
};

const updateSampleWithPhotoInfo = async (sampleId, files) => {
  const photoCount = files.photoCount;
  const formAdded = files.formAdded;

  if (photoCount > 0 || formAdded) {
    await useDirectus(updateItem('base_samples', sampleId, {
      photos_added: photoCount,
      form_added: formAdded,
    }));
  }
};

const rollbackChanges = async (sampleId) => {
  try {

    // Delete entries from join tables
    await deleteJoinTableEntries('lu_base_samples_odor', sampleId);
    await deleteJoinTableEntries('lu_base_samples_water_surface', sampleId);
    await deleteJoinTableEntries('lu_base_samples_bacterial_sources', sampleId);
    await deleteJoinTableEntries('lu_base_samples_water_color', sampleId);

    // Delete the created sample
    await useDirectus(deleteItem('base_samples', sampleId));
    
    // Delete any created photo records
    await useDirectus(deleteItems('lu_sample_photos', {
      filter: { sample_id: sampleId }
    }));
    
    // Delete uploaded files - not done yet
    // Note: This assumes you have a method to delete files from the server
    //await deleteUploadedFiles(sampleId);
    
    console.log('Rollback completed successfully');
  } catch (rollbackError) {
    console.error('Error during rollback:', rollbackError);
    errorMessage.value += ' Rollback failed. Please contact support.';
  }
};

const deleteJoinTableEntries = async (tableName, sampleId) => {
  try {
    await useDirectus(deleteItems(tableName, {
      filter: { base_samples_id: { _eq: sampleId } }
    }));
    console.log(`Deleted entries from ${tableName} for sample ${sampleId}`);
  } catch (error) {
    console.error(`Error deleting entries from ${tableName}:`, error);
    // We don't throw here to allow the rollback process to continue with other tables
  }
};

/*
const deleteUploadedFiles = async (sampleId) => {
  // Implement file deletion logic here
  // This might involve making an API call to your server to delete the files
  // associated with this sampleId
};
*/

// New function to show error modal
const showErrorModal = () => {
  isErrorModalVisible.value = true;
};

// New reactive variables for error handling
const isErrorModalVisible = ref(false);

const resetForm = () => {
  // Reset submission state
  isSubmitted.value = false;
  submittedSampleId.value = '';
  uploadedFileTypes.value = [];
  isSubmitting.value = false;
  submissionStatus.value = '';
  submissionProgress.value = 0;
  errorMessage.value = '';

  // Reset form fields
  wwkyid_pk.value = null;
  stream_name.value = '';
  wwkybasin.value = '';
  adults.value = null;
  youths.value = null;
  date.value = null;
  startTime.value = null;
  totalVolunteerMinutes.value = null;
  milesDriven.value = null;
  currentWeather.value = null;
  rainfall.value = null;
  waterColor.value = null;
  odorNone.value = false;
  odorRottenEggs.value = false;
  odorChlorine.value = false;
  odorRancidSour.value = false;
  odorGasPetro.value = false;
  odorMusty.value = false;
  odorSweetFruity.value = false;
  odorSharpPungent.value = false;
  waterSurfaceNone.value = false;
  waterSurfaceOilSheen.value = false;
  waterSurfaceAlgae.value = false;
  waterSurfaceSoapSuds.value = false;
  waterSurfaceSewage.value = false;
  waterSurfaceErosion.value = false;
  streamFlowVisual.value = null;
  streamFlowMeasured.value = null;
  waterTemperature.value = null;
  pH.value = null;
  dissolvedOxygen.value = null;
  conductivity.value = null;
  manufacturer.value = null;
  model.value = null;
  iCertifyCheckbox.value = false;
  timeINIncubator.value = null;
  timeOUTIncubator.value = null;
  bacterialSourceHuman.value = false;
  bacterialSourceDuckGoose.value = false;
  bacterialSourceLivestock.value = false;
  bacterialSourcePetWaste.value = false;
  bacterialSourceWildlife.value = false;
  ecoliA_count.value = null;
  ecoliA.value = null;
  sampleVolA.value = null;
  ecoliB_count.value = null;
  ecoliB.value = null;
  sampleVolB.value = null;
  ecoliC_count.value = null;
  ecoliC.value = null;
  sampleVolC.value = null;
  conductivityMeterCalibrationDate.value = null;
  streamMeter.value = false;
  bacterialSourceOther.value = false;
  trash.value = null;
  turbidity.value = null;
  useTurbidMeter.value = false;
  useTransparencyTube.value = false;
  transparencyTubeMeasured.value = null;
  turbidMeterMeasured.value = null;
  other.value = null;

  // Reset file upload
  if (photoUpload.value) {
    photoUpload.value.reset(); // Assuming your PhotoUpload component has a reset method
  }
  allFilesSelected.value = false;

  // Reset any computed properties if necessary
  // For example, you might want to call any methods that update computed properties based on form field values
};

const viewDashboard = () => {
	navigateTo('/portal/');
};

</script>
<template>
	<div>
		<PortalPageHeader
			title="New Sample"
			:breadcrumbs="[
				{
					title: 'Portal',
					href: '/portal',
				},
				{
					title: 'Sample',
					href: '/portal/sample',
				},
			]"
		></PortalPageHeader>

		<!-- Submission Confirmation Screen -->
		<div v-if="isSubmitted" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
			<div class="bg-white p-8 rounded-lg shadow-xl text-center">
			<h2 class="text-2xl font-bold mb-4">Thank You!</h2>
			<p class="mb-4">Your sample (number: {{ submittedSampleId }}) has been successfully submitted.</p>
			<p v-if="uploadedFileTypes.length > 0" class="mb-4">Photos have also been uploaded.</p>
			<UButton variant="solid" @click="viewDashboard" label="View Dashboard" />
			<UButton variant="outline" @click="resetForm" label="Submit Another Sample" />
			</div>
		</div>

		<!-- Main Form -->
		<div v-else>
			<h1 class="text-2xl text-center text-gray-900">Kentucky Watershed Watch Monitoring Data Form</h1>
			<Form @submit.prevent="submitData">
				<div class="relative items-start">
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3">
							<label class="block mb-1">Sampler:</label>
							<UInput v-model="sampler" icon="i-ic-baseline-person" disabled />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3">
							<label class="block mb-1"># Adult Participants:</label>
							<UInput v-model="adults" icon="ic:baseline-group" type="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3">
							<label class="block mb-1"># Youth Participants:</label>
							<UInput v-model="youths" icon="healthicons:child-program" type="number" />
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
							<label class="block mb-1">Site ID:</label>
							<UInput :model-value="wwkyid_pk !== null ? wwkyid_pk.toString() : ''" icon="bxs:been-here" :disabled="true"/>
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
							<label class="block mb-1">Date:</label>
							<UInput v-model="date" icon="solar:calendar-bold" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" required>
							<label class="block mb-1">Start Time:</label>
							<UInput v-model="startTime" icon="mdi:clock-outline" type="time" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" required>
							<label class="block mb-1">Total Volunteer Minutes:</label>
							<UInput v-model="totalVolunteerMinutes" placeholder="Travel+Sampling" tuiype="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4">
							<label class="block mb-1">Miles Driven:</label>
							<UInput v-model="milesDriven" type="number" icon="fa-solid:car-side" />
						</UFormGroup>
					</div>
				</div>
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3">
						<label class="block mb-1">Current Weather:</label>
							<URadioGroup v-model="currentWeather" :options="currentWeatherOptions" name="currentWeather">
								<template #option="{ option }">
								<div class="flex items-center">
									<i :class="[option.icon, 'mr-2']"></i>
									{{ option.label }}
								</div>
								</template>
							</URadioGroup>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3 border-l border-gray-500">
							<label class="block mb-1">Rainfall in last 48 hours (round up):</label>
							<URadioGroup v-model="rainfall" :options="rainfallOptions" name="rainfall" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3 border-l border-gray-500">
							<label class="block mb-1">Water Color:</label>
							<URadioGroup v-model="waterColor" :options="waterColorOptions" name="waterColor" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3 border-l border-gray-500">
							<label class="block mb-1">Odor:</label>
							<UCheckbox v-model="odorNone" name="odorNone" label="None" value="1"/>
							<UCheckbox v-model="odorRottenEggs" name="odorRottenEggs" label="Rotten Eggs" value="2"/>
							<UCheckbox v-model="odorChlorine" name="odorChlorine" label="Chlorine" value="3"/>
							<UCheckbox v-model="odorRancidSour" name="odorRancidSour" label="Rancid/Sour" value="4"/>
							<UCheckbox v-model="odorGasPetro" name="odorGasPetro" label="Gas/Petro" value="6"/>
							<UCheckbox v-model="odorMusty" name="odorMusty" label="Musty" value="7"/>
							<UCheckbox v-model="odorSweetFruity" name="odorSweetFruity" label="Sweet/Fruity" value="8"/>
							<UCheckbox v-model="odorSharpPungent" name="odorSharpPungent" label="Sharp/Pungent" value="9"/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3 border-l border-gray-500">
							<label class="block mb-1">Water Surface:</label>
							<UCheckbox v-model="waterSurfaceNone" name="waterSurfaceNone" label="None" value="1" />
							<UCheckbox v-model="waterSurfaceOilSheen" name="waterSurfaceOilSheen" label="Oil Sheen" value="2" />
							<UCheckbox v-model="waterSurfaceAlgae" name="waterSurfaceAlgae" label="Algae" value="3" />
							<UCheckbox v-model="waterSurfaceSoapSuds" name="waterSurfaceSoapSuds" label="Soap Suds" value="4" />
							<UCheckbox v-model="waterSurfaceSewage" name="waterSurfaceSewage" label="Sewage" value="5" />
							<UCheckbox v-model="waterSurfaceErosion" name="waterSurfaceErosion" label="Erosion" value="6" />
						</UFormGroup>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2 basis-1/2">
							<label class="block mb-1">Stream Flow (Visual):</label>
							<URadioGroup v-model="streamFlowVisual" :options="streamFlowVisualOptions" name="streamFlowVisual" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox
								v-model="streamMeter"
								label="Check here if using a stream flow meter? (optional)"
								icon="mdi:water"
								placeholder="CuFt/Sec"
								@click="!streamMeter"
							/>
							<UInput v-if="streamMeter" v-model="streamFlowMeasured" icon="mdi:water" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<img src="assets/form_icons/stream_flow.png" alt="Stream Flow" class="w-full" />
					</div>
				</div>

				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2">
							<label class="block mb-1">Trash/Litter:</label>
							<URadioGroup v-model="trash" :options="trashOptions" name="trash" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2">
							<label class="block mb-1">Turbidity:</label>
							<URadioGroup v-model="turbidity" :options="turbidityOptions" name="turbidity" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox
							v-model="useTurbidMeter"
							label="Use turbidity meter"
							/>
							<UCheckbox
							v-model="useTransparencyTube"
							label="Use transparency tube"
							/>
							<UInput
							v-if="useTurbidMeter"
							v-model="turbidMeterMeasured"
							icon="i-mdi-water"
							placeholder="NTU"
							/>
							<UInput
							v-if="useTransparencyTube"
							v-model="transparencyTubeMeasured"
							icon="i-mdi-water"
							placeholder="cm"
							/>
						</UFormGroup>
					</div>
				</div>



				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2">
							<label class="block mb-1">Water Temperature:</label>
							<UInput v-model="waterTemperature" icon="mdi:thermometer" placeholder="°C" />
							<div v-if="waterTemperature && !isTemperatureValid" class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
								Please ensure the temperature is between 0 and 40 degrees Celsius (and you're not using Farenheit).
							</div>
							</UFormGroup>

							<UFormGroup class="p-2">
							<label class="block mb-1">pH:</label>
							<UInput v-model="pH" icon="mdi:ph" placeholder="SU" />
							<div v-if="pH && !isPHValid" class="mt-2 p-2 bg-red-100 text-red-800 rounded">
								pH must be between 0 and 14.
							</div>
							</UFormGroup>

							<UFormGroup class="p-2">
							<label class="block mb-1">Dissolved Oxygen:</label>
							<UInput v-model="dissolvedOxygen" icon="mdi:cloud" placeholder="mg/L" />
							<div v-if="dissolvedOxygen && !isDissolvedOxygenValid && isDOValid" class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
								Are you sure this value is correct? Expected DO values are 0 - 14 ppm.
							</div>
							<div v-if="dissolvedOxygen && !isDOValid" class="mt-2 p-2 bg-red-100 text-red-800 rounded">
								This value is too high (>25) and outside of the possible range for dissolved oxygen.
							</div>
							</UFormGroup>

							<UFormGroup class="p-2">
							<label class="block mb-1">Conductivity:</label>
							<UInput v-model="conductivity" icon="ant-design:thunderbolt-outlined" placeholder="μS/cm" />
							<div v-if="conductivity && isConductivityHigh" class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
								This conductivity value seems high (> 2,000 μS/cm).
							</div>
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						Read thermometer in water or quickly after removing. Take reading in shade.
						<br />
						<br />
						Use a white background or hold up to the sun. Don't wear sunglasses while reading.
						<br />
						<br />
						Check bottle and syringes for air bubbles. Add drops slowly.
						<br />
						<br />
						Calibrate meter within 24 hours of measurement.
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<img src="assets/form_icons/field_multimeter.png" alt="Water Quality" class="w-10 inline" label="stuff" />
						Meter Calibration
						<br />
						Conductivity Meter
						<UFormGroup class="p-2" label="Calibration Date">
							<UInput v-model="conductivityMeterCalibrationDate" type="date" />
						</UFormGroup>
						Other electronic meters
						<UFormGroup class="p-2" label=" Calibration Date">
							<UInput v-model="elecDates" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2">
							<UCheckbox
								v-model="iCertifyCheckbox"
								label="I certify that my instruments were successfully calibrated within 24 hours with unexpired reagents."
							/>
						</UFormGroup>
					</div>
				</div>
				<div class="border-4 p-5 border-gray-900">
					<div class="flex items-center mb-4">
						<div class="flex items-center">
							<img
							src="assets/form_icons/bacteria.png"
							alt="Bacteria"
							class="w-20 mr-4"
							/>
						</div>
						<h2 class="text-xl font-bold mr-4 flex-shrink-0">Bacteria: R-Card Method</h2>
						
					</div>
					<div class="flex items-center mb-4">
						<p class="text-center">Incubation should be for 20-24 hrs at 35-38°C</p>
					</div>
					<div class="flex items-start">
						<!-- Left Column -->
						<div class="flex-2 pr-4">
							<UFormGroup class="mb-2" label="Time IN Incubator" required>
							<UInput v-model="timeINIncubator" icon="mdi:clock-outline" type="time" />
							</UFormGroup>
							<UFormGroup class="mb-2" label="Time OUT Incubator" required>
							<UInput v-model="timeOUTIncubator" icon="mdi:clock-outline" type="time" />
							</UFormGroup>
							<UFormGroup class="mb-2" label="Initials of R-Card Reader">
							<UInput v-model="manufacturer" />
							</UFormGroup>
						</div>

						<!-- Middle Column -->
						<div class="flex-1 px-6">
							<div class="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-2">
								<!-- Headers -->
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap"># E.coli/card</label>
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap">Sample Vol (mL)</label>
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap">E.coli/100mL</label>

								<!-- Sample A -->
								<label class="self-center text-sm whitespace-nowrap">Sample A:</label>
								<UInput v-model="ecoliA_count" type="number" />
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<UInput v-model="sampleVolA" type="number"/>
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliA" type="number" :disabled="true" />

								<!-- Sample B -->
								<label class="self-center text-sm whitespace-nowrap">Sample B:</label>
								<UInput v-model="ecoliB_count" type="number" />
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<UInput v-model="sampleVolB" type="number"/>
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliB" type="number" :disabled="true" />

								<!-- Sample C -->
								<label class="self-center text-sm whitespace-nowrap">Sample C:</label>
								<UInput v-model="ecoliC_count" type="number" />
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<UInput v-model="sampleVolC" type="number"/>
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliC" type="number" :disabled="true" />

								<!-- Average -->
								<label class="text-sm font-semibold col-span-3 self-center px-1">Average E.&nbsp;coli/100mL:</label>
								<UInput v-model="averageEcoli" class="col-span-3 px-1" disabled />
							</div>
							
							<div v-if="isEcoliVariationHigh" class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
								The variation between E. Coli samples is high (> 1000).
							</div>
						</div>

						<!-- Right Column -->
						<div class="flex-3 pl-4 border-l border-gray-500">
							<h3 class="text-m font-semibold mb-2 whitespace-nowrap">Possible Bacterial Sources:</h3>
							<UFormGroup>
							<UCheckbox v-model="bacterialSourceDuckGoose" label="Duck/Goose" value="1" />
							<UCheckbox v-model="bacterialSourceHuman" label="Human" value="2" />
							<UCheckbox v-model="bacterialSourceLivestock" label="Livestock" value="3" />
							<UCheckbox v-model="bacterialSourcePetWaste" label="Pet Waste" value="4" />
							<UCheckbox v-model="bacterialSourceWildlife" label="Wildlife" value="5" />
							<UCheckbox v-model="bacterialSourceOther" label="Other" @click="!bacterialSourceOther" value="6" />
							<UInput v-if="bacterialSourceOther" v-model="bacterialSourceOtherData" />
							</UFormGroup>
						</div>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<h2 class="text-lg">Other Observations or Measurements</h2>
						<UFormGroup class="p-2">
						<UTextarea v-model="other" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2">
						<PhotoUpload ref="photoUpload" @filesSelected="handleFilesSelected" />
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
							to view data. For questions or feedback, email contact@kywater.org.
							</h2>
						</div>
						</div>
					</div>
				</div>
					<!-- Submit Button -->
					<div class="flex justify-end mt-6">
						<UButton
						@click="confirmSubmission"
						class="text-gray-900"
						variant="solid"
						:disabled="!isFormValid || isSubmitting"
						>
						{{ isSubmitting ? 'Submitting...' : 'Submit' }}
						</UButton>
					</div>
				</div>
			</Form>

			<!-- Confirmation Modal -->
			<UModal v-model="isConfirmationModalOpen">
				<UCard>
				<template #header>
					<div class="text-xl font-bold">Confirm Submission</div>
				</template>
				<p>Are you sure you want to submit this sample data? Please review your entries before confirming.</p>
				<template #footer>
					<div class="flex justify-end space-x-4">
					<UButton @click="isConfirmationModalOpen = false" color="gray">
						Cancel
					</UButton>
					<UButton @click="submitData" color="primary">
						Submit Sample Data
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
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.icon-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-label i {
  font-size: 1.25rem;
  width: 1.5rem;
  text-align: center;
}

/* Water color specific styles */
.water-color-icon {
  position: relative;
}

.water-color-icon::before {
  color: currentColor;
  opacity: 0.7;
}

/* Color-specific styles */
.water-color-brown i { color: #8B4513; }
.water-color-green i { color: #228B22; }
.water-color-grey i { color: #808080; }
.water-color-orange i { color: #FFA500; }
</style>
