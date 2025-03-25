export default defineEventHandler(async (event) => {
  try {
    // Get runtime config
    const config = useRuntimeConfig();
    
    // Import the postgres module
    const { default: postgres } = await import('postgres');
    
    // Set content type for the response
    event.node.res.setHeader('Content-Type', 'application/json');
    
    // Parse query parameters
    const query = getQuery(event);
    const mode = query.mode || 'sites'; // Default to 'sites' if no mode specified
    const limitSamples = query.limit ? parseInt(query.limit) : null;
    
    // Create a connection
    const sql = postgres({
      host: config.DB_HOST,
      port: parseInt(config.DB_PORT || '5433'),
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_DATABASE
    });
    
    try {
      let result;
      
      // Handle different modes
      switch (mode) {
        case 'sites':
          // Enhanced sites query with sample counts
          const siteRows = await sql`
            SELECT 
              s.wwkyid_pk, 
              s.stream_name, 
              s.wwkybasin,
              s.description,
              s.comments,
              s.created_date,
              CASE
                WHEN s.wkb_geometry IS NOT NULL THEN ST_Y(s.wkb_geometry)
                ELSE s.latitude
              END AS latitude,
              CASE
                WHEN s.wkb_geometry IS NOT NULL THEN ST_X(s.wkb_geometry)
                ELSE s.longitude
              END AS longitude,
              -- Count the number of samples for each site
              (SELECT COUNT(*) FROM public.base_samples 
               WHERE wwky_id = s.wwkyid_pk) AS sample_count
            FROM wwky_sites s
            WHERE (s.wkb_geometry IS NOT NULL) OR (s.latitude IS NOT NULL AND s.longitude IS NOT NULL)
          `;
          
          result = {
            type: "FeatureCollection",
            features: siteRows.map(row => ({
              type: "Feature",
              properties: {
                id: row.wwkyid_pk,
                name: row.stream_name || `Site ${row.wwkyid_pk}`,
                basin: row.wwkybasin || 'N/A',
                description: row.description || '',
                comments: row.comments || '',
                createdDate: row.created_date,
                sampleCount: Number(row.sample_count) // Add sample count to properties
              },
              geometry: {
                type: "Point",
                coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
              }
            }))
          };
          break;
          
        case 'latest':
          // Latest samples query - only for sites that have samples
          const latestRows = await sql`
            WITH sample_sites AS (
              -- Get only sites that have at least one sample
              SELECT DISTINCT wwky_id 
              FROM public.base_samples
            )
            SELECT 
              s.wwkyid_pk, 
              s.stream_name, 
              s.wwkybasin,
              s.description,
              s.comments,
              b.sample_date,
              b.water_temperature,
              b."pH",
              b.dissolved_oxygen,
              b.conductivity,
              b.bacteria_avg_ecoli_cfu,
              b.turbidity,
              b.rainfall_amount,
              b.current_weather,
              b.stream_flow_visual,
              b.rainfall_lookup_text,
              b.weather_lookup_text,
              b.flow_lookup_text,
              b.other_observations_or_measurements,
              b.min_temperature,
              b.max_temperature,
              b.avg_temperature,
              b.min_ecoli,
              b.max_ecoli,
              b.avg_ecoli,
              b.total_samples,
              CASE
                WHEN s.wkb_geometry IS NOT NULL THEN ST_Y(s.wkb_geometry)
                ELSE s.latitude
              END AS latitude,
              CASE
                WHEN s.wkb_geometry IS NOT NULL THEN ST_X(s.wkb_geometry)
                ELSE s.longitude
              END AS longitude
            FROM 
              sample_sites ss
            JOIN 
              public.wwky_sites s ON ss.wwky_id = s.wwkyid_pk
            JOIN 
              public.wwky_sites_latest_samples_geojson b ON s.wwkyid_pk = b.wwkyid_pk
            WHERE 
              b.sample_date IS NOT NULL
          `;
          
          result = {
            type: "FeatureCollection",
            features: latestRows.map(row => ({
              type: "Feature",
              properties: {
                id: row.wwkyid_pk,
                name: row.stream_name || `Site ${row.wwkyid_pk}`,
                basin: row.wwkybasin || 'N/A',
                description: row.description || '',
                comments: row.comments || '',
                sampleDate: row.sample_date,
                // Latest sample data - forcing numeric values
                waterTemperature: row.water_temperature !== null ? Number(row.water_temperature) : null,
                pH: row.pH !== null ? Number(row.pH) : null,
                dissolvedOxygen: row.dissolved_oxygen !== null ? Number(row.dissolved_oxygen) : null,
                conductivity: row.conductivity !== null ? Number(row.conductivity) : null,
                eColiAvg: row.bacteria_avg_ecoli_cfu !== null ? Number(row.bacteria_avg_ecoli_cfu) : null,
                turbidity: row.turbidity !== null ? Number(row.turbidity) : null,
                // Text descriptions from lookup tables
                rainfall: row.rainfall_lookup_text,
                weather: row.weather_lookup_text,
                streamFlow: row.flow_lookup_text,
                // Original IDs - force numeric
                rainfallId: row.rainfall_amount !== null ? Number(row.rainfall_amount) : null,
                weatherId: row.current_weather !== null ? Number(row.current_weather) : null,
                streamFlowId: row.stream_flow_visual !== null ? Number(row.stream_flow_visual) : null,
                // Additional text
                samplecomments: row.other_observations_or_measurements,
                // Stats - force numeric
                totalSamples: row.total_samples !== null ? Number(row.total_samples) : null,
                temperatureRange: {
                  min: row.min_temperature !== null ? Number(row.min_temperature) : null,
                  max: row.max_temperature !== null ? Number(row.max_temperature) : null,
                  avg: row.avg_temperature !== null ? Number(row.avg_temperature) : null
                },
                eColiRange: {
                  min: row.min_ecoli !== null ? Number(row.min_ecoli) : null,
                  max: row.max_ecoli !== null ? Number(row.max_ecoli) : null,
                  avg: row.avg_ecoli !== null ? Number(row.avg_ecoli) : null
                }
              },
              geometry: {
                type: "Point",
                coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
              }
            }))
          };
          break;
          
        case 'nested':
          // Nested samples using the PostgreSQL function
          const nestedResult = await sql`
            SELECT public.generate_wwky_sites_geojson(${limitSamples})
          `;
          
          // The function returns a JSONB object
          result = nestedResult[0].generate_wwky_sites_geojson;
          break;
          
        case 'flat':
          // Get query parameters for filtering
          const siteId = query.site ? query.site : null;
          const fromDate = query.from ? query.from : null;
          const toDate = query.to ? query.to : null;
          const limit = query.limit ? parseInt(query.limit) : 1000; // Default limit
          
          // Build the query with potential filters
          let flatQuery = sql`
            SELECT 
              sample_id,
              sample_date,
              water_temperature,
              "pH",
              dissolved_oxygen,
              conductivity,
              bacteria_avg_ecoli_cfu,
              turbidity,
              transparency_tube_measure,
              rainfall_amount,
              current_weather,
              stream_flow_visual,
              rainfall_lookup_text,
              weather_lookup_text, 
              flow_lookup_text,
              other_observations_or_measurements,
              site_id,
              site_description,
              stream_name,
              wwkybasin,
              latitude,
              longitude
            FROM 
              public.wwky_sites_samples_flat
            WHERE 1=1
          `;
          
          // Add filters if provided
          if (siteId) {
            flatQuery = sql`${flatQuery} AND site_id = ${siteId}`;
          }
          
          if (fromDate) {
            flatQuery = sql`${flatQuery} AND sample_date >= ${fromDate}`;
          }
          
          if (toDate) {
            flatQuery = sql`${flatQuery} AND sample_date <= ${toDate}`;
          }
          
          // Add ordering and limit
          flatQuery = sql`
            ${flatQuery}
            ORDER BY sample_date DESC
            LIMIT ${limit}
          `;
          
          // Execute the query
          const flatRows = await flatQuery;
          
          // Create GeoJSON from flattened results with explicit numeric type conversion
          result = {
            type: "FeatureCollection",
            features: flatRows.map(row => ({
              type: "Feature",
              properties: {
                id: Number(row.sample_id),
                siteId: Number(row.site_id),
                siteName: row.stream_name || `Site ${row.site_id}`,
                basin: row.wwkybasin || 'N/A',
                description: row.site_description || '',
                sampleDate: row.sample_date,
                // Numeric values - force numeric type with explicit conversion
                waterTemperature: row.water_temperature !== null ? Number(row.water_temperature) : null,
                pH: row.pH !== null ? Number(row.pH) : null,
                dissolvedOxygen: row.dissolved_oxygen !== null ? Number(row.dissolved_oxygen) : null,
                conductivity: row.conductivity !== null ? Number(row.conductivity) : null,
                eColiAvg: row.bacteria_avg_ecoli_cfu !== null ? Number(row.bacteria_avg_ecoli_cfu) : null,
                turbidity: row.turbidity !== null ? Number(row.turbidity) : null,
                transparencyTube: row.transparency_tube_measure !== null ? Number(row.transparency_tube_measure) : null,
                // Text descriptions from lookup tables
                rainfall: row.rainfall_lookup_text,
                weather: row.weather_lookup_text,
                streamFlow: row.flow_lookup_text,
                // Original IDs - force numeric
                rainfallId: row.rainfall_amount !== null ? Number(row.rainfall_amount) : null,
                weatherId: row.current_weather !== null ? Number(row.current_weather) : null,
                streamFlowId: row.stream_flow_visual !== null ? Number(row.stream_flow_visual) : null,
                // Additional text
                samplecomments: row.other_observations_or_measurements
              },
              geometry: {
                type: "Point",
                coordinates: [Number(row.longitude), Number(row.latitude)]
              }
            }))
          };
          break;
          
        default:
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid mode: ${mode}. Valid modes are 'sites', 'latest', 'nested', or 'flat'.`
          });
      }
      
      // Return the GeoJSON
      return result;
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate GeoJSON: ' + dbError.message
      });
    } finally {
      // Close the connection
      await sql.end();
    }
  } catch (error) {
    console.error('General error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate GeoJSON: ' + error.message
    });
  }
});