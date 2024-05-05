<template>
	<div>
		<h1>Trainer Email Registration</h1>
		<textarea v-model="emailList" placeholder="Enter emails separated by , ; or space"></textarea>
		<button @click="submitEmails">Submit</button>
	</div>
</template>

<script>
export default {
	data() {
		return {
			emailList: '',
		};
	},
	methods: {
		submitEmails() {
			const emails = this.emailList.split(/[,; ]+/);

			this.$http
				.get('/api/trainSend.ts', { emails })
				.then((response) => {
					print('All emails successfully sent.');
					print(response);
				})
				.catch((error) => {
					// handle error
					print('Not all emails sent. Error: ', error);
				});
		},
	},
};
</script>
