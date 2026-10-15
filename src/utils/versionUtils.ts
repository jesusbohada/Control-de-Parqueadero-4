/**
 * Utilitario para el incremento automático de versiones SemVer de software
 * - Cambios en archivos existentes: incrementa PATCH (v2.5.0 -> v2.5.1 -> v2.5.2)
 * - Nuevos archivos o módulos: incrementa MINOR (v2.5.0 -> v2.6.0 -> v2.7.0)
 */

export interface VersionIncrementResult {
  currentVersion: string;      // e.g. "v2.5.0-enterprise"
  nextPatchVersion: string;    // e.g. "v2.5.1-enterprise"
  nextMinorVersion: string;    // e.g. "v2.6.0-enterprise"
  currentBuildNumber: number;  // e.g. 250
  nextPatchBuildNumber: number;// e.g. 251
  nextMinorBuildNumber: number;// e.g. 260
}

export function parseAndIncrementVersion(baseVersion: string = 'v2.5.0-enterprise', baseBuild: number = 250): VersionIncrementResult {
  const clean = (baseVersion || 'v2.5.0-enterprise').trim();
  const match = clean.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/i);

  if (!match) {
    return {
      currentVersion: clean,
      nextPatchVersion: 'v2.5.1-enterprise',
      nextMinorVersion: 'v2.6.0-enterprise',
      currentBuildNumber: baseBuild || 250,
      nextPatchBuildNumber: (baseBuild || 250) + 1,
      nextMinorBuildNumber: (baseBuild || 250) + 10
    };
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);
  const suffix = match[4] || '-enterprise';

  const nextPatchTag = `v${major}.${minor}.${patch + 1}${suffix}`;
  const nextMinorTag = `v${major}.${minor + 1}.0${suffix}`;

  const currentBuild = baseBuild || (major * 100 + minor * 10 + patch);

  return {
    currentVersion: clean,
    nextPatchVersion: nextPatchTag,
    nextMinorVersion: nextMinorTag,
    currentBuildNumber: currentBuild,
    nextPatchBuildNumber: currentBuild + 1,
    nextMinorBuildNumber: Math.max(currentBuild + 10, (major * 100 + (minor + 1) * 10))
  };
}
