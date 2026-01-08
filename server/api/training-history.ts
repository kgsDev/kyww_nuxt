// ============================================================================
// Training History API Endpoint
// ============================================================================
// File: server/api/training-history.ts
// GET: Retrieve training history for a user or all users (with permissions)
// POST: Create new training history record
// ============================================================================
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';
import { createDirectus, rest, readItems, createItem } from '@directus/sdk';

const config = getApiConfig();

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // Authorization: Must provide trainerId to access
  const { trainerId } = getQuery(event);
    
  if (!trainerId) {
    throw createError({
      statusCode: 400,
      message: 'Must be authorized to see this'
    });
  }

  // ========================================
  // GET - Retrieve training history
  // ========================================
  if (method === 'GET') {
    const { userId, trainerId, summary } = getQuery(event);

    try {
      let filter: any = {
        status: { _eq: 'published' }
      };

      // If userId provided, filter by that user
      if (userId) {
        filter.user_id = { _eq: userId };
      }

      // If trainerId provided, filter by that trainer
      if (trainerId) {
        filter.trainer_id = { _eq: trainerId };
      }

      const historyResponse = await fetch(
        `${config.public.directusUrl}/items/training_history?` +
        `fields=*,user_id.first_name,user_id.last_name,user_id.email,` +
        `trainer_id.first_name,trainer_id.last_name,verified_by.first_name,verified_by.last_name&` +
        `filter=${JSON.stringify(filter)}&` +
        `sort[]=-training_date&` +
        `limit=-1`,
        {
          headers: getDirectusHeaders(config),
          method: 'GET'
        }
      );

      if (!historyResponse.ok) {
        throw new Error(`HTTP error! status: ${historyResponse.status}`);
      }

      const historyData = await historyResponse.json();
      const records = historyData.data;

      // If summary requested, return aggregated summary per user
      if (summary === 'true') {
        const summaryMap = new Map();

        records.forEach(record => {
          const uid = record.user_id.id || userId;
          if (!summaryMap.has(uid)) {
            summaryMap.set(uid, {
              user_id: uid,
              user_name: `${record.user_id.first_name} ${record.user_id.last_name}`,
              user_email: record.user_id.email,
              training_field_chemistry: false,
              training_r_card: false,
              training_habitat: false,
              training_biological: false,
              field_chemistry_date: null,
              r_card_date: null,
              habitat_date: null,
              biological_date: null,
              earliest_training_date: record.training_date,
              latest_training_date: record.training_date,
              total_sessions: 0,
              trainers: new Set()
            });
          }

          const summary = summaryMap.get(uid);
          summary.total_sessions++;

          if (record.trainer_id) {
            summary.trainers.add(`${record.trainer_id.first_name} ${record.trainer_id.last_name}`);
          }

          // Track which training types completed and most recent date for each
          if (record.training_field_chemistry) {
            summary.training_field_chemistry = true;
            if (!summary.field_chemistry_date || record.training_date > summary.field_chemistry_date) {
              summary.field_chemistry_date = record.training_date;
            }
          }
          if (record.training_r_card) {
            summary.training_r_card = true;
            if (!summary.r_card_date || record.training_date > summary.r_card_date) {
              summary.r_card_date = record.training_date;
            }
          }
          if (record.training_habitat) {
            summary.training_habitat = true;
            if (!summary.habitat_date || record.training_date > summary.habitat_date) {
              summary.habitat_date = record.training_date;
            }
          }
          if (record.training_biological) {
            summary.training_biological = true;
            if (!summary.biological_date || record.training_date > summary.biological_date) {
              summary.biological_date = record.training_date;
            }
          }

          // Update earliest/latest
          if (record.training_date < summary.earliest_training_date) {
            summary.earliest_training_date = record.training_date;
          }
          if (record.training_date > summary.latest_training_date) {
            summary.latest_training_date = record.training_date;
          }
        });

        // Convert trainers Set to array
        const summaries = Array.from(summaryMap.values()).map(s => ({
          ...s,
          trainers: Array.from(s.trainers)
        }));

        return { summary: true, data: summaries };
      }

      // Return full history records
      return { summary: false, data: records };

    } catch (error) {
      console.error('Error fetching training history:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch training history: ' + error.message
      });
    }
  }

  // ========================================
  // POST - Create new training record
  // ========================================
  if (method === 'POST') {
    try {
      const body = await readBody(event);

      // Validate required fields
      const {
        user_id,
        trainer_id,
        trainer_name,
        training_date,
        training_location,
        training_field_chemistry = false,
        training_r_card = false,
        training_habitat = false,
        training_biological = false,
        equip_ph = false,
        equip_do = false,
        equip_cond = false,
        equip_thermo = false,
        equip_waste = false,
        equip_pan = false,
        equip_flip = false,
        equip_incubator = false,
        notes = null
      } = body;

      // Validate at least one training type is selected
      if (!training_field_chemistry && !training_r_card && 
          !training_habitat && !training_biological) {
        throw createError({
          statusCode: 400,
          message: 'At least one training type must be selected'
        });
      }

      // Validate required fields
      if (!user_id || !training_date || !training_location) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields: user_id, training_date, training_location'
        });
      }

      // Create the training history record
      const createResponse = await fetch(
        `${config.public.directusUrl}/items/training_history`,
        {
          method: 'POST',
          headers: {
            ...getDirectusHeaders(config),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id,
            trainer_id: trainer_id || null,
            trainer_name: trainer_name || null,
            training_date,
            training_location,
            training_field_chemistry,
            training_r_card,
            training_habitat,
            training_biological,
            equip_ph,
            equip_do,
            equip_cond,
            equip_thermo,
            equip_waste,
            equip_pan,
            equip_flip,
            equip_incubator,
            notes,
            status: 'published',
            verified: false // Will be verified by manager later
          })
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Directus error:', errorText);
        throw new Error(`Failed to create training record: ${createResponse.status}`);
      }

      const createdData = await createResponse.json();

      return {
        success: true,
        message: 'Training record created successfully',
        data: createdData.data
      };

    } catch (error) {
      console.error('Error creating training history:', error);
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.message || 'Failed to create training history'
      });
    }
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    message: 'Method not allowed'
  });
});
