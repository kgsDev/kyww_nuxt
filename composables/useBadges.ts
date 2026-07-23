// composables/useBadges.ts
// Recognition badges for a KYWW sampler.
import { readMe, readItems } from '@directus/sdk';

export interface Badge {
  id: string; label: string; icon: string; color: string; earned: boolean;
}

// KYWW's core sampling months (May, July, September)
const CORE_MONTHS = [5, 7, 9];

// Per-site sample-count tiers, highest first. Rename the middle labels to taste.
const SUPER_TIERS = [
  { min: 12, label: 'Super Sampler',     icon: 'mdi:trophy', color: 'amber'  },
  { min: 9, label: 'Dedicated Sampler', icon: 'mdi:medal',  color: 'orange' },
  { min: 6,  label: 'Making Waves',      icon: 'mdi:waves',  color: 'sky'    },
  { min: 3,  label: 'Great Start',       icon: 'mdi:sprout', color: 'green'  },
];

// Distinct sites sampled — breadth, the counterpart to SUPER_TIERS' depth.
const EXPLORER_TIERS = [
  { min: 7, label: 'Watershed Warrior', icon: 'mdi:compass-rose',        color: 'violet' },
  { min: 5, label: 'Creek Explorer',     icon: 'mdi:map-search-outline',  color: 'indigo' },
  { min: 3,  label: 'Stream Roamer',      icon: 'mdi:map-marker-multiple', color: 'teal'   },
  { min: 2,  label: 'Branching Out',      icon: 'mdi:source-branch',       color: 'cyan'   },
];

