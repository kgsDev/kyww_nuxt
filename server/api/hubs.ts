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
    const mode = query.mode || 'all'; // Default to 'all' if no mode specified
    const basinFilter = query.basin || null;
    const countyFilter = query.county || null;
    
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
        case 'all':
          // Base query for all hubs - using quoted column names to preserve case
          let hubQuery = sql`
            SELECT 
              h."hub_id", 
              h."organization",
              h."Description",
              h."Basin",
              h."Full_Address",
              h."mailing_address",
              h."County",
              h."Contact_Person",
              h."Phone",
              h."Email",
              h."Availability",
              h."Sampling_kits",
              h."Kit_count",
              h."Incubator",
              h."Incubator_count",
              h."Biological_kit",
              h."Biokit_count",
              h."Events_and_meetings",
              h."Site_selection_assist",
              h."Data_entry_assistance",
              h."Interpret_findings",
              h."Coordinate_community",
              h."Host_outreach_materials",
              h."date_created",
              h."date_updated",
              CASE
                WHEN h."wkb_geometry" IS NOT NULL THEN ST_Y(h."wkb_geometry")
                ELSE h."latitude"
              END AS latitude,
              CASE
                WHEN h."wkb_geometry" IS NOT NULL THEN ST_X(h."wkb_geometry")
                ELSE h."longitude"
              END AS longitude
            FROM public.wwky_hubs h
            WHERE (h."wkb_geometry" IS NOT NULL) OR (h."latitude" IS NOT NULL AND h."longitude" IS NOT NULL)
          `;
          
          // Add filters if provided
          if (basinFilter) {
            hubQuery = sql`${hubQuery} AND h."Basin" = ${basinFilter}`;
          }
          
          if (countyFilter) {
            hubQuery = sql`${hubQuery} AND h."County" = ${countyFilter}`;
          }
          
          const hubRows = await hubQuery;
          
          result = {
            type: "FeatureCollection",
            features: hubRows.map(row => ({
              type: "Feature",
              properties: {
                id: row.hub_id,
                organization: row.organization || '',
                description: row.Description || '',
                basin: row.Basin || 'N/A',
                fullAddress: row.Full_Address || '',
                mailingAddress: row.mailing_address || '',
                county: row.County || '',
                contactPerson: row.Contact_Person || '',
                phone: row.Phone || '',
                email: row.Email || '',
                availability: row.Availability || '',
                // Services offered (text fields - "Yes" for true, "" for false)
                samplingKits: row.Sampling_kits ? "Yes" : "",
                kitCount: row.Kit_count || 0,
                incubator: row.Incubator ? "Yes" : "",
                incubatorCount: row.Incubator_count || 0,
                biokitCount: row.Biokit_count || 0, 
                biologicalKit: row.Biological_kit ? "Yes" : "",
                eventsAndMeetings: row.Events_and_meetings ? "Yes" : "",
                siteSelectionAssist: row.Site_selection_assist ? "Yes" : "",
                dataEntryAssistance: row.Data_entry_assistance ? "Yes" : "",
                interpretFindings: row.Interpret_findings ? "Yes" : "",
                coordinateCommunity: row.Coordinate_community ? "Yes" : "",
                hostOutreachMaterials: row.Host_outreach_materials ? "Yes" : "",
                dateCreated: row.date_created,
                dateUpdated: row.date_updated
              },
              geometry: {
                type: "Point",
                coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
              }
            }))
          };
          break;
          
        case 'basins':
          // Query to get unique basins with hub counts
          const basinRows = await sql`
            SELECT 
              "Basin" as basin,
              COUNT(*) as hub_count
            FROM 
              public.wwky_hubs
            WHERE 
              "Basin" IS NOT NULL AND "Basin" != ''
            GROUP BY 
              "Basin"
            ORDER BY 
              "Basin"
          `;
          
          result = basinRows.map(row => ({
            basin: row.basin,
            hubCount: Number(row.hub_count)
          }));
          break;
          
        case 'counties':
          // Query to get unique counties with hub counts
          const countyRows = await sql`
            SELECT 
              "County" as county,
              COUNT(*) as hub_count
            FROM 
              public.wwky_hubs
            WHERE 
              "County" IS NOT NULL AND "County" != ''
            GROUP BY 
              "County"
            ORDER BY 
              "County"
          `;
          
          result = countyRows.map(row => ({
            county: row.county,
            hubCount: Number(row.hub_count)
          }));
          break;
          
        case 'stats':
          // Query to get aggregate statistics about hubs
          const statsRows = await sql`
            SELECT
              COUNT(*) as total_hubs,
              COUNT(DISTINCT "Basin") as basin_count,
              COUNT(DISTINCT "County") as county_count,
              SUM(CASE WHEN "Sampling_kits" = true THEN 1 ELSE 0 END) as sampling_kits_count,
              SUM(CASE WHEN "Incubator" = true THEN 1 ELSE 0 END) as incubator_count,
              SUM(CASE WHEN "Biological_kit" = true THEN 1 ELSE 0 END) as biological_kit_count,
              SUM(CASE WHEN "Events_and_meetings" = true THEN 1 ELSE 0 END) as events_count,
              SUM(CASE WHEN "Site_selection_assist" = true THEN 1 ELSE 0 END) as site_selection_count,
              SUM(CASE WHEN "Data_entry_assistance" = true THEN 1 ELSE 0 END) as data_entry_count,
              SUM(CASE WHEN "Interpret_findings" = true THEN 1 ELSE 0 END) as interpret_findings_count,
              SUM(CASE WHEN "Coordinate_community" = true THEN 1 ELSE 0 END) as coordinate_community_count,
              SUM(CASE WHEN "Host_outreach_materials" = true THEN 1 ELSE 0 END) as outreach_materials_count
            FROM 
              public.wwky_hubs
          `;
          
          // There should only be one row in the result
          const statsRow = statsRows[0];
          
          result = {
            totalHubs: Number(statsRow.total_hubs),
            basinCount: Number(statsRow.basin_count),
            countyCount: Number(statsRow.county_count),
            // Keeping these as numbers for statistics
            samplingKitsCount: Number(statsRow.sampling_kits_count),
            incubatorCount: Number(statsRow.incubator_count),
            biologicalKitCount: Number(statsRow.biological_kit_count),
            eventsAndMeetingsCount: Number(statsRow.events_count),
            siteSelectionAssistCount: Number(statsRow.site_selection_count),
            dataEntryAssistanceCount: Number(statsRow.data_entry_count),
            interpretFindingsCount: Number(statsRow.interpret_findings_count),
            coordinateCommunityCount: Number(statsRow.coordinate_community_count),
            hostOutreachMaterialsCount: Number(statsRow.outreach_materials_count)
          };
          break;
          
        default:
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid mode: ${mode}. Valid modes are 'all', 'basins', 'counties', or 'stats'.`
          });
      }
      
      // Return the result
      return result;
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve hubs data: ' + dbError.message
      });
    } finally {
      // Close the connection
      await sql.end();
    }
  } catch (error) {
    console.error('General error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve hubs data: ' + error.message
    });
  }
});