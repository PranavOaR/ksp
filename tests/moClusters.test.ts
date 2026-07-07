import { describe, expect, test } from 'vitest';
import { clusterByMO, findMOCluster } from '@/lib/intel/moClusters';

describe('clusterByMO (C4)', () => {
  const firs = [
    { id: 1, modus_operandi: 'Night-time break-in via rear entry' },
    { id: 2, modus_operandi: 'Night-time break-in via rear entry' },
    { id: 3, modus_operandi: 'Night-time break-in via rear entry' },
    { id: 4, modus_operandi: 'Two-wheeler drive-by snatching' },
    { id: 5, modus_operandi: 'Two-wheeler drive-by snatching' },
    { id: 6, modus_operandi: 'Unique one-off MO' },
  ];

  test('groups FIRs with the same MO into one cluster', () => {
    const clusters = clusterByMO(firs);
    const breakIn = clusters.find((c) => c.mo === 'Night-time break-in via rear entry');
    expect(breakIn).toBeDefined();
    expect(breakIn!.firIds).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(breakIn!.count).toBe(3);
  });

  test('single-case MOs are excluded from results', () => {
    const clusters = clusterByMO(firs);
    const unique = clusters.find((c) => c.mo === 'Unique one-off MO');
    expect(unique).toBeUndefined();
  });

  test('returns clusters sorted by count descending', () => {
    const clusters = clusterByMO(firs);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters[0].count).toBeGreaterThanOrEqual(clusters[1].count);
  });

  test('returns empty array when there are no repeat MOs', () => {
    const unique = [
      { id: 1, modus_operandi: 'MO Alpha' },
      { id: 2, modus_operandi: 'MO Beta' },
    ];
    expect(clusterByMO(unique)).toHaveLength(0);
  });

  test('returns empty array for empty input', () => {
    expect(clusterByMO([])).toHaveLength(0);
  });
});

describe('findMOCluster (C4)', () => {
  test('returns the cluster for a FIR that belongs to a serial MO', () => {
    const firs = [
      { id: 10, modus_operandi: 'Phishing link via SMS' },
      { id: 11, modus_operandi: 'Phishing link via SMS' },
    ];
    const clusters = clusterByMO(firs);
    const result = findMOCluster(10, clusters);
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
    expect(result!.mo).toBe('Phishing link via SMS');
  });

  test('returns null for a FIR with a unique MO (not in any cluster)', () => {
    const firs = [
      { id: 10, modus_operandi: 'Serial MO' },
      { id: 11, modus_operandi: 'Serial MO' },
      { id: 12, modus_operandi: 'Unique MO' },
    ];
    const clusters = clusterByMO(firs);
    expect(findMOCluster(12, clusters)).toBeNull();
  });

  test('returns null when clusters array is empty', () => {
    expect(findMOCluster(1, [])).toBeNull();
  });
});
