// server/api/my-training-status.get.ts
import { getApiConfig, getDirectusHeaders } from '../utils/config';

const config = getApiConfig();
const EXPIRATION_YEARS = 3;

export default defineEventHandler(async (event) => {
  const { userId } = getQuery(event);

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Authentication required' });
  }

  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - EXPIRATION_YEARS);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const filter = JSON.stringify({
    _and: [
      { user_id: { _eq: userId } },
      { training_date: { _gte: cutoffStr } },
      { status: { _eq: 'published' } }
    ]
  });

  const response = await fetch(
    `${config.public.directusUrl}/items/training_history?` +
    `fields=training_date,training_field_chemistry,training_habitat,training_biological,training_r_card&` +
    `filter=${filter}&limit=-1`,
    { headers: getDirectusHeaders(config) }
  );

  if (!response.ok) {
    throw createError({ statusCode: 500, message: 'Failed to fetch training status' });
  }

  const { data } = await response.json();

  // Reduce to a simple "does the user have any unexpired record for each type"
  const status = {
    fieldChemistry: false,
    habitat: false,
    biological: false,
    rCard: false,
  };

  for (const record of data ?? []) {
    if (record.training_field_chemistry) status.fieldChemistry = true;
    if (record.training_habitat)         status.habitat = true;
    if (record.training_biological)      status.biological = true;
    if (record.training_r_card)          status.rCard = true;
  }

  return status;
});