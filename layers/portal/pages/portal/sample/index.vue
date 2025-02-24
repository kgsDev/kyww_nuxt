<script setup lang="ts">
import CustomNumberInput from '../../components/CustomNumberInput.vue';
import MapSelector from '../sites/MapSelector.vue';
import PhotoUpload from '../../components/PhotoUpload.vue';
import PolicyGuard from '../../components/PolicyGuard.vue';

const route = useRoute();
const isEditMode = computed(() => !!route.query.edit);
const sampleId = computed(() => route.query.edit as string);

const { user } = useDirectusAuth();

const originalSampler = ref('');

//initialize form refs
const formRefs = {
	volunteer_id: ref(user.value?.id), // Primary sampler (set initially to logged-in user but can be changed)
	wwkyid_pk: ref<number | null>(null),
	stream_name: ref(''),
	wwkybasin: ref(''),
	adults: ref(),
	youths: ref(),
	date: ref(new Date().toISOString().split('T')[0]), // This will set it to current date in YYYY-MM-DD format
	startTime: ref(),
	totalVolunteerMinutes: ref(),
	milesDriven: ref(),
	currentWeather: ref(),
	rainfall: ref(),
	waterColor: ref(),
	odorNone: ref(),
	odorRottenEggs: ref(),
	odorChlorine: ref(),
	odorRancidSour: ref(),
	odorGasPetro: ref(),
	odorMusty: ref(),
	odorSweetFruity: ref(),
	odorSharpPungent: ref(),
	waterSurfaceNone: ref(),
	waterSurfaceOilSheen: ref(),
	waterSurfaceAlgae: ref(),
	waterSurfaceSoapSuds: ref(),
	waterSurfaceSewage: ref(),
	waterSurfaceErosion: ref(),
	streamFlowVisual: ref(),
	negsample: ref(),
	streamFlowMeasured: ref(),
	waterTemperature: ref(),
	pH: ref(),
	dissolvedOxygen: ref(),
	conductivity: ref(),
	iCertifyCheckbox: ref(),
	//timeINIncubator: ref<string | null>(null),
	//timeOUTIncubator: ref<string | null>(null),
	timeINIncDate: ref<string | null>(null),
	timeINIncTime: ref<string | null>(null),
	timeOUTIncDate: ref<string | null>(null),
	timeOUTIncTime: ref<string | null>(null),
	bacteriaRCardInitials: ref(),
	bacterialSourceHuman: ref(),
	bacterialSourceDuckGoose: ref(),
	bacterialSourceLivestock: ref(),
	bacterialSourcePetWaste: ref(),
	bacterialSourceWildlife: ref(),
	ecoliA_count: ref(),
	sampleVolA: ref(),
	ecoliB_count: ref(),
	sampleVolB: ref(),
	ecoliC_count: ref(),
	sampleVolC: ref(),
	conductivityMeterCalibrationDate: ref(),
	otherMeterCalibrationDate: ref(),
	field_multimeter_model: ref(''),
	field_multimeter_manuf: ref(''),
	streamMeter: ref(),
	bacterialSourceOther: ref(),
	trash: ref(),
	turbidity: ref(),
	useTurbidMeter: ref(false),
	useTransparencyTube: ref(false),
	transparencyTubeMeasured: ref(),
	turbidMeterMeasured: ref(),
	availableSamplers: ref([]),
	otherObs: ref(''),
	allFilesSelected: ref(false),
	selectedSamplerIds: ref([]),
};

//initialize component refs
const componentRefs = {
	photoUpload: ref(null),
	mapModalRef: ref(null),
	existingPhotos: ref([]),
};

//initialize state refs
const stateRefs = {
	toast: useToast(),
	formErrors: ref([]),
	isConfirmationModalOpen: ref(false),
	showValidationErrors: ref(false),
	isLoading: ref(false),
	isMapOpen: ref(false),
	directSiteId: ref<string>(''),
	isSiteIdValid: ref<boolean | null>(null),
	isCheckingSiteId: ref(false),
};

// Destructure for convenience
const { volunteer_id, wwkyid_pk, stream_name, wwkybasin, adults, youths, date, startTime, totalVolunteerMinutes, milesDriven, currentWeather, rainfall, 
	waterColor, odorNone, odorRottenEggs, odorChlorine, odorRancidSour, odorGasPetro, odorMusty, odorSweetFruity, odorSharpPungent, 
	waterSurfaceNone, waterSurfaceOilSheen, waterSurfaceAlgae, waterSurfaceSoapSuds, waterSurfaceSewage, waterSurfaceErosion, streamFlowVisual, 
	negsample, streamFlowMeasured, waterTemperature, pH, dissolvedOxygen, conductivity, iCertifyCheckbox, timeINIncDate, timeINIncTime, timeOUTIncDate, timeOUTIncTime,
	bacteriaRCardInitials, bacterialSourceHuman, bacterialSourceDuckGoose, bacterialSourceLivestock, bacterialSourcePetWaste, bacterialSourceWildlife, 
	ecoliA_count, sampleVolA, ecoliB_count, sampleVolB, ecoliC_count, sampleVolC, conductivityMeterCalibrationDate, otherMeterCalibrationDate, field_multimeter_model,
	field_multimeter_manuf, streamMeter, bacterialSourceOther, trash, turbidity, useTurbidMeter, useTransparencyTube, transparencyTubeMeasured, turbidMeterMeasured, 
	availableSamplers, otherObs, allFilesSelected, selectedSamplerIds } = formRefs;
const { photoUpload, mapModalRef, existingPhotos } = componentRefs;
const { isLoading, isMapOpen, toast, formErrors, isConfirmationModalOpen, showValidationErrors, directSiteId, isSiteIdValid, isCheckingSiteId } = stateRefs;

const configPublic = useRuntimeConfig().public;

const isAdmin = computed(() => {
  return user.value?.role === configPublic.DEVADMIN_ROLE_ID || user.value?.role === configPublic.WWKYADMIN_ROLE_ID;
});

const viewSite = () => {
  navigateTo(`/portal/sites/${wwkyid_pk.value}`);
};

