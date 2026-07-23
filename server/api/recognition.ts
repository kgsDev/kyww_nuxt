// server/api/recognition.ts
// Recognition leaderboards: top counties (GIS), basins, hubs, sites. Optional ?year=YYYY.
// County is resolved by point-in-polygon against the same ky_counties.geojson the map uses.

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

// ---- point-in-polygon (ray casting), supports Polygon + MultiPolygon + holes ----
function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function pointInPolygon(x: number, y: number, poly: number[][][]): boolean {
  if (!poly.length || !pointInRing(x, y, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (pointInRing(x, y, poly[k])) return false; // hole
  return true;
}
function pointInFeature(x: number, y: number, geom: any): boolean {
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(x, y, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((p: number[][][]) => pointInPolygon(x, y, p));
  return false;
}

// Parsed county polygons + bounding boxes, cached in module scope (loaded once).
let countyIndex: { name: string; bbox: [number, number, number, number]; geom: any }[] | null = null;

async function loadCountyGeoJSON(): Promise<any | null> {
  // 1) Nitro server asset (works if server/assets/ky_counties.geojson was present at build time)
  try {
    const raw = await useStorage('assets:server').getItem('ky_counties.geojson');
    if (raw) {
      console.log('[recognition] counties loaded from server assets');
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } catch (e) {
    console.warn('[recognition] server asset read failed:', (e as Error).message);
  }

  // 2) Filesystem fallback — the same file the map serves from /data/
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const candidates = [
    resolve(process.cwd(), 'public/data/ky_counties.geojson'),        // dev
    resolve(process.cwd(), '.output/public/data/ky_counties.geojson'), // built output
    resolve(process.cwd(), '../public/data/ky_counties.geojson'),      // running from .output/server
    '/app/.output/public/data/ky_counties.geojson',                    // common Docker layout
  ];
  for (const path of candidates) {
    try {
      const txt = await readFile(path, 'utf-8');
      console.log('[recognition] counties loaded from', path);
      return JSON.parse(txt);
    } catch { /* try next */ }
  }

  console.error('[recognition] ky_counties.geojson NOT FOUND. cwd:', process.cwd(), 'tried:', candidates);
  return null;
}

async function getCounties() {
  if (countyIndex) return countyIndex;

  const gj = await loadCountyGeoJSON();
  if (!gj) return [];   // NOTE: no negative caching — retry next request instead of failing forever

  const parsed = (gj.features || []).map((f: any) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const scan = (c: any) => {
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1];
      } else c.forEach(scan);
    };
    scan(f.geometry?.coordinates ?? []);
    return {
      name: f.properties?.Name ?? f.properties?.NAME ?? 'Unknown',
      bbox: [minX, minY, maxX, maxY] as [number, number, number, number],
      geom: f.geometry,
    };
  });

  console.log(`[recognition] parsed ${parsed.length} county polygons`);
  if (parsed.length) countyIndex = parsed;   // only cache a successful load
  return parsed;
}

function countyForPoint(lon: number, lat: number, counties: any[]): string | null {
  for (const c of counties) {
    const [minX, minY, maxX, maxY] = c.bbox;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue; // bbox prefilter
    if (pointInFeature(lon, lat, c.geom)) return c.name;
  }
  return null;
}

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
  const sql = postgres({
    host: config.DB_HOST,
    port: parseInt(config.DB_PORT || '5433'),
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
  });

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
        s.stream_name, s.description, s.wwkybasin,
        CASE WHEN s.wkb_geometry IS NOT NULL THEN ST_X(s.wkb_geometry) ELSE s.longitude END AS lon,
        CASE WHEN s.wkb_geometry IS NOT NULL THEN ST_Y(s.wkb_geometry) ELSE s.latitude  END AS lat
      FROM all_samples a
      JOIN public.wwky_sites s ON s.wwkyid_pk = a.wwky_id
      WHERE TRUE ${yearFilter}
      GROUP BY a.wwky_id, s.stream_name, s.description, s.wwkybasin, s.wkb_geometry, s.longitude, s.latitude
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
    const counties = await getCounties();
    const countyBBox = new Map<string, [number, number, number, number]>();
    for (const c of counties) countyBBox.set(c.name, c.bbox);
    const basinMap = new Map<string, { sampleCount: number; siteCount: number }>();
    const countyMap = new Map<string, { sampleCount: number; siteCount: number }>();

    for (const r of siteRows as any[]) {
      const count = Number(r.sample_count) || 0;

      const basin = (r.wwkybasin || '').trim() || 'Unassigned';
      const b = basinMap.get(basin) || { sampleCount: 0, siteCount: 0 };
      b.sampleCount += count; b.siteCount += 1; basinMap.set(basin, b);

      const lon = r.lon != null ? Number(r.lon) : null;
      const lat = r.lat != null ? Number(r.lat) : null;
      if (lon != null && lat != null && counties.length) {
        const county = countyForPoint(lon, lat, counties) || 'Unknown';
        const c = countyMap.get(county) || { sampleCount: 0, siteCount: 0 };
        c.sampleCount += count; c.siteCount += 1; countyMap.set(county, c);
      }
    }

    const topBasins = [...basinMap.entries()]
      .map(([basin, v]) => ({ basin, ...v }))
      .sort((a, b) => b.sampleCount - a.sampleCount).slice(0, topN);

    const topCounties = [...countyMap.entries()]
      .filter(([name]) => name !== 'Unknown')
      .map(([county, v]) => {
        const bb = countyBBox.get(county);
        return {
          county, ...v,
          lng: bb ? (bb[0] + bb[2]) / 2 : null,   // bbox center = good-enough county focus
          lat: bb ? (bb[1] + bb[3]) / 2 : null,
        };
      })
      .sort((a, b) => b.sampleCount - a.sampleCount).slice(0, topN);

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