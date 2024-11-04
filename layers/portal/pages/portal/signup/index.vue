<template>
	<div>
	  <h1>Sign Up</h1>
	  <form @submit.prevent="submitSignup">
		<input v-model="password" type="password" placeholder="Create password" required />
		<button type="submit">Sign Up</button>
	  </form>
	</div>
  </template>
  
  <script lang="ts">
  
  export default defineComponent({
	setup() {
	  const password = ref<string>('');
	  const route = useRoute();
	  const router = useRouter();
	  const token = route.query.token as string | null;
  
	  const submitSignup = async () => {
		if (!token) {
		  alert('Invalid or missing token');
		  return;
		}
  
		try {
		  const response = await axios.post('/api/signup', {
			token,
			password: password.value,
		  });
  
		  if (response.data.success) {
			router.push('/login');
		  } else {
			alert('Error signing up');
		  }
		} catch (error) {
		  console.error(error);
		  alert('Error signing up');
		}
	  };
  
	  return { password, submitSignup };
	},
  });
  </script>