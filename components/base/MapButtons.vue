<script>

const isOpen = ref(false);
</script><template>
<UFormGroup class="p-2 basis-1/4" label="Select a Site">
    <UButton label="Open Map" @click="isOpen = true" />
</UFormGroup>
<UModal v-model="isOpen">
						<div class="p-4">
							<div class="embed-container">
								<iframe
									width="800"
									height="600"
									frameborder="0"
									scrolling="yes"
									marginheight="0"
									marginwidth="0"
									title="WWKY Pick A Site"
									src="//kygs.maps.arcgis.com/apps/Embed/index.html?webmap=0b9b8080cf574324847adcf99fb84c93&extent=-93.2364,33.5842,-77.0536,41.2751&zoom=true&scale=true&disable_scroll=false&theme=light"
								></iframe>
							</div>
						</div>
					</UModal>
</template>
