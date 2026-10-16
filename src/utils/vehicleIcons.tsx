import React from 'react';
import {
  Car,
  CarFront,
  CarTaxiFront,
  Motorbike,
  Bike,
  Truck,
  TruckElectric,
  Bus,
  BusFront,
  Caravan,
  Tractor,
  Forklift,
  Ambulance,
  Zap,
  BatteryCharging,
  Fuel,
  ShieldCheck,
  Boxes,
  Wrench,
  Compass,
  LucideIcon
} from 'lucide-react';
import { VehicleCategoryConfig } from '../types';

export interface VehicleIconDefinition {
  id: string;
  name: string;
  category: 'cars' | 'motos' | 'heavy' | 'eco' | 'special';
  icon: LucideIcon;
  description: string;
  keywords: string;
}

export const VEHICLE_TERRESTRIAL_ICONS: VehicleIconDefinition[] = [
  // 1. Livianos y Particulares
  { 
    id: 'Car', 
    name: 'Automóvil / Particular', 
    category: 'cars', 
    icon: Car, 
    description: 'Sedán, hatchback, coupé o familiar',
    keywords: 'carro auto automovil sedan familiar particular'
  },
  { 
    id: 'CarFront', 
    name: 'Automóvil Frontal', 
    category: 'cars', 
    icon: CarFront, 
    description: 'Vista frontal de auto particular',
    keywords: 'carro auto frontal trompa particular'
  },
  { 
    id: 'CarTaxiFront', 
    name: 'Taxi / Servicio Público', 
    category: 'cars', 
    icon: CarTaxiFront, 
    description: 'Taxi, transporte público o transfer',
    keywords: 'taxi publico servicio pasajero transporte'
  },
  { 
    id: 'Truck', 
    name: 'Camioneta / SUV / Pick-up', 
    category: 'cars', 
    icon: Truck, 
    description: 'Camionetas 4x4, platón, camperos y SUVs',
    keywords: 'camioneta suv pickup 4x4 campero platon'
  },

  // 2. Dos Ruedas y Movilidad Ligera
  { 
    id: 'Motorbike', 
    name: 'Motocicleta / Scooter', 
    category: 'motos', 
    icon: Motorbike, 
    description: 'Motos urbanas, de ruta y alto cilindraje',
    keywords: 'moto motocicleta scooter cilindrada'
  },
  { 
    id: 'Bike', 
    name: 'Bicicleta / Cicla', 
    category: 'motos', 
    icon: Bike, 
    description: 'Bicicletas urbanas, de ruta o montaña',
    keywords: 'bicicleta bici cicla cicloruta pedal'
  },
  { 
    id: 'Zap', 
    name: 'Patineta / Scooter Eléctrico', 
    category: 'motos', 
    icon: Zap, 
    description: 'Monopatines y micromovilidad eléctrica',
    keywords: 'patineta scooter monopatin electrico zap'
  },

  // 3. Transporte Colectivo y Pasajeros
  { 
    id: 'BusFront', 
    name: 'Microbús / Van / Furgón', 
    category: 'heavy', 
    icon: BusFront, 
    description: 'Furgón escolar, van utilitaria o colectivo',
    keywords: 'van furgon microbus utilitario colectivo escolar'
  },
  { 
    id: 'Bus', 
    name: 'Autobús / Buseta', 
    category: 'heavy', 
    icon: Bus, 
    description: 'Buses intermunicipales y transporte masivo',
    keywords: 'bus buseta autobus colectivo masivo'
  },
  { 
    id: 'Caravan', 
    name: 'Remolque / Casa Rodante', 
    category: 'heavy', 
    icon: Caravan, 
    description: 'Trailers, casas rodantes y campistas',
    keywords: 'trailer remolque casa rodante camper camping'
  },

  // 4. Carga y Maquinaria
  { 
    id: 'Boxes', 
    name: 'Carga / Encomiendas', 
    category: 'heavy', 
    icon: Boxes, 
    description: 'Vehículos de reparto y mensajería',
    keywords: 'carga encomiendas paquetes reparto logistica'
  },
  { 
    id: 'TruckElectric', 
    name: 'Camión Eléctrico', 
    category: 'heavy', 
    icon: TruckElectric, 
    description: 'Camión ecológico de distribución urbana',
    keywords: 'camion reparto pesado electrico carga'
  },
  { 
    id: 'Tractor', 
    name: 'Tractor / Maquinaria', 
    category: 'heavy', 
    icon: Tractor, 
    description: 'Maquinaria pesada, agrícola o de obra',
    keywords: 'tractor maquinaria obra construccion agricola pesada'
  },
  { 
    id: 'Forklift', 
    name: 'Montacargas / Elevador', 
    category: 'heavy', 
    icon: Forklift, 
    description: 'Operación logística y bodegaje',
    keywords: 'montacargas forklift elevador bodega estiba'
  },

  // 5. Especiales y Asistencia
  { 
    id: 'BatteryCharging', 
    name: 'Vehículo 100% Eléctrico', 
    category: 'eco', 
    icon: BatteryCharging, 
    description: 'Autos eléctricos en bahías de carga',
    keywords: 'electrico hibrido carga bateria ecológico'
  },
  { 
    id: 'Fuel', 
    name: 'Vehículo a Combustión / Gas', 
    category: 'eco', 
    icon: Fuel, 
    description: 'Vehículos convencionales a gasolina o GNV',
    keywords: 'combustion gasolina diesel gas tanqueo'
  },
  { 
    id: 'Ambulance', 
    name: 'Ambulancia / Emergencia', 
    category: 'special', 
    icon: Ambulance, 
    description: 'Misión médica y vehículos de emergencia',
    keywords: 'ambulancia medico salud emergencia rescate'
  },
  { 
    id: 'ShieldCheck', 
    name: 'Vehículo Oficial / Blindado', 
    category: 'special', 
    icon: ShieldCheck, 
    description: 'Seguridad, escoltas y diplomáticos',
    keywords: 'oficial blindado seguridad escolta policia gobierno'
  },
  { 
    id: 'Wrench', 
    name: 'Grúa / Asistencia Mecánica', 
    category: 'special', 
    icon: Wrench, 
    description: 'Auxilio vial, mecánica y grúas de plataforma',
    keywords: 'grua auxilio taller mecanica asistencia'
  },
  { 
    id: 'Compass', 
    name: 'Especial / No Convencional', 
    category: 'special', 
    icon: Compass, 
    description: 'Cuatrimotos, motocarros, buggies y otros',
    keywords: 'otro especial cuatrimoto motocarro atv buggy'
  },
];

