// ============================================================================
// Trainers API Endpoint
// ============================================================================
// File: server/api/trainers.get.ts
// GET: Retrieve all active trainers from training_history
// Authorization: Only accessible by users with trainer policy or admin role
// ============================================================================
import { getApiConfig, getDirectusHeaders } from '../utils/config';

const config = getApiConfig();

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed'
    });
  }

  // Get the authenticated user from the session/token
  const { userId } = getQuery(event);
  
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    });
  }

  try {
    // Fetch user with role and policies
    const userResponse = await fetch(
      `${config.public.directusUrl}/users/${userId}?fields=id,role.id,role.name,policies.policy`,
      {
        headers: getDirectusHeaders(config),
        method: 'GET'
      }
    );

    if (!userResponse.ok) {
      throw createError({
        statusCode: 403,
        message: 'Unable to verify user permissions'
      });
    }

    const userData = await userResponse.json();
    const user = userData.data;

    // Get role IDs from runtime config
    const runtimeConfig = useRuntimeConfig();
    const devAdminRole = runtimeConfig.public.DEVADMIN_ROLE_ID;
    const wwkyAdminRole = runtimeConfig.public.WWKYADMIN_ROLE_ID;
    const trainerPolicy = runtimeConfig.public.TRAINER_POLICY_ID;
    const fullAdminPolicy = runtimeConfig.public.FULLADMIN_POLICY_ID;

    // Check if user is admin by role
    const isAdmin = user.role?.id === devAdminRole || user.role?.id === wwkyAdminRole;

    // Check if user has trainer or full admin policy
    let hasTrainerAccess = false;
    
    if (!isAdmin && user.policies && Array.isArray(user.policies)) {
      const userPolicyIds = user.policies.map(p => p.policy);
      hasTrainerAccess = userPolicyIds.includes(trainerPolicy) || userPolicyIds.includes(fullAdminPolicy);
    }

    // If user is neither admin nor has trainer policy, deny access
    if (!isAdmin && !hasTrainerAccess) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. Only trainers and administrators can view this data.'
      });
    }

    // Fetch all training records with trainer information
    const historyResponse = await fetch(
      `${config.public.directusUrl}/items/training_history?` +
      `fields=trainer_id.id,trainer_id.first_name,trainer_id.last_name,trainer_id.email,trainer_id.status&` +
      `filter={"trainer_id":{"_nnull":true}}&` +
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

    // Extract unique trainers
    const uniqueTrainersMap = new Map();
    
    records.forEach(record => {
      if (record.trainer_id && record.trainer_id.id) {
        const trainerId = record.trainer_id.id;
        
        // Only add if not already in map and trainer is active
        if (!uniqueTrainersMap.has(trainerId) && record.trainer_id.status === 'active') {
          uniqueTrainersMap.set(trainerId, {
            id: record.trainer_id.id,
            first_name: record.trainer_id.first_name,
            last_name: record.trainer_id.last_name,
            email: record.trainer_id.email
          });
        }
      }
    });

    // Convert to array and sort by last name, first name
    const trainers = Array.from(uniqueTrainersMap.values()).sort((a, b) => {
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });

    return {
      success: true,
      trainers: trainers
    };

  } catch (error) {
    console.error('Error fetching trainers:', error);
    
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch trainers: ' + error.message
    });
  }
});