export function useBadges() {
  const config = useRuntimeConfig().public;

  const loading = ref(true);
  const error = ref<string | null>(null);

  const training = ref<Record<string, boolean>>({});
  const policyIds = ref<string[]>([]);
  const perSite = ref<Map<number | string, number>>(new Map());
  const siteNames = ref<Record<string | number, string>>({});
  const coreMonthsHit = ref<Set<number>>(new Set());
  const totalSamples = ref(0);
  const distinctSiteCount = ref(0);
  const sampledTypes = ref<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();
  // The season is "done" once we're past September of the current year.
  const seasonComplete = computed(() => new Date().getMonth() + 1 > 9);

async function fetchUserSamples(userId: string) {
    const TYPES = [
      { coll: 'base_samples',       join: 'base_samples_directus_users',       fk: 'base_samples_id',       key: 'chemistry'  },
      { coll: 'biological_samples', join: 'biological_samples_directus_users', fk: 'biological_samples_id', key: 'biological' },
      { coll: 'habitat_samples',    join: 'habitat_samples_directus_users',    fk: 'habitat_samples_id',    key: 'habitat'    },
    ];

    const results = await Promise.all(TYPES.flatMap((t) => [
      useDirectus(readItems(t.coll, {
        filter: { volunteer_id: { _eq: userId } },
        fields: ['id', 'wwky_id', 'date'], limit: -1,
      })),
      useDirectus(readItems(t.join, {
        filter: { directus_users_id: { _eq: userId } },
        fields: [`${t.fk}.id`, `${t.fk}.wwky_id`, `${t.fk}.date`], limit: -1,
      })),
    ]));

    const lead: { wwky_id: any; date: any }[] = [];
    const all: { wwky_id: any; date: any }[] = [];
    const typesSampled = new Set<string>();
    const seenAll = new Set<string>();

    results.forEach((rows, idx) => {
      const type = TYPES[Math.floor(idx / 2)];
      const isJoin = idx % 2 === 1;
      for (const r of (rows as any[])) {
        const s = isJoin ? r[type.fk] : r;
        if (!s || s.id == null) continue;
        typesSampled.add(type.key);                 // any participation in this discipline counts
        const rec = { wwky_id: s.wwky_id, date: s.date };
        if (!isJoin) lead.push(rec);
        const key = `${type.coll}:${s.id}`;
        if (!seenAll.has(key)) { seenAll.add(key); all.push(rec); }
      }
    });
    return { lead, all, typesSampled };
  }

  async function load(userId: string) {
      if (!userId) return;
      loading.value = true;
      error.value = null;

      try {
        const [trainingStatus, me, samples] = await Promise.all([
          // unexpired training booleans (same endpoint RBAC uses)
          $fetch<Record<string, boolean>>('/api/my-training-status', { query: { userId } }),
          // the logged-in user's policies → role badges
          useDirectus(readMe({ fields: ['policies.policy'] })),
          // lead samples + participation samples across all three types
          fetchUserSamples(userId),
        ]);

        training.value = trainingStatus || {};
        policyIds.value = ((me as any)?.policies || []).map((p: any) => p.policy).filter(Boolean);

        const { lead, all, typesSampled } = samples;
        sampledTypes.value = typesSampled;

        // Super Sampler (depth at one site) — LEAD samples only
        const counts = new Map<number | string, number>();
        for (const s of lead as any[]) {
          if (s.wwky_id !== null && s.wwky_id !== undefined) {
            counts.set(s.wwky_id, (counts.get(s.wwky_id) || 0) + 1);
          }
        }
        perSite.value = counts;

        // Site Explorer (breadth) + Seasonal — ANY participation
        const distinct = new Set<number | string>();
        const months = new Set<number>();
        for (const s of all as any[]) {
          if (s.wwky_id !== null && s.wwky_id !== undefined) distinct.add(s.wwky_id);
          if (s.date) {
            const d = new Date(s.date);
            if (d.getFullYear() === currentYear) months.add(d.getMonth() + 1);
          }
        }
        distinctSiteCount.value = distinct.size;
        coreMonthsHit.value = months;
        totalSamples.value = all.length;

        // Names only for the LEAD sites (used by the Super Sampler label).
        const siteIds = [...counts.keys()].filter((id) => id != null);
        if (siteIds.length) {
          const sites = await useDirectus(readItems('wwky_sites', {
            filter: { wwkyid_pk: { _in: siteIds } },
            fields: ['wwkyid_pk', 'stream_name', 'description'], limit: -1,
          }));
          const map: Record<string | number, string> = {};
          for (const site of sites as any[]) {
            map[site.wwkyid_pk] = site.stream_name || site.description || `Site ${site.wwkyid_pk}`;
          }
          siteNames.value = map;
        }
      } catch (err: any) {
        console.error('Error loading badges:', err);
        error.value = 'Unable to load recognition badges.';
      } finally {
        loading.value = false;
      }
    }
  const trainingBadges = computed<Badge[]>(() => {
    const t = training.value || {};
    return [
      { id: 'fieldChemistry', label: 'Field Chemistry', icon: 'mdi:eyedropper',       color: 'blue',  earned: !!t.fieldChemistry },
      { id: 'rCard',          label: 'R-Card / E. coli', icon: 'mdi:bacteria-outline', color: 'red',   earned: !!t.rCard },
      { id: 'biological',     label: 'Biological',       icon: 'mdi:fish',             color: 'green', earned: !!t.biological },
      { id: 'habitat',        label: 'Habitat',          icon: 'mdi:leaf',             color: 'lime',  earned: !!t.habitat },
    ];
  });

  // Only show role badges the user actually holds.
  const roleBadges = computed<Badge[]>(() => {
    const has = (id?: string) => !!id && policyIds.value.includes(id);
    return [
      { id: 'trainer', label: 'Trainer',      icon: 'i-heroicons-academic-cap',     color: 'purple',  earned: has(config.TRAINER_POLICY_ID) },
      { id: 'hub',     label: 'Hub Manager',  icon: 'material-symbols:hub-outline', color: 'emerald', earned: has(config.HUB_POLICY_ID) },
      { id: 'leader',  label: 'Basin Leader', icon: 'i-heroicons-user-group',       color: 'amber',   earned: has(config.LEADER_POLICY_ID) },
    ].filter((b) => b.earned);
  });

  const seasonal = computed(() => {
    const hit = CORE_MONTHS.filter((m) => coreMonthsHit.value.has(m));
    const complete = hit.length === CORE_MONTHS.length;
    return {
      earned: complete,
      hitCount: hit.length,
      target: CORE_MONTHS.length,
      hitMonths: hit,
      seasonComplete: seasonComplete.value,
      label: complete ? 'Seasonal Champion' : 'Seasonal Progress',
      icon: complete ? 'mdi:calendar-star' : 'mdi:calendar-clock',
      color: complete ? 'amber' : 'sky',
    };
  });

  const superSampler = computed(() => {
    let maxCount = 0;
    let bestSite: number | string | null = null;
    for (const [siteId, count] of perSite.value.entries()) {
      if (count > maxCount) { maxCount = count; bestSite = siteId; }
    }
    const tier = SUPER_TIERS.find((t) => maxCount >= t.min) || null;
    const nextTier = [...SUPER_TIERS].reverse().find((t) => t.min > maxCount) || null;
    return {
      earned: !!tier, tier, nextTier, count: maxCount,
      siteId: bestSite,
      siteName: bestSite != null ? (siteNames.value[bestSite] || `Site ${bestSite}`) : null,
    };
  });

  const siteExplorer = computed(() => {
    const distinct = distinctSiteCount.value;
    const tier = EXPLORER_TIERS.find((t) => distinct >= t.min) || null;
    const nextTier = [...EXPLORER_TIERS].reverse().find((t) => t.min > distinct) || null;
    return { earned: !!tier, tier, nextTier, distinct };
  });

  const completeSampler = computed(() => {
    const disciplines = [
      { key: 'chemistry',  label: 'Chemistry',  done: sampledTypes.value.has('chemistry')  },
      { key: 'biological', label: 'Biological', done: sampledTypes.value.has('biological') },
      { key: 'habitat',    label: 'Habitat',    done: sampledTypes.value.has('habitat')    },
    ];
    const count = disciplines.filter((d) => d.done).length;
    return {
      count,
      total: 3,
      earned: count === 3,
      label: ['', 'Sampler', 'Multi-Discipline Sampler', 'Complete Sampler'][count] || null,
      disciplines,
    };
  });

    return {
      loading, error, load,
      trainingBadges, roleBadges, completeSampler,
      seasonal, superSampler, siteExplorer, totalSamples,
    };
}