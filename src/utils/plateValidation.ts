// Reglas oficiales de validación de formato de placas vehiculares nacionales e internacionales

export interface PlateCountryRule {
  id: string;
  name: string;
  flag: string;
  example: string;
  description: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
  regex: RegExp;
}

export const NATIONAL_PLATE_RULE: PlateCountryRule = {
  id: 'COL',
  name: 'Colombia (Nacional)',
  flag: '🇨🇴',
  example: 'ABC123 o ABC12D',
  description: 'Carros: 3 letras + 3 números (ej. ABC123). Motos: 3 letras + 2 números + 1 letra (ej. ABC12D) o clásicas (AB1234 / AB123). Oficiales: CD1234 / OF1234. Remolques: R12345.',
  placeholder: 'ABC123',
  minLength: 5,
  maxLength: 6,
  // Formato oficial y legal de Colombia (Ministerio de Transporte / RUNT):
  // - Carros particulares y servicio público: 3 letras + 3 números (ej: ABC123)
  // - Motocicletas modernas: 3 letras + 2 números + 1 letra (ej: ABC12D)
  // - Motocicletas tradicionales / clásicas: 2 letras + 4 números (AB1234), 2 letras + 3 números (AB123), 3 letras + 2 números (ABC12)
  // - Vehículos diplomáticos / consulares / oficiales: CD1234, CC1234, MI1234, OI1234, OF1234
  // - Remolques / semirremolques: R12345, S12345
  regex: /^(?:[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{2}[A-Z]|[A-Z]{2}[0-9]{4}|[A-Z]{2}[0-9]{3}|[A-Z]{3}[0-9]{2}|(?:CD|CC|MI|OI|OF)[0-9]{4}|[RS][0-9]{5})$/,
};

export const FOREIGN_COUNTRY_OPTIONS = [
  { value: '', label: '-- Seleccionar país de procedencia (Obligatorio) --' },
  { value: 'Venezuela 🇻🇪', label: 'Venezuela 🇻🇪' },
  { value: 'Ecuador 🇪🇨', label: 'Ecuador 🇪🇨' },
  { value: 'Panamá 🇵🇦', label: 'Panamá 🇵🇦' },
  { value: 'Estados Unidos 🇺🇸', label: 'Estados Unidos 🇺🇸' },
  { value: 'Perú 🇵🇪', label: 'Perú 🇵🇪' },
  { value: 'Brasil 🇧🇷', label: 'Brasil 🇧🇷' },
  { value: 'Chile 🇨🇱', label: 'Chile 🇨🇱' },
  { value: 'Argentina 🇦🇷', label: 'Argentina 🇦🇷' },
  { value: 'México 🇲🇽', label: 'México 🇲🇽' },
  { value: 'España 🇪🇸', label: 'España 🇪🇸' },
  { value: 'Otro país', label: 'Otro país / Internacional' },
];

export const FOREIGN_COUNTRY_RULES: Record<string, PlateCountryRule> = {
  'Venezuela 🇻🇪': {
    id: 'VEN',
    name: 'Venezuela',
    flag: '🇻🇪',
    example: 'AB123CD',
    description: '2 letras + 3 números + 2 letras (ej. AB123CD) o tradicional 3 letras + 2 números + 1 letra (ej. ABC12D) / 3 letras + 3 números (ABC123)',
    placeholder: 'AB123CD',
    minLength: 6,
    maxLength: 7,
    regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}$|^[A-Z]{3}[0-9]{3}$|^[A-Z]{1}[0-9]{2}[A-Z]{2}[0-9]{1}[A-Z]{1}$|^[A-Z]{2}[0-9]{4}$|^[A-Z]{1}[0-9]{5,6}$|^[A-Z]{1}[0-9]{2}[A-Z]{1}[0-9]{2}[A-Z]{1}$/,
  },
  'Ecuador 🇪🇨': {
    id: 'ECU',
    name: 'Ecuador',
    flag: '🇪🇨',
    example: 'PBA1234',
    description: '3 letras (provincia) + 3 o 4 números (ej. PBA1234, GBA123) o motos 2 letras + 3-4 números + 1 letra (ej. PB1234A)',
    placeholder: 'PBA1234',
    minLength: 6,
    maxLength: 7,
    regex: /^[A-Z]{3}[0-9]{3,4}$|^[A-Z]{2}[0-9]{3,4}[A-Z]{0,1}$|^[A-Z]{1}[0-9]{4,5}$/,
  },
  'Panamá 🇵🇦': {
    id: 'PAN',
    name: 'Panamá',
    flag: '🇵🇦',
    example: '123456 o AB1234',
    description: '5 a 6 dígitos numéricos (ej. 123456) o 1-2 letras + 4-5 números (ej. AB1234, AB12345)',
    placeholder: '123456',
    minLength: 5,
    maxLength: 7,
    regex: /^[0-9]{5,6}$|^[A-Z]{1,2}[0-9]{4,5}$/,
  },
  'Estados Unidos 🇺🇸': {
    id: 'USA',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    example: '7XYZ123',
    description: '5 a 7 caracteres alfanuméricos según el estado de emisión (ej. 7XYZ123, ABC1234 o ABC12D)',
    placeholder: '7XYZ123',
    minLength: 5,
    maxLength: 7,
    regex: /^[A-Z0-9]{5,7}$/,
  },
  'Perú 🇵🇪': {
    id: 'PER',
    name: 'Perú',
    flag: '🇵🇪',
    example: 'A1B123 o ABC123',
    description: '3 caracteres alfanuméricos + 3 números (ej. A1B123, ABC123), tradicional 2 letras + 4 números (AB1234) o motos 4-5 números + 1-2 letras',
    placeholder: 'A1B123',
    minLength: 6,
    maxLength: 7,
    regex: /^[A-Z0-9]{2,3}[0-9]{3,4}$|^[0-9]{4,5}[A-Z]{1,2}$/,
  },
  'Brasil 🇧🇷': {
    id: 'BRA',
    name: 'Brasil',
    flag: '🇧🇷',
    example: 'ABC1D23',
    description: 'Estándar Mercosul: 3 letras + 1 número + 1 letra + 2 números (ej. ABC1D23) o tradicional 3 letras + 4 números (ABC1234)',
    placeholder: 'ABC1D23',
    minLength: 7,
    maxLength: 7,
    regex: /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$|^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}[0-9]{1}$/,
  },
  'Chile 🇨🇱': {
    id: 'CHL',
    name: 'Chile',
    flag: '🇨🇱',
    example: 'BBCL12 o AB1234',
    description: '4 letras + 2 números (ej. BBCL12), tradicional 2 letras + 4 números (AB1234) o 3 letras + 2-3 números',
    placeholder: 'BBCL12',
    minLength: 5,
    maxLength: 6,
    regex: /^[A-Z]{4}[0-9]{2}$|^[A-Z]{2}[0-9]{4}$|^[A-Z]{3}[0-9]{2,3}$|^[A-Z]{2}[0-9]{3}$/,
  },
  'Argentina 🇦🇷': {
    id: 'ARG',
    name: 'Argentina',
    flag: '🇦🇷',
    example: 'AB123CD o ABC123',
    description: 'Estándar Mercosur: 2 letras + 3 números + 2 letras (ej. AB123CD), tradicional 3 letras + 3 números (ABC123) o motos (A123BCD / 123ABC)',
    placeholder: 'AB123CD',
    minLength: 6,
    maxLength: 7,
    regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$|^[A-Z]{3}[0-9]{3}$|^[A-Z]{1}[0-9]{3}[A-Z]{3}$|^[0-9]{3}[A-Z]{3}$/,
  },
  'México 🇲🇽': {
    id: 'MEX',
    name: 'México',
    flag: '🇲🇽',
    example: 'ABC1234 o ABC123',
    description: '3 letras + 3 o 4 números (ej. ABC1234, ABC123), 3 letras + 2 números + 1 letra (ABC12A) o 2 letras + 4-5 números',
    placeholder: 'ABC1234',
    minLength: 6,
    maxLength: 7,
    regex: /^[A-Z]{3}[0-9]{3,4}$|^[A-Z]{3}[0-9]{2}[A-Z0-9]{1,2}$|^[A-Z]{2}[0-9]{4,5}$/,
  },
  'España 🇪🇸': {
    id: 'ESP',
    name: 'España',
    flag: '🇪🇸',
    example: '1234BCD',
    description: '4 números + 3 letras consonantes (ej. 1234BCD) o provincial 1-2 letras + 4 números + 1-2 letras (ej. M1234AB)',
    placeholder: '1234BCD',
    minLength: 7,
    maxLength: 8,
    regex: /^[0-9]{4}[A-Z]{3}$|^[A-Z]{1,2}[0-9]{4}[A-Z]{1,2}$/,
  },
  'Otro país': {
    id: 'OTRO',
    name: 'Otro País / Internacional',
    flag: '🌐',
    example: 'EXT12345',
    description: 'Formato libre internacional: 3 a 10 caracteres alfanuméricos continuos',
    placeholder: 'EXT12345',
    minLength: 3,
    maxLength: 10,
    regex: /^[A-Z0-9]{3,10}$/,
  },
};

