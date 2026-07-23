// server/api/recognition.ts
// Recognition leaderboards: top counties (GIS), basins, hubs, sites. Optional ?year=YYYY.
// County is resolved by point-in-polygon against the same ky_counties.geojson the map uses.

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const yearRaw = query.year ? String(query.year) : '';
  const yearNum = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const topN = query.limit ? Math.min(parseInt(String(query.limit)) || 5, 25) : 5;
  const topSitesN = 10;

  const cacheKey = `${yearNum ?? 'all'}:${topN}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const config = useRuntimeConfig();
  const { default: postgres } = await import('postgres');
  const sql = postgres(getDbConfig());
  
  const dbInfo = await sql`SELECT current_database() AS db, inet_server_port() AS port`;
  console.log('[recognition] runtimeConfig →', config.DB_HOST, config.DB_PORT, config.DB_DATABASE);
  console.log('[recognition] connected to →', dbInfo[0]);

  try {
    const fromDate = yearNum ? `${yearNum}-01-01` : null;
    const toDate = yearNum ? `${yearNum + 1}-01-01` : null;
    // Half-open range = sargable. Empty fragment when no year → all time.
    const yearFilter = yearNum ? sql`AND a.d >= ${fromDate} AND a.d < ${toDate}` : sql``;

    // Per-site totals across all three sample types, with basin + coordinates.
    const siteRows = await sql`
      WITH all_samples AS (
        SELECT wwky_id, "date"::date AS d, volunteer_id FROM public.base_samples        WHERE wwky_id IS NOT NULL
        UNION ALL
        SELECT wwky_id, "date"::date,      volunteer_id FROM public.biological_samples  WHERE wwky_id IS NOT NULL
        UNION ALL
        SELECT wwky_id, "date"::date,      volunteer_id FROM public.habitat_samples     WHERE wwky_id IS NOT NULL
      )
      SELECT
        a.wwky_id AS site_id,
        COUNT(*)::int AS sample_count,
        s.stream_name, s.description, s.wwkybasin, s.county,
        CASE WHEN s.wkb_geometry IS NOT NULL THEN ST_X(s.wkb_geometry) ELSE s.longitude END AS lon,
        CASE WHEN s.wkb_geometry IS NOT NULL THEN ST_Y(s.wkb_geometry) ELSE s.latitude  END AS lat
      FROM all_samples a
      JOIN public.wwky_sites s ON s.wwkyid_pk = a.wwky_id
      WHERE TRUE ${yearFilter}
      GROUP BY a.wwky_id, s.stream_name, s.description, s.wwkybasin, s.county,
               s.wkb_geometry, s.longitude, s.latitude
    `;

    // Hub totals via the sampler's assigned hub.
    const hubRows = await sql`
      WITH all_samples AS (
        SELECT wwky_id, "date"::date AS d, volunteer_id FROM public.base_samples        WHERE wwky_id IS NOT NULL
        UNION ALL
        SELECT wwky_id, "date"::date,      volunteer_id FROM public.biological_samples  WHERE wwky_id IS NOT NULL
        UNION ALL
        SELECT wwky_id, "date"::date,      volunteer_id FROM public.habitat_samples     WHERE wwky_id IS NOT NULL
      )
      SELECT h.hub_id, h."Description" AS hub_name,
             COUNT(*)::int AS sample_count,
             COUNT(DISTINCT a.volunteer_id)::int AS sampler_count,
             CASE WHEN h."wkb_geometry" IS NOT NULL THEN ST_X(h."wkb_geometry") ELSE h."longitude" END AS lon,
             CASE WHEN h."wkb_geometry" IS NOT NULL THEN ST_Y(h."wkb_geometry") ELSE h."latitude"  END AS lat
      FROM all_samples a
      JOIN public.sampler_data sd ON sd.user_id = a.volunteer_id
      JOIN public.wwky_hubs   h  ON h.hub_id   = sd.hub_id
      WHERE TRUE ${yearFilter}
      GROUP BY h.hub_id, h."Description", h."wkb_geometry", h."longitude", h."latitude"
      ORDER BY sample_count DESC
      LIMIT ${topN}
    `;

    // ---- Node rollups: basins + GIS counties ----
    const basinMap = new Map<string, { sampleCount: number; siteCount: number }>();
    const countyMap = new Map<string, { sampleCount: number; siteCount: number }>();

    for (const r of siteRows as any[]) {
      const count = Number(r.sample_count) || 0;

      const basin = (r.wwkybasin || '').trim() || 'Unassigned';
      const b = basinMap.get(basin) || { sampleCount: 0, siteCount: 0 };
      b.sampleCount += count; b.siteCount += 1; basinMap.set(basin, b);

      const county = (r.county || '').trim();
      if (county) {
        const c = countyMap.get(county) || { sampleCount: 0, siteCount: 0 };
        c.sampleCount += count; c.siteCount += 1; countyMap.set(county, c);
      }
    }

    const topBasins = [...basinMap.entries()]
      .map(([basin, v]) => ({ basin, ...v }))
      .sort((a, b) => b.sampleCount - a.sampleCount).slice(0, topN);

    let topCounties = [...countyMap.entries()]
      .map(([county, v]) => ({ county, ...v, lng: null as number | null, lat: null as number | null }))
      .sort((a, b) => b.sampleCount - a.sampleCount).slice(0, topN);

    // attach zoom coordinates for just the winners
    if (topCounties.length) {
      const names = topCounties.map((c) => c.county);
      const centroids = await sql`
        SELECT name, centroid_lng, centroid_lat
        FROM public.ky_counties WHERE name IN ${sql(names)}
      `;
      const byName = new Map((centroids as any[]).map((r) => [r.name, r]));
      topCounties = topCounties.map((c) => {
        const m = byName.get(c.county);
        return { ...c, lng: m?.centroid_lng ?? null, lat: m?.centroid_lat ?? null };
      });
    }

    const topSites = (siteRows as any[])
      .map((r) => ({
        siteId: r.site_id,
        siteName: r.stream_name || r.description || `Site ${r.site_id}`,
        basin: (r.wwkybasin || '').trim() || 'Unassigned',
        sampleCount: Number(r.sample_count) || 0,
        lng: r.lon != null ? Number(r.lon) : null,
        lat: r.lat != null ? Number(r.lat) : null,
      }))
      .sort((a, b) => b.sampleCount - a.sampleCount).slice(0, topSitesN);

    const topHubs = (hubRows as any[]).map((r) => ({
      hubId: r.hub_id,
      hubName: r.hub_name || `Hub ${r.hub_id}`,
      sampleCount: Number(r.sample_count) || 0,
      samplerCount: Number(r.sampler_count) || 0,
      lng: r.lon != null ? Number(r.lon) : null,
      lat: r.lat != null ? Number(r.lat) : null,
    }));

    const data = { year: yearNum ?? 'all', generatedAt: new Date().toISOString(), topCounties, topBasins, topHubs, topSites };
    cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err: any) {
    console.error('recognition endpoint error:', err);
    throw createError({ statusCode: 500, statusMessage: 'Failed to build recognition data: ' + err.message });
  } finally {
    await sql.end();
  }
});