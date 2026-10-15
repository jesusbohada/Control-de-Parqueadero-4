import { BranchLocation } from '../types';

/**
 * Generates a unique 9-digit FarmaDesk ID formatted as "XXX XXX XXX"
 * Can be deterministic based on seed (branchId/code) or randomized.
 * Format compatible with FarmaDesk Rust client identity.
 */
export function generateFarmadeskId(seed?: string): string {
  let num1: number;
  let num2: number;
  let num3: number;

  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    num1 = 100 + (positiveHash % 899);
    num2 = 100 + (Math.floor(positiveHash / 899) % 899);
    num3 = 100 + (Math.floor(positiveHash / (899 * 899)) % 899);
  } else {
    num1 = Math.floor(100 + Math.random() * 899);
    num2 = Math.floor(100 + Math.random() * 899);
    num3 = Math.floor(100 + Math.random() * 899);
  }

  return `${num1} ${num2} ${num3}`;
}

/**
 * Generates a secure unique password for a branch in FarmaDesk Pro
 */
export function generateFarmadeskPassword(branchCodeOrName?: string): string {
  const cleanPrefix = (branchCodeOrName || 'sede')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const randomNum = Math.floor(100 + Math.random() * 899);
  return `farma_${cleanPrefix || 'desk'}_${randomSuffix}${randomNum}`;
}

/**
 * Ensures that all branches have UNIQUE and NON-EMPTY FarmaDesk ID and Password.
 * If any duplicate or missing credentials are found, assigns a fresh unique one.
 */
export function ensureUniqueBranchFarmadeskCredentials(branches: BranchLocation[]): BranchLocation[] {
  const seenIds = new Set<string>();
  const seenPasswords = new Set<string>();

  return branches.map((branch, index) => {
    let currentId = (branch.farmadeskId || branch.anydeskId || '').trim();
    let currentPassword = (branch.farmadeskPassword || branch.vncPassword || '').trim();

    // Check if ID is empty, default placeholder, or already seen
    if (!currentId || (currentId === '891 042 150' && index > 0) || seenIds.has(currentId)) {
      let candidateId = generateFarmadeskId(`${branch.id || branch.code || index}-${index}`);
      while (seenIds.has(candidateId)) {
        candidateId = generateFarmadeskId();
      }
      currentId = candidateId;
    }
    seenIds.add(currentId);

    // Check if Password is empty, default placeholder, or already seen
    if (
      !currentPassword ||
      (currentPassword === 'FARMA_PASS_SECURE' && index > 0) ||
      seenPasswords.has(currentPassword)
    ) {
      let candidatePassword = generateFarmadeskPassword(branch.code || branch.name || `suc${index + 1}`);
      while (seenPasswords.has(candidatePassword)) {
        candidatePassword = generateFarmadeskPassword(`suc${Date.now()}`);
      }
      currentPassword = candidatePassword;
    }
    seenPasswords.add(currentPassword);

    return {
      ...branch,
      farmadeskId: currentId,
      farmadeskPassword: currentPassword,
      anydeskId: currentId,
      vncPassword: currentPassword
    };
  });
}
