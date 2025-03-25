export default defineEventHandler(async (event) => {
    try {
      // Get runtime config
      const config = useRuntimeConfig();
      
      // Import the postgres module
      const { default: postgres } = await import('postgres');
      
      // Set content type for the response
      event.node.res.setHeader('Content-Type', 'application/json');
      
      // Create a connection
      const sql = postgres({
        host: config.DB_HOST,
        port: parseInt(config.DB_PORT || '5433'),
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_DATABASE
      });
      
      try {
        // Query your sampling sites
        // This assumes you have access to the raw data, not just the XML
        const rows = await sql`
          SELECT 
            wwkyid_pk, 
            stream_name, 
            wwkybasin,
            description,
            comments,
            created_date,
            CASE
              WHEN wkb_geometry IS NOT NULL THEN ST_Y(wkb_geometry)
              ELSE latitude
            END AS latitude,
            CASE
              WHEN wkb_geometry IS NOT NULL THEN ST_X(wkb_geometry)
              ELSE longitude
            END AS longitude
          FROM wwky_sites
          WHERE (wkb_geometry IS NOT NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)
        `;
        
        // Create GeoJSON structure
        const geojson = {
          type: "FeatureCollection",
          features: rows.map(row => ({
            type: "Feature",
            properties: {
              id: row.wwkyid_pk,
              name: row.stream_name || `Site ${row.wwkyid_pk}`,
              basin: row.wwkybasin || 'N/A',
              description: row.description || '',
              comments: row.comments || '',
              createdDate: row.created_date
            },
            geometry: {
              type: "Point",
              coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
            }
          }))
        };
        
        // Return the GeoJSON
        return geojson;
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