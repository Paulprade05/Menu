import { Dish, DayPlan, WeekMenu, UserSettings, ShoppingListItem } from '@/types';

export const DEFAULT_POSTAL_CODE = '46001';
export const DEFAULT_WAREHOUSE = 'vlc1';

export const POSTAL_CODE_WAREHOUSES: Record<string, string> = {
  // Madrid
  '28': 'mad1',
  // Barcelona
  '08': 'bcn1',
  // Valencia
  '46': 'vlc1',
  // Alicante
  '03': 'alc1',
  // Sevilla
  '41': 'sev1',
  // Malaga
  '29': 'mlg1',
  // Zaragoza
  '50': 'zgz1',
  // Murcia
  '30': 'mur1',
  // Vizcaya / Bilbao
  '48': 'bio1',
  // A Coruña
  '15': 'cor1',
};

export function getWarehouseFromPostalCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return DEFAULT_WAREHOUSE;
  const prefix = postalCode.substring(0, 2);
  return POSTAL_CODE_WAREHOUSES[prefix] || DEFAULT_WAREHOUSE;
}

export const INITIAL_SETTINGS: UserSettings = {
  postalCode: '46001',
  warehouse: 'vlc1',
  syncCode: 'MERC-7782',
  defaultDaysCount: 6, // Lunes a Sábado por defecto
  customStoreName: 'Mercadona Centro',
};