/**
 * Obtiene el componente Lucide correspondiente según el ID del icono,
 * el ID de la categoría o sinónimos comunes.
 */
export const getVehicleIconComponent = (
  iconOrType?: string,
  categories?: VehicleCategoryConfig[]
): LucideIcon => {
  if (!iconOrType) return Car;

  // 1. Buscar si iconOrType corresponde a un id de categoría registrada
  if (categories && categories.length > 0) {
    const foundCategory = categories.find(c => c.id === iconOrType);
    if (foundCategory?.icon) {
      const match = VEHICLE_TERRESTRIAL_ICONS.find(
        i => i.id.toLowerCase() === foundCategory.icon.toLowerCase()
      );
      if (match) return match.icon;
    }
  }

  // 2. Coincidencia directa por id en la lista de iconos
  const directMatch = VEHICLE_TERRESTRIAL_ICONS.find(
    i => i.id.toLowerCase() === iconOrType.toLowerCase()
  );
  if (directMatch) return directMatch.icon;

  // 3. Mapeo de sinónimos y compatibilidad con datos existentes
  const normalized = iconOrType.toLowerCase();
  if (normalized === 'motorcycle' || normalized === 'moto') return Motorbike;
  if (normalized === 'bike') return Bike;
  if (normalized === 'bicycle' || normalized === 'bici') return Bike;
  if (normalized === 'suv' || normalized === 'camioneta') return Truck;
  if (normalized === 'truck') return Truck;
  if (normalized === 'van' || normalized === 'furgon') return BusFront;
  if (normalized === 'bus') return Bus;
  if (normalized === 'scooter' || normalized === 'patineta') return Zap;
  if (normalized === 'zap') return Zap;
  if (normalized === 'electric' || normalized === 'electrico') return BatteryCharging;
  if (normalized === 'taxi') return CarTaxiFront;
  if (normalized === 'ambulance' || normalized === 'ambulancia') return Ambulance;
  if (normalized === 'forklift' || normalized === 'montacargas') return Forklift;
  if (normalized === 'tractor') return Tractor;
  if (normalized === 'compass') return Compass;

  return Car;
};

/**
 * Renderiza el elemento JSX del icono para usar directamente en interfaces.
 */
export const renderVehicleIcon = (
  iconOrType?: string,
  className: string = 'w-4 h-4',
  categories?: VehicleCategoryConfig[]
): React.ReactElement => {
  const IconComponent = getVehicleIconComponent(iconOrType, categories);
  return <IconComponent className={className} />;
};