/**
 * Obtiene la regla activa según el modo (nacional vs extranjero) y país
 */
export function getActivePlateRule(isForeign: boolean, countryName?: string): PlateCountryRule | null {
  if (!isForeign) return NATIONAL_PLATE_RULE;
  if (countryName && FOREIGN_COUNTRY_RULES[countryName]) {
    return FOREIGN_COUNTRY_RULES[countryName];
  }
  return null;
}

export interface PlateValidationResult {
  cleanPlate: string;
  isValid: boolean;
  isCountryMissing: boolean;
  isCustomCountryMissing: boolean;
  activeRule: PlateCountryRule | null;
  errorMessage: string | null;
  successMessage: string | null;
}

/**
 * Valida de manera integral la placa y el país
 */
export function validatePlateData(
  rawPlate: string,
  isForeign: boolean,
  countryName: string,
  customCountryName?: string,
  vehicleType?: string,
  categoryName?: string
): PlateValidationResult {
  const cleanPlate = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const activeRule = getActivePlateRule(isForeign, countryName);

  // Soporte para bicicletas, patinetas o vehículos sin matrícula automotriz
  const nameLower = (categoryName || '').toLowerCase();
  const isExplicitlyMotorized = 
    nameLower.includes('bus') || 
    nameLower.includes('auto') || 
    nameLower.includes('carro') || 
    nameLower.includes('moto') || 
    nameLower.includes('camion') || 
    nameLower.includes('camioneta') || 
    nameLower.includes('suv') || 
    nameLower.includes('carga') || 
    nameLower.includes('van') || 
    nameLower.includes('taxi');

  const isNonMotorized = !isExplicitlyMotorized && (
    vehicleType === 'bicycle' || 
    vehicleType === 'scooter' || 
    nameLower.includes('bici') || 
    nameLower.includes('patineta') || 
    nameLower.includes('scooter') || 
    nameLower.includes('cicla') ||
    nameLower.includes('monopatin')
  );

  if (isNonMotorized) {
    const isValid = cleanPlate.length >= 1 && cleanPlate.length <= 10;
    return {
      cleanPlate,
      isValid,
      isCountryMissing: false,
      isCustomCountryMissing: false,
      activeRule: {
        id: 'BICI',
        name: categoryName || 'Identificador Libre / Bicicleta',
        flag: '🚲',
        example: 'BICI01 o 01',
        description: 'Identificador de 1 a 10 caracteres para bicicletas o patinetas.',
        placeholder: 'BICI01',
        minLength: 1,
        maxLength: 10,
        regex: /^[A-Z0-9]{1,10}$/
      },
      errorMessage: isValid ? null : 'Ingrese un identificador o número para el vehículo (1 a 10 caracteres).',
      successMessage: isValid ? `✓ Identificador verificado (${cleanPlate}). Listo para registrar.` : null
    };
  }

  if (!isForeign) {
    const isValid = cleanPlate.length >= NATIONAL_PLATE_RULE.minLength && 
                    cleanPlate.length <= NATIONAL_PLATE_RULE.maxLength && 
                    NATIONAL_PLATE_RULE.regex.test(cleanPlate);
    let errorMessage: string | null = null;
    let successMessage: string | null = null;

    if (cleanPlate.length > 0 && !isValid) {
      if (cleanPlate.length < 5) {
        errorMessage = `La placa colombiana debe tener al menos 5 caracteres (ej. ABC123 para carros o ABC12D para motos). Ingresado: ${cleanPlate.length} carac.`;
      } else if (cleanPlate.length > 6) {
        errorMessage = `La placa colombiana oficial no puede exceder 6 caracteres (ingresado: ${cleanPlate.length} carac.).`;
      } else {
        errorMessage = `Formato no legal para Colombia 🇨🇴. Estructura requerida: Carros (3 letras + 3 números, ej. ABC123), Motos (3 letras + 2 números + 1 letra, ej. ABC12D o clásicas AB1234/AB123), Oficiales (CD1234/OF1234) o Remolques (R12345). Ingresado: '${cleanPlate}'.`;
      }
    } else if (isValid) {
      successMessage = `✓ Formato oficial colombiano verificado (${cleanPlate}). Listo para registrar.`;
    }

    return {
      cleanPlate,
      isValid,
      isCountryMissing: false,
      isCustomCountryMissing: false,
      activeRule: NATIONAL_PLATE_RULE,
      errorMessage,
      successMessage,
    };
  }

  // MODO EXTRANJERO
  const isCountryMissing = !countryName || countryName.trim() === '';
  const isCustomCountryMissing = countryName === 'Otro país' && (!customCountryName || customCountryName.trim() === '');

  if (isCountryMissing) {
    return {
      cleanPlate,
      isValid: false,
      isCountryMissing: true,
      isCustomCountryMissing: false,
      activeRule: null,
      errorMessage: 'Debe seleccionar el país de procedencia de la lista para registrar una placa extranjera.',
      successMessage: null,
    };
  }

  if (isCustomCountryMissing) {
    return {
      cleanPlate,
      isValid: false,
      isCountryMissing: false,
      isCustomCountryMissing: true,
      activeRule,
      errorMessage: 'Debe ingresar el nombre del país en el campo correspondiente.',
      successMessage: null,
    };
  }

  if (!activeRule) {
    return {
      cleanPlate,
      isValid: false,
      isCountryMissing: false,
      isCustomCountryMissing: false,
      activeRule: null,
      errorMessage: 'Regla de país no encontrada.',
      successMessage: null,
    };
  }

  if (cleanPlate.length === 0) {
    return {
      cleanPlate,
      isValid: false,
      isCountryMissing: false,
      isCustomCountryMissing: false,
      activeRule,
      errorMessage: null,
      successMessage: null,
    };
  }

  const matchesRegex = activeRule.regex.test(cleanPlate);
  const lengthOk = cleanPlate.length >= activeRule.minLength && cleanPlate.length <= activeRule.maxLength;
  const isValid = matchesRegex && lengthOk;

  let errorMessage: string | null = null;
  let successMessage: string | null = null;

  if (!isValid) {
    errorMessage = `La placa '${cleanPlate}' no coincide con el formato oficial de ${activeRule.name} ${activeRule.flag}. Estructura requerida: ${activeRule.description}. Ejemplo: ${activeRule.example}.`;
  } else {
    successMessage = `✓ Placa verificada con formato oficial de ${activeRule.name} ${activeRule.flag} (${cleanPlate}). Listo para registrar.`;
  }

  return {
    cleanPlate,
    isValid,
    isCountryMissing: false,
    isCustomCountryMissing: false,
    activeRule,
    errorMessage,
    successMessage,
  };
}
