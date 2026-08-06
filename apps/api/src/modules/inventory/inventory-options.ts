export type InventoryOption = {
  value: string;
  label: string;
};

export type InventoryCategoryOption = InventoryOption & {
  subcategories: InventoryOption[];
};

export const INVENTORY_CATEGORIES: InventoryCategoryOption[] = [
  {
    value: 'Camp',
    label: 'Camp',
    subcategories: [
      { value: 'Infrastructura', label: 'Infrastructură' },
      { value: 'Bucatarie', label: 'Bucătărie' },
      { value: 'Prim Ajutor', label: 'Prim Ajutor' },
      { value: 'Mancare', label: 'Mâncare' },
      { value: 'Scule', label: 'Scule' },
      { value: 'Corturi', label: 'Corturi' },
    ],
  },
  {
    value: 'Programe',
    label: 'Programe',
    subcategories: [
      { value: 'Prim Ajutor - DEMO', label: 'Prim Ajutor - DEMO' },
      { value: 'Papetarie', label: 'Papetărie' },
      { value: 'Boardgames', label: 'Boardgames' },
      { value: 'De legat', label: 'De legat' },
      { value: 'Festivalul Luminii', label: 'Festivalul Luminii' },
      { value: 'Altele', label: 'Altele' },
    ],
  },
  {
    value: 'Sediu',
    label: 'Sediu',
    subcategories: [
      { value: 'Mobila', label: 'Mobilă' },
      { value: 'Electronice', label: 'Electronice' },
      { value: 'Curatenie', label: 'Curățenie' },
    ],
  },
];

export const INVENTORY_OWNERS: InventoryOption[] = [
  { value: 'CL Vest', label: 'CL Vest' },
  { value: 'CL Nord', label: 'CL Nord' },
  { value: 'Comun', label: 'Comun' },
];

export const INVENTORY_LOCATIONS: InventoryOption[] = [
  { value: 'Pod - Camp', label: 'Pod - Camp' },
  { value: 'Pod - Programe', label: 'Pod - Programe' },
  { value: 'Pod - Misc', label: 'Pod - Misc' },
  { value: 'Sub Scari', label: 'Sub Scări' },
  { value: 'Camera 1', label: 'Camera 1' },
  { value: 'Camera 2', label: 'Camera 2' },
  { value: 'Camera 3', label: 'Camera 3' },
];

export const INVENTORY_CONDITIONS: InventoryOption[] = [
  { value: 'Buna', label: 'Bună' },
  { value: 'De reparat', label: 'De reparat' },
];

export const INVENTORY_OPTIONS = {
  categories: INVENTORY_CATEGORIES,
  owners: INVENTORY_OWNERS,
  locations: INVENTORY_LOCATIONS,
  conditions: INVENTORY_CONDITIONS,
};