export const INITIAL_DISHES: Dish[] = [
  {
    id: 'dish-1',
    name: 'Tortilla de patatas casera con cebolla',
    type: 'cena',
    tags: ['Tradicional', 'Económico', 'Vegetariano', 'Rápido'],
    estimatedCost: 3.40,
    createdAt: new Date().toISOString(),
    notes: 'Pochar las patatas y la cebolla a fuego lento. Cuajar al gusto con huevos frescos.',
    imageUrl: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-1-1',
        name: 'Huevos camperos clase M/L Hacendado',
        quantity: 1,
        unit: 'pack (12 ud)',
        estimatedPrice: 2.15,
        mercadonaProduct: {
          id: '25412',
          slug: 'huevos-camperos-l-hacendado',
          displayName: 'Huevos camperos clase L Hacendado',
          brand: 'Hacendado',
          packaging: 'Docena',
          price: 2.15,
          thumbnail: 'https://prod-mercadona.imgix.net/images/96a297926b0a02cbcfefaa2003c20c0f.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-1-2',
        name: 'Patatas para freír y guisar',
        quantity: 1,
        unit: 'malla (2 kg)',
        estimatedPrice: 2.65,
        mercadonaProduct: {
          id: '69421',
          slug: 'patatas-guisar-freir-malla',
          displayName: 'Patatas para freír y guisar',
          brand: 'Mercadona',
          packaging: 'Malla 2 kg',
          price: 2.65,
          thumbnail: 'https://prod-mercadona.imgix.net/images/737cf0d7fbe8d58c89cceee359d9c240.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-1-3',
        name: 'Cebolla dulce Hacendado',
        quantity: 1,
        unit: 'malla (1 kg)',
        estimatedPrice: 1.55,
        mercadonaProduct: {
          id: '68512',
          slug: 'cebolla-dulce-malla',
          displayName: 'Cebolla dulce',
          brand: 'Mercadona',
          packaging: 'Malla 1 kg',
          price: 1.55,
          thumbnail: 'https://prod-mercadona.imgix.net/images/2e071e626e95bf61b6c0e447bdf2f559.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-2',
    name: 'Lentejas pardinas con verduras y chorizo',
    type: 'comida',
    tags: ['Legumbres', 'Saludable', 'Guiso', 'Plato único'],
    estimatedCost: 5.20,
    createdAt: new Date().toISOString(),
    notes: 'Dejar cocer a fuego medio durante 45 minutos con una hoja de laurel y pimentón dulce.',
    imageUrl: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-2-1',
        name: 'Lenteja pardina selección Hacendado',
        quantity: 1,
        unit: 'paquete (1 kg)',
        estimatedPrice: 1.80,
        mercadonaProduct: {
          id: '5110',
          slug: 'lenteja-pardina-hacendado-paquete',
          displayName: 'Lenteja pardina Hacendado',
          brand: 'Hacendado',
          packaging: 'Paquete 1 kg',
          price: 1.80,
          thumbnail: 'https://prod-mercadona.imgix.net/images/7bbff0cb416556e40ea1176b6bb17887.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-2-2',
        name: 'Zanahorias frescas',
        quantity: 1,
        unit: 'bolsa (500 g)',
        estimatedPrice: 0.85,
        mercadonaProduct: {
          id: '68530',
          slug: 'zanahorias-bolsa',
          displayName: 'Zanahorias',
          brand: 'Mercadona',
          packaging: 'Bolsa 500 g',
          price: 0.85,
          thumbnail: 'https://prod-mercadona.imgix.net/images/b63cb33a1e2f7b886d9a8c08efca8892.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-2-3',
        name: 'Chorizo dulce para guisar',
        quantity: 1,
        unit: 'pack (3 ud)',
        estimatedPrice: 2.25,
        mercadonaProduct: {
          id: '30214',
          slug: 'chorizo-dulce-oreado-hacendado',
          displayName: 'Chorizo dulce oreado Hacendado',
          brand: 'Hacendado',
          packaging: 'Pack 3 ud',
          price: 2.25,
          thumbnail: 'https://prod-mercadona.imgix.net/images/f34fbf1ce716f9269542ae1cbf722880.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-3',
    name: 'Salmón a la plancha con espárragos verdes',
    type: 'cena',
    tags: ['Pescado', 'Saludable', 'Keto', 'Rápido', 'Bajo en calorías'],
    estimatedCost: 6.95,
    createdAt: new Date().toISOString(),
    notes: 'Marcar el salmón por el lado de la piel hasta que quede crujiente. Saltear los espárragos con escamas de sal.',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-3-1',
        name: 'Lomos de salmón fresco sin espinas',
        quantity: 1,
        unit: 'bandeja (2 ud / 300 g)',
        estimatedPrice: 5.45,
        mercadonaProduct: {
          id: '4390',
          slug: 'lomos-salmon-fresco-bandeja',
          displayName: 'Lomos de salmón fresco',
          brand: 'Mercadona',
          packaging: 'Bandeja 300 g aprox',
          price: 5.45,
          thumbnail: 'https://prod-mercadona.imgix.net/images/b0e51ce2a6659f42587bbcaee31b8ecb.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-3-2',
        name: 'Espárragos verdes finos',
        quantity: 1,
        unit: 'manojo (250 g)',
        estimatedPrice: 2.10,
        mercadonaProduct: {
          id: '68500',
          slug: 'esparragos-verdes-manojo',
          displayName: 'Espárragos verdes trigueros',
          brand: 'Mercadona',
          packaging: 'Manojo 250 g',
          price: 2.10,
          thumbnail: 'https://prod-mercadona.imgix.net/images/945e45a2777b7fef4a7ae674fa77c5ba.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-4',
    name: 'Pechugas de pollo al limón con arroz basmati',
    type: 'comida',
    tags: ['Pollo', 'Saludable', 'Fitness', 'Alto en proteína'],
    estimatedCost: 4.80,
    createdAt: new Date().toISOString(),
    notes: 'Macerar el pollo con zumo de limón y pimienta negra durante 15 minutos antes de cocinar.',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-4-1',
        name: 'Pechuga de pollo corte fino fileteada',
        quantity: 1,
        unit: 'bandeja (500 g)',
        estimatedPrice: 4.10,
        mercadonaProduct: {
          id: '2714',
          slug: 'pechuga-pollo-corte-fino-bandeja',
          displayName: 'Pechuga de pollo corte fino',
          brand: 'Mercadona',
          packaging: 'Bandeja 500 g',
          price: 4.10,
          thumbnail: 'https://prod-mercadona.imgix.net/images/50ebfa5bf26c2cf28236d6df72aeb419.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-4-2',
        name: 'Arroz Basmati aromático Hacendado',
        quantity: 1,
        unit: 'paquete (1 kg)',
        estimatedPrice: 1.95,
        mercadonaProduct: {
          id: '5070',
          slug: 'arroz-basmati-hacendado-paquete',
          displayName: 'Arroz basmati Hacendado',
          brand: 'Hacendado',
          packaging: 'Paquete 1 kg',
          price: 1.95,
          thumbnail: 'https://prod-mercadona.imgix.net/images/6df43dfb7ae230b7c76f6fb913f04495.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-4-3',
        name: 'Limones de mesa',
        quantity: 1,
        unit: 'malla (1 kg)',
        estimatedPrice: 1.85,
        mercadonaProduct: {
          id: '68490',
          slug: 'limon-malla',
          displayName: 'Limones frescos',
          brand: 'Mercadona',
          packaging: 'Malla 1 kg',
          price: 1.85,
          thumbnail: 'https://prod-mercadona.imgix.net/images/5dbcc0d49f6f32e6a9787fb4958f00ad.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-5',
    name: 'Espaguetis a la boloñesa casera',
    type: 'comida',
    tags: ['Pasta', 'Familiar', 'Clásico', 'Gusta a todos'],
    estimatedCost: 5.60,
    createdAt: new Date().toISOString(),
    notes: 'Sofrito lento de carne con tomate frito estilo casero y orégano seco.',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-5-1',
        name: 'Espaguetis pasta de trigo Hacendado',
        quantity: 1,
        unit: 'paquete (1 kg)',
        estimatedPrice: 1.25,
        mercadonaProduct: {
          id: '5220',
          slug: 'espaguetis-hacendado-paquete',
          displayName: 'Espagueti Hacendado',
          brand: 'Hacendado',
          packaging: 'Paquete 1 kg',
          price: 1.25,
          thumbnail: 'https://prod-mercadona.imgix.net/images/3f28cf085c8f61ca476c8c4bc7e4c27f.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-5-2',
        name: 'Carne picada mixta vacuno y cerdo',
        quantity: 1,
        unit: 'bandeja (500 g)',
        estimatedPrice: 3.85,
        mercadonaProduct: {
          id: '2840',
          slug: 'carne-picada-mixta-bandeja',
          displayName: 'Preparado de carne picada vacuno y cerdo',
          brand: 'Mercadona',
          packaging: 'Bandeja 500 g',
          price: 3.85,
          thumbnail: 'https://prod-mercadona.imgix.net/images/f38ea8d88e65e64883445e998a6dbb44.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-5-3',
        name: 'Tomate frito receta artesana Hacendado',
        quantity: 1,
        unit: 'tarro (565 g)',
        estimatedPrice: 1.60,
        mercadonaProduct: {
          id: '17140',
          slug: 'tomate-frito-receta-artesana-hacendado-tarro',
          displayName: 'Tomate frito receta artesana Hacendado',
          brand: 'Hacendado',
          packaging: 'Tarro 565 g',
          price: 1.60,
          thumbnail: 'https://prod-mercadona.imgix.net/images/e589c8259daf4b9335098fb9ade7ee09.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-5-4',
        name: 'Queso Grana Padano en polvo Hacendado',
        quantity: 1,
        unit: 'bolsa (100 g)',
        estimatedPrice: 1.70,
        mercadonaProduct: {
          id: '1540',
          slug: 'queso-grana-padano-polvo-hacendado',
          displayName: 'Queso Grana Padano en polvo Hacendado',
          brand: 'Hacendado',
          packaging: 'Bolsa 100 g',
          price: 1.70,
          thumbnail: 'https://prod-mercadona.imgix.net/images/4222ccaa544415cf7208d2ae3d8fcf52.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-6',
    name: 'Crema de calabacín suave con quesitos',
    type: 'cena',
    tags: ['Verdura', 'Ligero', 'Saludable', 'Reconfortante'],
    estimatedCost: 3.10,
    createdAt: new Date().toISOString(),
    notes: 'Triturar muy bien con 4 quesitos y un chorrito de aceite de oliva virgen extra.',
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-6-1',
        name: 'Calabacín verde fresco',
        quantity: 1,
        unit: 'pieza (1 kg)',
        estimatedPrice: 1.75,
        mercadonaProduct: {
          id: '68520',
          slug: 'calabacin-verde',
          displayName: 'Calabacín verde',
          brand: 'Mercadona',
          packaging: 'Pieza aprox 1 kg',
          price: 1.75,
          thumbnail: 'https://prod-mercadona.imgix.net/images/3a84fb75ef85cb8ae3ae4a434771f28b.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-6-2',
        name: 'Queso en porciones quesitos Hacendado',
        quantity: 1,
        unit: 'caja (16 porciones)',
        estimatedPrice: 1.45,
        mercadonaProduct: {
          id: '1520',
          slug: 'quesitos-porciones-hacendado',
          displayName: 'Queso en porciones Hacendado',
          brand: 'Hacendado',
          packaging: 'Caja 16 porciones',
          price: 1.45,
          thumbnail: 'https://prod-mercadona.imgix.net/images/5f79aa806b7cbda40b2e778fc3985b98.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-7',
    name: 'Lubina al horno con patatas panadera',
    type: 'cena',
    tags: ['Pescado fresco', 'Horno', 'Gourmet', 'Saludable'],
    estimatedCost: 7.20,
    createdAt: new Date().toISOString(),
    notes: 'Hornear a 180°C durante 20 minutos con rodajas de cebolla y patata finas de base.',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-7-1',
        name: 'Lubina de ración limpia y eviscerada',
        quantity: 1,
        unit: 'bandeja (2 ud / 600 g)',
        estimatedPrice: 5.75,
        mercadonaProduct: {
          id: '4120',
          slug: 'lubina-racion-pescaderia',
          displayName: 'Lubina de ración limpia',
          brand: 'Mercadona',
          packaging: 'Bandeja 2 ud',
          price: 5.75,
          thumbnail: 'https://prod-mercadona.imgix.net/images/db19d7d4c1dbce358178d5930c25a7a7.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  },
  {
    id: 'dish-8',
    name: 'Fajitas de pollo con verduras y guacamole',
    type: 'cena',
    tags: ['Rápido', 'Fácil', 'Cena informal', 'Pollo'],
    estimatedCost: 6.30,
    createdAt: new Date().toISOString(),
    notes: 'Saltear pimientos y cebolla en tiras con pechuga sazonada. Servir con guacamole fresco.',
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      {
        id: 'ing-8-1',
        name: 'Tortillas de trigo para fajitas Hacendado',
        quantity: 1,
        unit: 'paquete (8 ud)',
        estimatedPrice: 1.35,
        mercadonaProduct: {
          id: '8110',
          slug: 'tortillas-trigo-fajitas-hacendado',
          displayName: 'Tortillas de trigo grandes Hacendado',
          brand: 'Hacendado',
          packaging: 'Paquete 8 ud',
          price: 1.35,
          thumbnail: 'https://prod-mercadona.imgix.net/images/99245fcde60882e7ba1e3fb275815668.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-8-2',
        name: 'Guacamole fresco 95% aguacate Hacendado',
        quantity: 1,
        unit: 'tarrina (200 g)',
        estimatedPrice: 1.75,
        mercadonaProduct: {
          id: '16220',
          slug: 'guacamole-fresco-hacendado-tarrina',
          displayName: 'Guacamole fresco Hacendado',
          brand: 'Hacendado',
          packaging: 'Tarrina 200 g',
          price: 1.75,
          thumbnail: 'https://prod-mercadona.imgix.net/images/3f28bb019488a032fec66580a6d0c921.jpg?fit=crop&h=300&w=300',
        }
      },
      {
        id: 'ing-8-3',
        name: 'Pimiento tricolor semáforo (rojo, verde, amarillo)',
        quantity: 1,
        unit: 'pack (3 ud)',
        estimatedPrice: 2.10,
        mercadonaProduct: {
          id: '68540',
          slug: 'pimientos-semaforo-pack',
          displayName: 'Pimiento tricolor semáforo',
          brand: 'Mercadona',
          packaging: 'Pack 3 ud',
          price: 2.10,
          thumbnail: 'https://prod-mercadona.imgix.net/images/a0e14bf114a2c2ffab6b97ecf265882b.jpg?fit=crop&h=300&w=300',
        }
      }
    ]
  }
];

export const INITIAL_WEEK_MENU: WeekMenu = {
  id: 'menu-semana-activa',
  name: 'Menú semanal activo',
  activeDaysCount: 6, // Lunes a Sábado por defecto
  updatedAt: new Date().toISOString(),
  days: [
    {
      dayKey: 'lunes',
      dayLabel: 'Lunes',
      comidaDishId: 'dish-2', // Lentejas pardinas
      cenaDishId: 'dish-1',   // Tortilla de patatas
    },
    {
      dayKey: 'martes',
      dayLabel: 'Martes',
      comidaDishId: 'dish-4', // Pollo al limón con arroz
      cenaDishId: 'dish-6',   // Crema de calabacín
    },
    {
      dayKey: 'miercoles',
      dayLabel: 'Miércoles',
      comidaDishId: 'dish-5', // Espaguetis boloñesa
      cenaDishId: 'dish-3',   // Salmón con espárragos
    },
    {
      dayKey: 'jueves',
      dayLabel: 'Jueves',
      comidaDishId: 'dish-2', // Lentejas
      cenaDishId: 'dish-8',   // Fajitas
    },
    {
      dayKey: 'viernes',
      dayLabel: 'Viernes',
      comidaDishId: 'dish-4', // Pollo
      cenaDishId: 'dish-7',   // Lubina al horno
    },
    {
      dayKey: 'sabado',
      dayLabel: 'Sábado',
      comidaDishId: 'dish-5', // Espaguetis
      cenaDishId: null,       // Libre / Salir a cenar
      cenaCustomName: 'Cena fuera de casa 🍕',
    },
    {
      dayKey: 'domingo',
      dayLabel: 'Domingo',
      comidaDishId: null,
      cenaDishId: null,
    }
  ]
};

export const INITIAL_SAVED_MENUS = [
  {
    id: 'template-mediterraneo',
    name: 'Menú Mediterráneo Equilibrado',
    description: 'Rico en legumbres, pescado azul, verduras frescas y aves ligeras.',
    activeDaysCount: 6,
    createdAt: new Date().toISOString(),
    days: INITIAL_WEEK_MENU.days,
  }
];