// Function to check if user can edit the form
const canEditForm = async () => {
  if (isAdmin.value) return true;
  if (!isEditMode.value || !sampleId.value) return true; // Allow new sample creation
  
  try {
    // Fetch the sample to check ownership
    const sample = await useDirectus(
      readItem('base_samples', sampleId.value, {
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

//this gets the sample data if the user is in edit mode	
const fetchSampleData = async (id: string) => {
  isLoading.value = true;
  try {
	// First, load available samplers
	await fetchSamplers();
    
	// First, fetch the base sample data
	const sampleData = await useDirectus(
      readItem('base_samples', id, {
        fields: [
          '*',
		  'user_created.first_name',
          'user_created.last_name',
          'volunteer_id.first_name',
          'volunteer_id.last_name',
          'primary_sampler_id.*',
          'base_samples_directus_users.directus_users_id.*'
        ]
      })
    );

    if (!sampleData) {
      toast.add({
        title: 'Error',
        description: 'Sample not found',
        color: 'red'
      });
      return;
    }

	// Set primary sampler (volunteer_id) and store original sampler info
	if (sampleData.user_created) {
		originalSampler.value = `${sampleData.user_created.first_name} ${sampleData.user_created.last_name}`;
	}


    // Set primary sampler (volunteer_id)
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
	date.value = sampleData.date?.split('T')[0] || null;
	startTime.value = sampleData.start_time || null;
	adults.value = sampleData.participants_adults !== null ? parseInt(sampleData.participants_adults) : null;
    youths.value = sampleData.participants_youth !== null ? parseInt(sampleData.participants_youth) : null;
    totalVolunteerMinutes.value = sampleData.total_volunteer_minutes !== null ? parseInt(sampleData.total_volunteer_minutes) : null;
    milesDriven.value = sampleData.miles_driven !== null ? parseInt(sampleData.miles_driven) : null;
	currentWeather.value = sampleData.current_weather ? parseInt(sampleData.current_weather) : null;
	rainfall.value = sampleData.rainfall_amount ? parseInt(sampleData.rainfall_amount) : null;
	streamFlowVisual.value = sampleData.stream_flow_visual ? parseInt(sampleData.stream_flow_visual) : null;
	negsample.value = sampleData.negsample || false;
	streamFlowMeasured.value = sampleData.stream_flow_measurement ? parseFloat(sampleData.stream_flow_measurement) : null;
	waterTemperature.value = sampleData.water_temperature ? parseFloat(sampleData.water_temperature) : null;
	pH.value = sampleData.pH ? parseFloat(sampleData.pH) : null;
	dissolvedOxygen.value = sampleData.dissolved_oxygen ? parseFloat(sampleData.dissolved_oxygen) : null;
	conductivity.value = sampleData.conductivity ? parseFloat(sampleData.conductivity) : null;

	await fetchSamplers();

	if (sampleData.base_samples_directus_users) {
		selectedSamplerIds.value = sampleData.base_samples_directus_users
			.map(user => user.directus_users_id.id)
			.filter(id => id !== sampleData.primary_sampler_id);
	}

	//conductivity meter calibration date
	conductivityMeterCalibrationDate.value = sampleData.conductivity_meter_calibration_date?.split('T')[0] || null;

	//other meter calibration date and info
	otherMeterCalibrationDate.value = sampleData.other_meter_calibration_date?.split('T')[0] || null;
	field_multimeter_model.value = sampleData.field_multimeter_model || '';
    field_multimeter_manuf.value = sampleData.field_multimeter_manuf || '';

	// Meter calibration data
    iCertifyCheckbox.value = sampleData.field_multimeter_certify;

	// Observations with safe assignment
    if (otherObs && typeof otherObs.value !== 'undefined') {
		otherObs.value = sampleData.other_observations_or_measurements || '';
    }

    // Trash and turbidity
    trash.value = parseInt(sampleData.trash);
    turbidity.value = parseInt(sampleData.turbidity);
    
    // Bacteria-related fields with more detailed handling
	if (sampleData.bacteria_timedate_in || sampleData.bacteria_timedate_out) {
		useRCard.value = true;
		fullTimeIN.value = sampleData.bacteria_timedate_in;
		fullTimeOUT.value = sampleData.bacteria_timedate_out;
		bacteriaRCardInitials.value = sampleData.bacteria_rcard_initials;
		
		// Sample A - Fix count vs calculated value mix-up
		ecoliA_count.value = sampleData.bacteria_sample_a_ecoli_count !== null ? parseInt(sampleData.bacteria_sample_a_ecoli_count) : null;
		ecoliA.value = parseInt(sampleData.bacteria_sample_a_ecoli);
		sampleVolA.value = parseFloat(sampleData.bacteria_sample_a_volume);
		
		// Sample B
		ecoliB_count.value = sampleData.bacteria_sample_b_ecoli_count !== null ? parseInt(sampleData.bacteria_sample_b_ecoli_count) : null;
		ecoliB.value = parseInt(sampleData.bacteria_sample_b_ecoli);
		sampleVolB.value = parseFloat(sampleData.bacteria_sample_b_volume);
		
		// Sample C
		ecoliC_count.value = sampleData.bacteria_sample_c_ecoli_count !== null ? parseInt(sampleData.bacteria_sample_c_ecoli_count) : null;
		ecoliC.value = parseInt(sampleData.bacteria_sample_c_ecoli);
		sampleVolC.value = parseFloat(sampleData.bacteria_sample_c_volume);
	}


    // Turbidity measurements with better validation
    if (sampleData.turbidtube_measure !== null && sampleData.turbidtube_measure !== undefined) {
      useTurbidMeter.value = true;
      turbidMeterMeasured.value = parseFloat(sampleData.turbidtube_measure);
    }
    if (sampleData.transparency_tube_measure !== null && sampleData.transparency_tube_measure !== undefined) {
      useTransparencyTube.value = true;
      transparencyTubeMeasured.value = parseFloat(sampleData.transparency_tube_measure);
    }

    // Photos handling
	if (sampleData.photos_added || sampleData.form_added) {
		try {
			const photoRecords = await useDirectus(
			readItems('lu_sample_photos', {
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

    // Fetch and set related data with better error handling
	try {
		const [odors, waterSurfaces, bacterialSources, waterColors, additionalSamplers] = await Promise.all([
			fetchRelatedData('base_samples_lu_odor', id),
			fetchRelatedData('base_samples_lu_water_surface', id),
			fetchRelatedData('base_samples_lu_bacterial_sources', id),
			fetchRelatedData('base_samples_lu_water_color', id),
			useDirectus(readItems('base_samples_directus_users', {
				filter: { base_samples_id: { _eq: id } },
				fields: ['directus_users_id.*']
			}))
		]);

		// Set water color
		if (waterColors && waterColors.length > 0) {
			waterColor.value = waterColors[0];
		}

		// Set additional samplers
		if (additionalSamplers && additionalSamplers.length > 0) {
			selectedSamplerIds.value = additionalSamplers
			.map(s => s.directus_users_id.id)
			.filter(id => id !== user.value?.id);
		}

      // Set odor checkboxes with null checking
      odorNone.value = odors?.includes(1) ?? false;
      odorRottenEggs.value = odors?.includes(2) ?? false;
      odorChlorine.value = odors?.includes(3) ?? false;
      odorRancidSour.value = odors?.includes(4) ?? false;
      odorGasPetro.value = odors?.includes(6) ?? false;
      odorMusty.value = odors?.includes(7) ?? false;
      odorSweetFruity.value = odors?.includes(8) ?? false;
      odorSharpPungent.value = odors?.includes(9) ?? false;

      // Set water surface checkboxes with null checking
      waterSurfaceNone.value = waterSurfaces?.includes(1) ?? false;
      waterSurfaceOilSheen.value = waterSurfaces?.includes(2) ?? false;
      waterSurfaceAlgae.value = waterSurfaces?.includes(3) ?? false;
      waterSurfaceSoapSuds.value = waterSurfaces?.includes(4) ?? false;
      waterSurfaceSewage.value = waterSurfaces?.includes(5) ?? false;
      waterSurfaceErosion.value = waterSurfaces?.includes(6) ?? false;

      // Set bacterial source checkboxes with null checking
      bacterialSourceDuckGoose.value = bacterialSources?.includes(1) ?? false;
      bacterialSourceHuman.value = bacterialSources?.includes(2) ?? false;
      bacterialSourceLivestock.value = bacterialSources?.includes(3) ?? false;
      bacterialSourcePetWaste.value = bacterialSources?.includes(4) ?? false;
      bacterialSourceWildlife.value = bacterialSources?.includes(5) ?? false;
      bacterialSourceOther.value = bacterialSources?.includes(6) ?? false;

    } catch (error) {
      console.error('Error loading related data:', error);
      toast.add({
        title: 'Warning',
        description: 'Some related data could not be loaded',
        color: 'yellow'
      });
    }

  } catch (error) {
    console.error('Error fetching sample data:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to load sample data',
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
        base_samples_id: { _eq: sampleId }
      }
    })
  );
  return response.map(item => item[`${table.replace('base_samples_', '')}_id`]);
};

// ConfirmSubmission function
const confirmSubmission = () => {
  showValidationErrors.value = true; // Set to true when submit is clicked
  
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

//bunch of helper functions:
const fetchSamplers = async () => {
  try {
    const response = await $fetch('/api/samplers');
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

const useRCard = ref(false);
const defaultSampleVol = 1.0;
const sampleVolOptions = [
  { value: 1.0, label: '1.0 mL' },
  { value: 0.75, label: '0.75 mL' },
  { value: 0.5, label: '0.5 mL' },
  { value: 0.25, label: '0.25 mL' }
];

const initializeSampleVolumes = () => {
  if (!isEditMode.value) {
    sampleVolA.value = defaultSampleVol;
    sampleVolB.value = defaultSampleVol;
    sampleVolC.value = defaultSampleVol;
  }
};

const initializeComponent = async () => {
  try {
   
    // Initialize form creator with logged in user (automatic in Directus)
    // Initialize primary sampler as logged in user (but can be changed)
    volunteer_id.value = user.value?.id;

    await nextTick();
    
    if (isEditMode.value && sampleId.value) {
      try {
        await fetchSampleData(sampleId.value);
      } catch (error) {
        console.error('Error fetching sample data:', error);
      }
    }
    
    await fetchSamplers();
    
  } catch (error) {
    console.error('Error during component initialization:', error);
  }
};

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


const fullTimeIN = computed({
  get() {
    if (!timeINIncDate.value || !timeINIncTime.value) return null;
    return `${timeINIncDate.value}T${timeINIncTime.value}:00Z`;
  },
  set(value) {
    if (!value) {
      timeINIncDate.value = '';
      timeINIncTime.value = '';
      return;
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        timeINIncDate.value = date.toISOString().split('T')[0];
        timeINIncTime.value = date.toISOString().split('T')[1].substring(0, 5);
      }
    } catch (e) {
      console.error('Error parsing time in:', e);
    }
  }
});

const fullTimeOUT = computed({
  get() {
    if (!timeOUTIncDate.value || !timeOUTIncTime.value) return null;
    return `${timeOUTIncDate.value}T${timeOUTIncTime.value}:00Z`;
  },
  set(value) {
    if (!value) {
      timeOUTIncDate.value = '';
      timeOUTIncTime.value = '';
      return;
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        timeOUTIncDate.value = date.toISOString().split('T')[0];
        timeOUTIncTime.value = date.toISOString().split('T')[1].substring(0, 5);
      }
    } catch (e) {
      console.error('Error parsing time out:', e);
    }
  }
});

const incubationTime = computed(() => {
  if (!fullTimeIN.value || !fullTimeOUT.value) return null;
  
  const timeIn = new Date(fullTimeIN.value);
  const timeOut = new Date(fullTimeOUT.value);
  
  // Check if times are exactly the same
  if (timeIn.getTime() === timeOut.getTime()) {
    return 0;  // Return 0 to indicate same time
  }
  
  const diffHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
  return diffHours;
});

// Validation computed property
const isIncubationTimeValid = computed(() => {
  if (!incubationTime.value && incubationTime.value !== 0) return true;
  
  // Check for same time (when incubationTime is 0)
  if (incubationTime.value === 0) return false;
  
  // Check if time out is before time in
  if (incubationTime.value < 0) return false;
  
  // Check if within valid range
  return incubationTime.value >= 20 && incubationTime.value <= 24;
});

// Display message computed property
const displayIncubationTime = computed(() => {
  if (!incubationTime.value && incubationTime.value !== 0) return '';
  
  if (incubationTime.value === 0) {
    return 'Error: Time In and Time Out cannot be the same';
  }
  
  if (incubationTime.value < 0) {
    return 'Error: Time Out cannot be before Time In';
  }
  
  return `Entered incubation time: ${Math.abs(incubationTime.value).toFixed(1)} hours`;
});

//calculate the ecoli amount in the samples
const ecoliA = computed(() => {
    // Check if count is explicitly entered (including zero) and volume exists
    const countExists = ecoliA_count.value === 0 || Boolean(ecoliA_count.value);
    return countExists && sampleVolA.value 
        ? (ecoliA_count.value / sampleVolA.value) * 100 
        : 0;
});

const ecoliB = computed(() => {
    const countExists = ecoliB_count.value === 0 || Boolean(ecoliB_count.value);
    return countExists && sampleVolB.value 
        ? (ecoliB_count.value / sampleVolB.value) * 100 
        : 0;
});

const ecoliC = computed(() => {
    const countExists = ecoliC_count.value === 0 || Boolean(ecoliC_count.value);
    return countExists && sampleVolC.value 
        ? (ecoliC_count.value / sampleVolC.value) * 100 
        : 0;
});

//calculate the ecoli variation
const ecoliVariation = computed(() => {
  const values = [ecoliA_count.value, ecoliB_count.value, ecoliC_count.value].map(v => parseFloat(v) || 0);
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
    // Helper to check if a value has been explicitly entered (including zero)
    const isValueSet = (val) => val === 0 || Boolean(val);
    
    // Check if all required values are present
    const hasA = isValueSet(ecoliA_count.value) && isValueSet(sampleVolA.value);
    const hasB = isValueSet(ecoliB_count.value) && isValueSet(sampleVolB.value);
    const hasC = isValueSet(ecoliC_count.value) && isValueSet(sampleVolC.value);
    
    if (!hasA || !hasB || !hasC) {
        return 'Please enter all measurements.';
    }
    
    // All values are present, calculate the average
    return Math.round((ecoliA.value + ecoliB.value + ecoliC.value) / 3);
});

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
  
  // Check required personal info
  if (volunteer_id.value === undefined || volunteer_id.value === null) formErrors.value.push('Primary Sampler');
  if (adults.value === undefined || adults.value === null) formErrors.value.push('Number of Adult Participants');
  if (youths.value === undefined || youths.value === null) formErrors.value.push('Number of Youth Participants');
  if (totalVolunteerMinutes.value === undefined || totalVolunteerMinutes.value === null) formErrors.value.push('Total Volunteer Minutes');
  if (milesDriven.value === undefined || milesDriven.value === null) formErrors.value.push('Miles Driven');
  
  // Check required site info
  if (!wwkyid_pk.value) formErrors.value.push('Site ID');
  
  // Check required date/time info
  if (!date.value) formErrors.value.push('Sample Date');
  if (!startTime.value) formErrors.value.push('Start Time');
  
  // Check required environmental conditions
  if (!currentWeather.value) formErrors.value.push('Current Weather');
  if (!rainfall.value) formErrors.value.push('Rainfall Amount');
  if (!streamFlowVisual.value) formErrors.value.push('Stream Flow (Visual)');
  if (!trash.value) formErrors.value.push('Trash/Litter assessment');
  
  // Validate measurements if provided
  if (pH.value && !isPHValid.value) {
    formErrors.value.push('pH must be between 0 and 14');
  }
  
  if (dissolvedOxygen.value && !isDOValid.value) {
    formErrors.value.push('Dissolved oxygen value is too high (>25)');
  }

  // Validate R-Card method if selected
  if (useRCard.value) {
		if (!bacteriaRCardInitials.value) formErrors.value.push('Initials are required for R-Card method');
		if (!timeINIncDate.value || !timeINIncTime.value) formErrors.value.push('Incubator Time In is required for R-Card method');
		if (!timeOUTIncDate.value || !timeOUTIncTime.value) formErrors.value.push('Incubator Time Out is required for R-Card method');

		if (incubationTime.value !== null && !isIncubationTimeValid.value) {
			formErrors.value.push('Incubation time should be between 20 and 24 hours');
		}

		// Helper function to check if a value has been explicitly set (including zero)
		const isValueSet = (val) => val === 0 || Boolean(val);
		
		// Check if all three E. coli counts have been set (including zeros)
		if (!isValueSet(ecoliA_count.value) || !isValueSet(ecoliB_count.value) || !isValueSet(ecoliC_count.value)) {
			formErrors.value.push('All three E. coli counts are required for R-Card method');
		}
		
		// Check if all sample volumes are set
		if (!isValueSet(sampleVolA.value) || !isValueSet(sampleVolB.value) || !isValueSet(sampleVolC.value)) {
			formErrors.value.push('All three sample volumes are required for R-Card method');
		}
	}

  return formErrors.value.length === 0;
});

const selectedFiles = ref({}); // ref to store the selected files

// Handle file selection
const handleFilesSelected = (files) => {
  if (!files) return;
  try {
    // Your existing file handling logic
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

    if (isEditMode.value) {
		const { baseData, relationshipData } = prepareSampleData();
  
		// Update base table
		await useDirectus(updateItem('base_samples', sampleId.value, baseData));
		
		// Update relationships
		await updateJoinTable('base_samples_lu_odor', sampleId.value, relationshipData.odor);
		await updateJoinTable('base_samples_lu_water_surface', sampleId.value, relationshipData.water_surface);
		await updateJoinTable('base_samples_lu_bacterial_sources', sampleId.value, relationshipData.bacterial_sources);
		await updateJoinTable('base_samples_lu_water_color', sampleId.value, relationshipData.water_color);
		await updateJoinTable('base_samples_directus_users', sampleId.value, selectedSamplerIds.value);
        
		if (selectedFiles.value && (Object.keys(selectedFiles.value).length > 0 || selectedFiles.value.sampleFormFile)) {
			// Upload new photos
			const uploadedFileTypes = await uploadFiles(sampleId.value, wwkyid_pk.value, selectedFiles.value, "base");
				
			// Create new photo records
			await createOrUpdatePhotoRecords(sampleId.value, wwkyid_pk.value, uploadedFileTypes);
				
			// Update photo and form counts
			await updateSampleWithPhotoInfo(sampleId.value, selectedFiles.value);
		}


      toast.add({
        title: 'Success',
        description: 'Sample updated successfully',
        color: 'green'
      });
	} else {
		// Create a new sample
		const { baseData, relationshipData } = prepareSampleData();
		const createdSample = await useDirectus(createItem('base_samples', baseData));

		createdSampleId = createdSample.id;
		sampleSiteId = createdSample.wwky_id;

		// Step 2: Update join tables
		await updateJoinTable('base_samples_lu_odor', createdSampleId, relationshipData.odor);
		await updateJoinTable('base_samples_lu_water_surface', createdSampleId, relationshipData.water_surface);
		await updateJoinTable('base_samples_lu_bacterial_sources', createdSampleId, relationshipData.bacterial_sources);
		await updateJoinTable('base_samples_lu_water_color', createdSampleId, relationshipData.water_color);
		await updateJoinTable('base_samples_directus_users', createdSampleId, selectedSamplerIds.value);

		// Step 3: Handle file uploads
		submissionStatus.value = 'Uploading photos...';
		submissionProgress.value = 75;

		const formType = "base";
		const uploadedFileTypes = await uploadFiles(createdSampleId, sampleSiteId, files, formType);

		// Step 4: Create records in lu_sample_photos
		await createOrUpdatePhotoRecords(createdSampleId, sampleSiteId, uploadedFileTypes);

		// Step 5: Update base_samples with photo information
		await updateSampleWithPhotoInfo(createdSampleId, files);
	}

    submissionProgress.value = 100;
    submittedSampleId.value = createdSampleId || sampleId.value;
    
    // Small delay to ensure smooth transition
    await new Promise(resolve => setTimeout(resolve, 500));
    
    isSubmitting.value = false;
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

	// Skip if no relatedIds or empty array
	if (!relatedIds || !relatedIds.length) {
	return;
	}

	// Handle the special case for samplers table
	const relatedIdColumn = tableName === 'base_samples_directus_users' 
	? 'directus_users_id' 
	: tableName.replace('base_samples_', '') + '_id';

	const items = relatedIds.map(id => ({
	base_samples_id: sampleId,
	[relatedIdColumn]: id
	}));

	await useDirectus(createItems(tableName, items));
  } catch (error) {
    console.error(`Error updating join table ${tableName}:`, error);
    console.error('RelatedIds:', relatedIds);
    throw new Error(`Failed to update ${tableName}: ${error.message}`);
  }
};

const prepareSampleData = () => {
	// Helper functions with range validation
	const toNullableNumber = (value, min = -Infinity, max = Infinity) => {
		// Explicitly check for 0
		if (value === 0 || value === '0') return 0;
		
		const num = parseFloat(value);
		if (isNaN(num) || num < min || num > max) return null;
		return num;
	};

	const toNullableInteger = (value, min = -2147483648, max = 2147483647) => {
		// Check if value is explicitly 0
		if (value === 0 || value === '0') return 0;
		
		const num = parseInt(value, 10);
		if (isNaN(num) || num < min || num > max) return null;
		return num;
	};

	// Get the average E. coli value with range validation
	let avgEcoli = null;
	if (typeof averageEcoli.value === 'number') {
		avgEcoli = toNullableNumber(averageEcoli.value, 0, 2147483647);
	} else if (typeof averageEcoli.value === 'string' && !averageEcoli.value.includes('Please enter')) {
		avgEcoli = toNullableNumber(averageEcoli.value, 0, 2147483647);
	}

	// Prepare sample data with range validations
	const baseData = {
		status: 'finalized',
		volunteer_id: volunteer_id.value,// This should be the selected primary sampler ID
		participants_adults: adults.value === 0 ? 0 : toNullableInteger(adults.value),
		participants_youth: youths.value === 0 ? 0 : toNullableInteger(youths.value),
		total_volunteer_minutes: totalVolunteerMinutes.value === 0 ? 0 : toNullableInteger(totalVolunteerMinutes.value),
		miles_driven: milesDriven.value === 0 ? 0 : toNullableInteger(milesDriven.value),
		water_temperature: toNullableNumber(waterTemperature.value),
		pH: toNullableNumber(pH.value),
		dissolved_oxygen: toNullableNumber(dissolvedOxygen.value),
		conductivity: toNullableNumber(conductivity.value),
		stream_flow_measurement: toNullableNumber(streamFlowMeasured.value),
		negsample: negsample.value || null,
		field_multimeter_certify: iCertifyCheckbox.value,
		other_observations_or_measurements: otherObs.value || null,
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
		conductivity_meter_calibration_date: conductivityMeterCalibrationDate.value || null,
		other_meter_calibration_date: otherMeterCalibrationDate.value || null,
		field_multimeter_model: field_multimeter_model.value || null,
		field_multimeter_manuf: field_multimeter_manuf.value || null,
	};

	// Only include bacteria-related fields if R-Card method is selected
	if (useRCard.value) {
		Object.assign(baseData, {
		bacteria_timedate_in: fullTimeIN.value,
		bacteria_timedate_out: fullTimeOUT.value,
		bacteria_rcard_initials: bacteriaRCardInitials.value || null,
		bacteria_sample_a_ecoli_count: toNullableInteger(ecoliA_count.value),
		bacteria_sample_a_ecoli: toNullableNumber(ecoliA.value),
		bacteria_sample_a_volume: toNullableNumber(sampleVolA.value),
		bacteria_sample_b_ecoli_count: toNullableInteger(ecoliB_count.value),
		bacteria_sample_b_ecoli: toNullableNumber(ecoliB.value),
		bacteria_sample_b_volume: toNullableNumber(sampleVolB.value),
		bacteria_sample_c_ecoli_count: toNullableInteger(ecoliC_count.value),
		bacteria_sample_c_ecoli: toNullableNumber(ecoliC.value),
		bacteria_sample_c_volume: toNullableNumber(sampleVolC.value),
		bacteria_avg_ecoli_cfu: avgEcoli
		});
	}

	// Remove null values
	Object.keys(baseData).forEach(key => 
		baseData[key] === null && delete baseData[key]
	);

	// Only include non-null values
	const cleanedData = {};
	for (const [key, value] of Object.entries(baseData)) {
		if (value !== null && value !== undefined) {
			cleanedData[key] = value;
		}
	}

	return {
		baseData: cleanedData,
		relationshipData: {
		odor: getSelectedOdors(),
		water_surface: getSelectedWaterSurfaces(),
		bacterial_sources: getSelectedBacterialSources(),
		water_color: [toNullableInteger(waterColor.value)]
		}
	};
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

//helper time/date functions
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Format to YYYY-MM-DDThh:mm
  return date.toISOString().slice(0, 16);
};

const validateDateTime = (value) => {
  if (!value) return '';
  // Ensure year is between 1900 and 2100
  const date = new Date(value);
  if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
    return '';
  }
  return formatDateTime(value);
};

// Add these computed properties
const timeInModel = computed({
  get() {
    if (!timeINIncubator.value) return '';
    try {
      const date = new Date(timeINIncubator.value);
      if (isNaN(date.getTime())) return '';
      // Format to YYYY-MM-DDThh:mm format expected by datetime-local input
      return date.toISOString().substring(0, 16);
    } catch (e) {
      console.error('Error formatting time in:', e);
      return '';
    }
  },
  set(value) {
    if (!value) {
      timeINIncubator.value = null;
      return;
    }
    try {
      // Store as ISO string to maintain consistency
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        timeINIncubator.value = date.toISOString();
      }
    } catch (e) {
      console.error('Error setting time in:', e);
    }
  }
});

const timeOutModel = computed({
  get() {
    if (!timeOUTIncubator.value) return '';
    try {
      const date = new Date(timeOUTIncubator.value);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().substring(0, 16);
    } catch (e) {
      console.error('Error formatting time out:', e);
      return '';
    }
  },
  set(value) {
    if (!value) {
      timeOUTIncubator.value = null;
      return;
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        timeOUTIncubator.value = date.toISOString();
      }
    } catch (e) {
      console.error('Error setting time out:', e);
    }
  }
});


// File upload handler
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
	const storedExtension = isImage ? 'png' : 'pdf'; // This is the extension we'll actually use
	
	formData.append('sampleFormFile', formFile);
	formData.append('isFormImage', isImage.toString());
	formData.append('storedExtension', storedExtension); // Add this to formData
	
	uploadedFiles.push({
		type: 'form',
		extension: storedExtension, // Use the actual extension it will be stored as
		origPhotoName: formFile.name,
		isImage
	});

	// If replacing file, we need to check for existing form file
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
      readItems('lu_sample_photos', {
        filter: { sample_id: { _eq: sampleId } }
      })
    );

    for (const { type, extension, origPhotoName, isImage } of uploadedFiles) {
      // Use the correct extension based on file type
      const finalExtension = type === 'form' ? extension : 'png';
      const filePath = `https://kyww.uky.edu/webshare/kyww_images/base/${siteId}/${sampleId}/${type}_${sampleId}.${finalExtension}`;
      const existingRecord = existingRecords.find(record => record.type === type);

      const photoData = {
        file_path: filePath,
        origphotoname: origPhotoName,
        is_image: type === 'form' ? isImage : true // Add this if you want to track if form is an image
      };

      if (existingRecord) {
        await useDirectus(
          updateItem('lu_sample_photos', existingRecord.id, photoData)
        );
      } else {
        await useDirectus(
          createItem('lu_sample_photos', {
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
    // Count regular photos (excluding form)
    const photoCount = Object.keys(files.files || {}).length;
    
    // Check if form is present (either new or existing)
    const hasForm = !!(files.sampleFormFile || files.existingFormFile);

    // Update the base_samples table
    await useDirectus(updateItem('base_samples', sampleId, {
      photos_added: photoCount,
      form_added: hasForm
    }));

  } catch (error) {
    console.error('Error updating sample photo info:', error);
    throw error;
  }
};

const rollbackChanges = async (sampleId) => {
  try {

    // Delete entries from join tables
    await deleteJoinTableEntries('base_samples_lu_odor', sampleId);
    await deleteJoinTableEntries('base_samples_lu_water_surface', sampleId);
    await deleteJoinTableEntries('base_samples_lu_bacterial_sources', sampleId);
    await deleteJoinTableEntries('base_samples_lu_water_color', sampleId);
	await deleteJoinTableEntries('base_samples_directus_users', sampleId);

    // Delete the created sample
    await useDirectus(deleteItem('base_samples', sampleId));
    
    // Delete any created photo records
    await useDirectus(deleteItems('lu_sample_photos', {
      filter: { sample_id: sampleId }
    }));
    
    // Delete uploaded files - not done yet
   
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
  } catch (error) {
    console.error(`Error deleting entries from ${tableName}:`, error);
    // We don't throw here to allow the rollback process to continue with other tables
  }
};

// New function to show error modal
const showErrorModal = () => {
  isErrorModalVisible.value = true;
};

// New reactive variables for error handling
const isErrorModalVisible = ref(false);

const resetForm = () => {
  // Reset form refs
  Object.values(formRefs).forEach(ref => {
    if (ref && typeof ref.value !== 'undefined') {
      if (typeof ref.value === 'boolean') ref.value = false;
      else if (Array.isArray(ref.value)) ref.value = [];
      else if (typeof ref.value === 'number') ref.value = null;
      else ref.value = '';
    }
  });

  // Reset state refs
  formErrors.value = [];
  isConfirmationModalOpen.value = false;
  showValidationErrors.value = false;
  isLoading.value = false;
  isMapOpen.value = false;
  directSiteId.value = '';
  isSiteIdValid.value = null;
  isCheckingSiteId.value = false;
  
  // Reset submission state
  isSubmitting.value = false;
  isSubmitted.value = false;
  submittedSampleId.value = '';
  submissionStatus.value = '';
  submissionProgress.value = 0;
  uploadedFileTypes.value = [];
  errorMessage.value = '';
  
  // Reset file upload related state
  selectedFiles.value = {};
  if (photoUpload.value && typeof photoUpload.value.reset === 'function') {
    photoUpload.value.reset();
  }
  existingPhotos.value = [];
  
  // Reset R-Card specific fields
  useRCard.value = false;
  timeINIncDate.value = null;
  timeINIncTime.value = null;
  timeOUTIncDate.value = null;
  timeOUTIncTime.value = null;
    
  // Force a re-render of file upload component
  nextTick(() => {
    allFilesSelected.value = false;
  });
};

const handleNewSample = () => {
  resetForm();
  isSubmitted.value = false;
  navigateTo('/portal/sample');
};

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
  otherMeterCalibrationDate.value = new Date().toISOString().split('T')[0]; // Today's date
  streamFlowVisual.value = 3; // Assuming 3 represents 'Normal'
  streamFlowMeasured.value = 2.5;
  bacteriaRCardInitials.value = 'DCC';
  iCertifyCheckbox.value = true;
  ecoliA_count.value = 12;
  sampleVolA.value = 10;
  ecoliB_count.value = 10;
  sampleVolB.value = 10;
  ecoliC_count.value = 14;
  sampleVolC.value = 10;
  bacterialSourceHuman.value = true;
  bacterialSourceLivestock.value = true;
  otherObs.value = 'This is a test observation.';
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
//END DEV TESTING

const viewDashboard = () => {
	navigateTo('/portal/');
};

const handleCancel = () => {
  if (wwkyid_pk.value) {
    navigateTo(`/portal/sites/${wwkyid_pk.value}`);
  } else {
    navigateTo('/portal/');
  }
};

onMounted(async () => {
  try {
    if (isEditMode.value) {
      const hasPermission = await canEditForm();
      if (!hasPermission) {
        toast.add({
          title: 'Access Denied',
          description: 'You do not have permission to edit this sample.',
          color: 'red'
        });
        navigateTo('/portal/');
        return;
      }
    }
    await initializeComponent();
    
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'q') {
        fillFormWithTestData();
      }
    });
    
  } catch (error) {
    console.error('Error in onMounted hook:', error);
  }
});

// Add a watch effect for incubator times to show warnings
watch([fullTimeIN, fullTimeOUT], ([newIn, newOut]) => {
  if (!newIn || !newOut) return;
  
  const timeIn = new Date(newIn);
  const timeOut = new Date(newOut);
  
  if (timeIn.getTime() === timeOut.getTime()) {
    toast.add({
      title: 'Warning',
      description: 'Time In and Time Out cannot be the same',
      color: 'red'
    });
    return;
  }
  
  if (timeOut < timeIn) {
    toast.add({
      title: 'Warning',
      description: 'Time Out cannot be before Time In',
      color: 'red'
    });
    return;
  }
  
  if (!isIncubationTimeValid.value) {
    toast.add({
      title: 'Warning',
      description: 'Incubation time should be between 20 and 24 hours',
      color: 'yellow'
    });
  }
});

watch(useRCard, (newValue) => {
  if (newValue) {
    initializeSampleVolumes();
  }
});

//watch to trigger data fetching when query parameters change
watch(
  () => route.fullPath,
  async (newPath, oldPath) => {
    if (newPath.includes('edit=') && isEditMode.value) {
      const hasPermission = await canEditForm();
      if (!hasPermission) {
        toast.add({
          title: 'Access Denied',
          description: 'You do not have permission to edit this sample.',
          color: 'red'
        });
        navigateTo('/portal/');
      }
    }
    // Rest of your existing watch logic...
	if (newPath === '/portal/sample' && oldPath !== newPath) {
      resetForm();
      await nextTick();
      if (photoUpload.value) {
        photoUpload.value.reset();
      }
    }
  }
);

// Separate watch for edit mode
watch([isEditMode, sampleId], ([newIsEditMode, newSampleId]) => {
  if (newIsEditMode && newSampleId) {
    fetchSampleData(newSampleId);
  }
});

// Add to your component's script
const isCancelModalOpen = ref(false);

const showCancelConfirmation = () => {
  isCancelModalOpen.value = true;
};

const confirmCancel = () => {
  isCancelModalOpen.value = false;
  handleCancel();
};	

</script>
<template>
  <PolicyGuard path="/portal/sample">
  <div>
    <ClientOnly>
      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center min-h-screen">
        <ULoader />
      </div>
	
      <!-- Error state -->
      <div v-else-if="error" class="p-4 bg-red-100 text-red-700">
        {{ error }}
      </div>

	<div v-else>
		<PortalPageHeader
			:title="isEditMode ? 'Edit Sample ('+ sampleId +')' : 'New Sample'"
			:breadcrumbs="isEditMode ? [
				{
				title: 'Portal',
				href: '/portal',
				},
				{
				title: 'Edit Sample',
				href: '#',
				}
			] : [
				{
				title: 'Portal',
				href: '/portal',
				},
				{
				title: 'New Sample',
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
					? `Sample ${sampleId} has been successfully updated.`
					: `Your sample (number: ${submittedSampleId}) has been successfully submitted.`
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
					label="Submit Another Sample" 
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
			<h3 class="text-3xl text-center text-gray-900">Kentucky Watershed Watch Monitoring Data Form</h3>
			<div class="my-4 text-center">
				<a 
					href="https://drive.google.com/file/d/1KPgdTTckYaXQmQsySBg3_WyEsrovBRqk/view" 
					target="_blank" 
					rel="noopener noreferrer" 
					class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
				>
					<UIcon name="i-heroicons-document-text" class="mr-2" />
					Download PDF Version of Form
				</a>
				<p class="mt-2 text-sm text-gray-600">Access the printable version of this form for field use</p>
			</div>

			<Form @submit.prevent="submitData">
				<div class="relative items-start">
				<div class="border-4 p-1 border-gray-900">
					<div class="p-2">
						<h1 class="text-xl text-center bact-msg">IF USING <strong>R-CARD METHOD</strong> FOR E. COLI ANALYSIS, IT SHOULD BE COMPLETED BEFORE FILLING OUT AND SUBMITTING THIS FORM.</h1>
					</div>
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
							<CustomNumberInput
								v-model="adults"
								icon="ic:baseline-group"
								required
							/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" required>
							<label class="block mb-1 required-field"># Youth Participants:</label>
							<CustomNumberInput
								v-model="youths"
								icon="healthicons:child-program"
								required
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
							<CustomNumberInput
								v-model="totalVolunteerMinutes"
								placeholder="Travel+Sampling"
								required
							/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4">
							<label class="block mb-1 required-field">Miles Driven:</label>
							<CustomNumberInput
								v-model="milesDriven"
								icon="fa-solid:car-side"
								required
							/>
						</UFormGroup>
					</div>
					<div class="p-2 text-sm text-right">
						<h1>Total time spent sampling at multiple sites should only be entered once.</h1>
						<h1>Total miles driven to sample at multiple sites should only be entered once.</h1>
					</div>
				</div>
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3">
						<label class="block mb-1 required-field">Current Weather:</label>
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
							<label class="block mb-1 required-field">Rainfall in last 48 hours (round up):</label>
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
							<label class="block mb-1">Water Surface/Other:</label>
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
							<label class="block mb-1 required-field">Stream Flow (Visual):</label>
							<URadioGroup v-model="streamFlowVisual" :options="streamFlowVisualOptions" name="streamFlowVisual" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox
								v-model="negsample"
								:true-value="true"
								:false-value="false"
								label="Unable to sample due to flow conditions (flooded, ponded or dry)"
							/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox
								v-model="streamMeter"
								label="Check here if using a stream flow meter? (optional)"
								icon="mdi:water"
								@click="!streamMeter"
							/>
							<UInput v-if="streamMeter" v-model="streamFlowMeasured" icon="mdi:water" placeholder="CuFt/Sec" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<img src="assets/form_icons/stream_flow.png" alt="Stream Flow" class="w-full" />
					</div>
				</div>

				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2">
							<label class="block mb-1 required-field">Trash/Litter:</label>
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
						Other Meter
						<UFormGroup class="p-2" label=" Calibration Date">
							<UInput v-model="otherMeterCalibrationDate" type="date" />
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
						<UCheckbox
						v-model="useRCard"
						/><label class="text-1x1 font-bold">&nbsp;Using R-Card Method for Bacteria Analysis</label>	
					</div>

					<template v-if="useRCard">
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
						<p class="text-center bact-msg">Time Out should be between 20 and 24 hrs at 35-38°C after placing cards in incubator</p>
						</div>
						
						<!-- New two-row layout -->
						<div class="space-y-6">
						<!-- Top row with time inputs and calculations -->
						<div class="grid grid-cols-[1fr_2fr] gap-6">
							<!-- Left Column - Time inputs -->
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<UFormGroup>
										<label class="text-sm required-field">Date In</label>
										<UInput 
										v-model="timeINIncDate"
										type="date"
										icon="solar:calendar-bold"
										/>
									</UFormGroup>
									<UFormGroup>
										<label class="text-sm required-field">Time In</label>
										<UInput 
										v-model="timeINIncTime"
										type="time"
										icon="mdi:clock-outline"
										/>
									</UFormGroup>
									</div>

									<div class="grid grid-cols-2 gap-4">
									<UFormGroup>
										<label class="text-sm required-field">Date Out</label>
										<UInput 
										v-model="timeOUTIncDate"
										type="date"
										icon="solar:calendar-bold"
										/>
									</UFormGroup>
									<UFormGroup>
										<label class="text-sm required-field">Time Out</label>
										<UInput 
										v-model="timeOUTIncTime"
										type="time"
										icon="mdi:clock-outline"
										/>
									</UFormGroup>
								</div>
								<div v-if="fullTimeIN && fullTimeOUT && !isIncubationTimeValid" 
									class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
									Warning: Incubation time should be between 20 and 24 hours. 
									{{ displayIncubationTime }}
								</div>
								<div v-if="fullTimeIN && fullTimeOUT && isIncubationTimeValid" 
									class="mt-2 p-2 rounded">
									<b>{{ displayIncubationTime }}</b>
								</div>
								<UFormGroup>
									<label class="text-sm required-field">Initials of R-Card Reader</label>
									<UInput v-model="bacteriaRCardInitials" />
								</UFormGroup>
							</div>

							<!-- Right Column - E.coli counts -->
							<div class="border-l border-gray-200 pl-6">
							<div class="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-2">
								<!-- Headers -->
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap required-field"># E.coli/card</label>
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap required-field">Sample Vol (mL)</label>
								<div></div>
								<label class="text-sm font-semibold whitespace-nowrap required-field">E.coli/100mL</label>

								<!-- Sample A -->
								<label class="self-center text-sm whitespace-nowrap required-field">Sample A:</label>
								<UInput v-model="ecoliA_count" type="number" required />
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<USelect
								v-model="sampleVolA"
								:options="sampleVolOptions"
								:default-value="defaultSampleVol"
								/>
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliA" type="number" disabled />

								<!-- Sample B -->
								<label class="self-center text-sm whitespace-nowrap required-field">Sample B:</label>
								<UInput v-model="ecoliB_count" type="number" required/>
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<USelect
								v-model="sampleVolB"
								:options="sampleVolOptions"
								:default-value="defaultSampleVol"
								/>
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliB" type="number" disabled />

								<!-- Sample C -->
								<label class="self-center text-sm whitespace-nowrap required-field">Sample C:</label>
								<UInput v-model="ecoliC_count" type="number" />
								<span class="self-center text-sm font-semibold px-1">÷</span>
								<USelect
								v-model="sampleVolC"
								:options="sampleVolOptions"
								:default-value="defaultSampleVol"
								/>          
								<span class="self-center text-sm font-semibold px-1 whitespace-nowrap">× 100 =</span>
								<UInput v-model="ecoliC" type="number" disabled />
							</div>

							<!-- Average -->
							<div class="mt-4 grid grid-cols-2 gap-2">
								<label class="text-sm font-semibold self-center required-field">Average E.&nbsp;coli/100mL:</label>
								<UInput v-model="averageEcoli" disabled />
							</div>

							<div v-if="isEcoliVariationHigh" class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
								The variation between E. Coli samples is high ( > 1000).
							</div>
							</div>
						</div>

						<!-- Bottom row - Bacterial Sources -->
						<div class="border-t border-gray-200 pt-4">
							<h3 class="text-m font-semibold mb-2 whitespace-nowrap required-field">Possible Bacterial Sources:</h3>
							<div class="grid grid-cols-1 gap-x-1 gap-y-1">
							<UCheckbox v-model="bacterialSourceDuckGoose" label="Duck/Goose" value="1" />
							<UCheckbox v-model="bacterialSourceHuman" label="Human" value="2" />
							<UCheckbox v-model="bacterialSourceLivestock" label="Livestock" value="3" />
							<UCheckbox v-model="bacterialSourcePetWaste" label="Pet Waste" value="4" />
							<UCheckbox v-model="bacterialSourceWildlife" label="Wildlife" value="5" />
							<UCheckbox v-model="bacterialSourceOther" label="Other" @click="!bacterialSourceOther" value="6" />
							<div v-if="bacterialSourceOther" class="col-span-2 mt-1">
								<UInput v-model="bacterialSourceOtherData" class="w-full" placeholder="Specify other bacterial source..." />
							</div>
							</div>
						</div>
						</div>
					</template>
				</div>
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
								:site-id="wwkyid_pk"
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
							{{ isSubmitting ? 'Submitting...' : isEditMode ? 'Save Changes' : 'Submit Sample' }}
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
						? 'Are you sure you want to save these changes to the sample data? Please review your modifications before confirming.'
						: 'Are you sure you want to submit this new sample data? Please review your entries before confirming.'
					}}
					</p>
					<template #footer>
					<div class="flex justify-end space-x-4">
						<UButton @click="isConfirmationModalOpen = false" color="gray">
						Cancel
						</UButton>
						<UButton @click="submitData" color="primary">
						{{ isEditMode ? 'Save Changes' : 'Submit Sample Data' }}
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

	<div v-if="formErrors.length > 0" class="mb-4 mt-6 mx-auto max-w-4xl"> <!-- Added mt-6 for top margin -->
		<div class="bg-orange-50 border-2 border-orange-400 p-4 rounded-lg"> <!-- Changed to border-2 and added rounded-lg -->
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

.bact-msg {
  background-color: #fffb17;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-left: 0.8rem;
  padding-right: 0.8rem;
  border-radius: 0.5rem;
}

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

:deep(.textarea) {
  min-height: 200px;
  line-height: 1.5;
  padding: 0.75rem;
}
</style>