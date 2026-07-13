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
  { min: 24, label: 'Super Sampler',     icon: 'mdi:trophy', color: 'amber'  },
  { min: 12, label: 'Dedicated Sampler', icon: 'mdi:medal',  color: 'orange' },
  { min: 6,  label: 'Making Waves',      icon: 'mdi:waves',  color: 'sky'    },
  { min: 3,  label: 'Great Start',       icon: 'mdi:sprout', color: 'green'  },
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

  const currentYear = new Date().getFullYear();
  // The season is "done" once we're past September of the current year.
  const seasonComplete = computed(() => new Date().getMonth() + 1 > 9);

  async function load(userId: string) {
    if (!userId) return;
    loading.value = true;
    error.value = null;

    try {
      const [trainingStatus, me, stream, bio, hab] = await Promise.all([
        // unexpired training booleans (same endpoint RBAC uses)
        $fetch<Record<string, boolean>>('/api/my-training-status', { query: { userId } }),
        // the logged-in user's policies → role badges
        useDirectus(readMe({ fields: ['policies.policy'] })),
        // this user's samples across all three types (id + date only)
        useDirectus(readItems('base_samples', {
          filter: { volunteer_id: { _eq: userId } }, fields: ['wwky_id', 'date'], limit: -1,
        })),
        useDirectus(readItems('biological_samples', {
          filter: { volunteer_id: { _eq: userId } }, fields: ['wwky_id', 'date'], limit: -1,
        })),
        useDirectus(readItems('habitat_samples', {
          filter: { volunteer_id: { _eq: userId } }, fields: ['wwky_id', 'date'], limit: -1,
        })),
      ]);

      training.value = trainingStatus || {};
      policyIds.value = ((me as any)?.policies || []).map((p: any) => p.policy).filter(Boolean);

      // Combine all sample types.
      const all = [...(stream || []), ...(bio || []), ...(hab || [])];
      totalSamples.value = all.length;

      const counts = new Map<number | string, number>();
      const months = new Set<number>();
      for (const s of all as any[]) {
        if (s.wwky_id !== null && s.wwky_id !== undefined) {
          counts.set(s.wwky_id, (counts.get(s.wwky_id) || 0) + 1);
        }
        if (s.date) {
          const d = new Date(s.date);
          if (d.getFullYear() === currentYear) months.add(d.getMonth() + 1);
        }
      }
      perSite.value = counts;
      coreMonthsHit.value = months;

      // Names only for the handful of sites this user has touched.
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

  return { loading, error, load, trainingBadges, roleBadges, seasonal, superSampler, totalSamples };
}