export interface PriceOption {
  riel: number;
  usd: number;
}

export interface MenuItem {
  id: string;
  nameKh: string;
  nameEn: string;
  category: MenuCategoryKey;
  prices: {
    regular: PriceOption;
    large?: PriceOption;
  };
  description?: string;
  tag?: string;
  image: string;
}

export type MenuCategoryKey =
  | "iced-coffee"
  | "non-coffee"
  | "hot-coffee"
  | "frappes"
  | "tea"
  | "soda";

export interface MenuCategory {
  key: MenuCategoryKey;
  nameKh: string;
  nameEn: string;
  icon: string;
  description: string;
}

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    key: "iced-coffee",
    nameKh: "កាហ្វេទឹកកក",
    nameEn: "ICED COFFEE",
    icon: "Coffee",
    description: "Espresso crafted drinks served chilled over ice",
  },
  {
    key: "non-coffee",
    nameKh: "មិនមែនកាហ្វេ",
    nameEn: "NON-COFFEE",
    icon: "Milk",
    description: "Creamy matcha, strawberry, and chocolate creations",
  },
  {
    key: "hot-coffee",
    nameKh: "កាហ្វេក្តៅ",
    nameEn: "HOT COFFEE",
    icon: "Flame",
    description: "Freshly brewed warm classics and hot beverages",
  },
  {
    key: "frappes",
    nameKh: "ក្រឡុក",
    nameEn: "FRAPPES",
    icon: "IceCream",
    description: "Blended ice drinks, rich flavors, and creamy textures",
  },
  {
    key: "tea",
    nameKh: "តែ",
    nameEn: "TEA",
    icon: "Leaf",
    description: "Refreshing infused green, jasmine, fruit, and milk teas",
  },
  {
    key: "soda",
    nameKh: "សូដា",
    nameEn: "SODA",
    icon: "Sparkles",
    description: "Fizzy, bubbly, and fruity sparkling sodas",
  },
];

export const MENU_ITEMS: MenuItem[] = [
  // --- ICED COFFEE ---
  {
    id: "ice-latte",
    nameKh: "ឡាតេទឹកកក",
    nameEn: "Ice Latte",
    category: "iced-coffee",
    image: "/drinks/ice-latte.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    tag: "Popular",
    description: "Smooth espresso poured over chilled fresh milk and ice",
  },
  {
    id: "iced-americano",
    nameKh: "អាមេរិកាណូទឹកកក",
    nameEn: "Iced Americano",
    category: "iced-coffee",
    image: "/drinks/iced-americano.png",
    prices: {
      regular: { riel: 5500, usd: 1.35 },
      large: { riel: 6000, usd: 1.50 },
    },
    description: "Rich double espresso topped with chilled water over ice",
  },
  {
    id: "khmer-coffee",
    nameKh: "កាហ្វេខ្មែរ",
    nameEn: "Khmer Coffee",
    category: "iced-coffee",
    image: "/drinks/khmer-coffee.png",
    prices: {
      regular: { riel: 6500, usd: 1.60 },
      large: { riel: 7000, usd: 1.75 },
    },
    tag: "Signature",
    description: "Traditional bold Cambodian roast blended with sweet condensed milk",
  },
  {
    id: "iced-cappuccino",
    nameKh: "កាពូឈីណូទឹកកក",
    nameEn: "Iced Cappucino",
    category: "iced-coffee",
    image: "/drinks/iced-cappuccino.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    description: "Espresso with cold milk topped with velvety foam and cocoa dust",
  },
  {
    id: "iced-mocha",
    nameKh: "ម៉ូកាទឹកកក",
    nameEn: "Iced Mocha",
    category: "iced-coffee",
    image: "/drinks/iced-mocha.png",
    prices: {
      regular: { riel: 7500, usd: 1.85 },
      large: { riel: 8000, usd: 2.00 },
    },
    description: "Espresso mixed with premium cocoa sauce and fresh milk",
  },
  {
    id: "coffee-salted-cream",
    nameKh: "កាហ្វេសមុទ្រគ្រីម",
    nameEn: "Coffee Salted Cream",
    category: "iced-coffee",
    image: "/drinks/coffee-salted-cream.png",
    prices: {
      regular: { riel: 7000, usd: 1.70 },
      large: { riel: 8000, usd: 2.00 },
    },
    tag: "Specialty",
    description: "Signature iced coffee crowned with a rich, savory sea-salt cream cap",
  },
  {
    id: "egg-coffee-cream",
    nameKh: "កាហ្វេពងមាន់គ្រីម",
    nameEn: "Egg Coffee Cream",
    category: "iced-coffee",
    image: "/drinks/egg-coffee-cream.png",
    prices: {
      regular: { riel: 7000, usd: 1.70 },
      large: { riel: 8000, usd: 2.00 },
    },
    tag: "Specialty",
    description: "Silky whipped egg yolk cream floating atop dark, aromatic coffee",
  },

  // --- NON-COFFEE ---
  {
    id: "matcha-latte",
    nameKh: "ម៉ាត់ឆាឡាតេ",
    nameEn: "Matcha Latte",
    category: "non-coffee",
    image: "/drinks/matcha-latte.png",
    prices: {
      regular: { riel: 7000, usd: 1.75 },
      large: { riel: 8000, usd: 2.00 },
    },
    tag: "Best Seller",
    description: "Finely ground Japanese green tea whisked with creamy milk",
  },
  {
    id: "oreo-matcha-latte",
    nameKh: "ម៉ាត់ឆាឡាតេអូរីអូ",
    nameEn: "Oreo Matcha Latte",
    category: "non-coffee",
    image: "/drinks/oreo-matcha-latte.png",
    prices: {
      regular: { riel: 7000, usd: 1.75 },
      large: { riel: 8000, usd: 2.00 },
    },
    description: "Rich matcha latte layered with crunchy crushed Oreo cookies",
  },
  {
    id: "strawberry-matcha-latte",
    nameKh: "ម៉ាត់ឆាឡាតេស្ត្របឺរី",
    nameEn: "Strawberry Matcha Latte",
    category: "non-coffee",
    image: "/drinks/strawberry-matcha-latte.png",
    prices: {
      regular: { riel: 7000, usd: 1.75 },
      large: { riel: 8000, usd: 2.00 },
    },
    tag: "Trending",
    description: "Sweet homemade strawberry purée topped with fresh milk and green matcha",
  },
  {
    id: "strawberry-milk",
    nameKh: "ទឹកដោះគោស្ត្របឺរី",
    nameEn: "Strawberry Milk",
    category: "non-coffee",
    image: "/drinks/strawberry-milk.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Sweet strawberry syrup blended into cold fresh milk",
  },
  {
    id: "passion-fruit-milk",
    nameKh: "ទឹកដោះគោផាសិន",
    nameEn: "Passion Fruit Milk",
    category: "non-coffee",
    image: "/drinks/passion-fruit-milk.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Tangy tropical passion fruit balanced with smooth sweet milk",
  },
  {
    id: "chocolate-milk",
    nameKh: "ទឹកដោះគោសូកូឡា",
    nameEn: "Chocolate Milk",
    category: "non-coffee",
    image: "/drinks/chocolate-milk.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Classic rich dark chocolate blended with velvety fresh milk",
  },

  // --- HOT COFFEE ---
  {
    id: "hot-latte",
    nameKh: "ឡាតេក្តៅ",
    nameEn: "Hot latte",
    category: "hot-coffee",
    image: "/drinks/hot-latte.png",
    prices: {
      regular: { riel: 5500, usd: 1.35 },
    },
    description: "Freshly pulled espresso with steamed silky milk and latte art",
  },
  {
    id: "hot-cappuccino",
    nameKh: "កាពូឈីណូក្តៅ",
    nameEn: "Hot Cappucino",
    category: "hot-coffee",
    image: "/drinks/hot-cappuccino.png",
    prices: {
      regular: { riel: 5500, usd: 1.35 },
    },
    description: "Equal parts espresso, steamed milk, and dense creamy foam",
  },
  {
    id: "hot-americano",
    nameKh: "អាមេរិកាណូក្តៅ",
    nameEn: "Hot Americano",
    category: "hot-coffee",
    image: "/drinks/hot-americano.png",
    prices: {
      regular: { riel: 5000, usd: 1.25 },
    },
    description: "Clean and aromatic hot double espresso diluted with hot water",
  },
  {
    id: "hot-chocolate",
    nameKh: "សូកូឡាក្តៅ",
    nameEn: "Hot Chocolate",
    category: "hot-coffee",
    image: "/drinks/hot-chocolate.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
    },
    description: "Melted dark cocoa combined with warm frothy milk",
  },
  {
    id: "hot-matcha",
    nameKh: "ម៉ាត់ឆាក្តៅ",
    nameEn: "Hot Matcha",
    category: "hot-coffee",
    image: "/drinks/hot-matcha.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
    },
    description: "Soothing premium hot green tea latte with subtle earthy notes",
  },
  {
    id: "hot-mocha",
    nameKh: "ម៉ូកាក្តៅ",
    nameEn: "Hot Mocha",
    category: "hot-coffee",
    image: "/drinks/hot-mocha.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
    },
    description: "Espresso and warm chocolate topped with steamed milk foam",
  },

  // --- FRAPPES ---
  {
    id: "chocolate-frappe",
    nameKh: "សូកូឡាក្រឡុក",
    nameEn: "Chocolate Frappé",
    category: "frappes",
    image: "/drinks/chocolate-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    tag: "Popular",
    description: "Decadent chocolate blended with crushed ice and creamy milk",
  },
  {
    id: "passion-fruit-frappe",
    nameKh: "ផាសិនក្រឡុក",
    nameEn: "Passion Fruit Frappé",
    category: "frappes",
    image: "/drinks/passion-fruit-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    description: "Zesty fresh passion fruit blended into an ice-cold slush",
  },
  {
    id: "mocha-frappe",
    nameKh: "ម៉ូកាក្រឡុក",
    nameEn: "Mocha Frappé",
    category: "frappes",
    image: "/drinks/mocha-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    description: "Coffee and chocolate blended frosty smooth",
  },
  {
    id: "coffee-frappe",
    nameKh: "កាហ្វេក្រឡុក",
    nameEn: "Coffee Frappé",
    category: "frappes",
    image: "/drinks/coffee-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    description: "Robust roast coffee blended with sweet milk and fine ice",
  },
  {
    id: "strawberry-frappe",
    nameKh: "ស្ត្របឺរីក្រឡុក",
    nameEn: "Strawberry Frappé",
    category: "frappes",
    image: "/drinks/strawberry-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    description: "Luscious strawberry blended frappé bursting with berry flavor",
  },
  {
    id: "blueberry-frappe",
    nameKh: "ប៊ឺរីខៀវក្រឡុក",
    nameEn: "Blueberry Frappé",
    category: "frappes",
    image: "/drinks/blueberry-frappe.png",
    prices: {
      regular: { riel: 8500, usd: 2.10 },
    },
    description: "Deep blueberry fruit blended icy refreshingly sweet",
  },
  {
    id: "jasmine-passion-cream",
    nameKh: "ផ្កាម្លិះ / ក្រូចវល្លិ៍គ្រីម",
    nameEn: "Jasmine/Passion Cream",
    category: "frappes",
    image: "/drinks/jasmine-passion-cream.png",
    prices: {
      regular: { riel: 7000, usd: 1.75 },
      large: { riel: 8000, usd: 2.00 },
    },
    tag: "Specialty",
    description: "Floral jasmine and passion fruit topped with sweet creamy velvet",
  },

  // --- TEA ---
  {
    id: "green-tea",
    nameKh: "តែបៃតង",
    nameEn: "Green Tea",
    category: "tea",
    image: "/drinks/green-tea.png",
    prices: {
      regular: { riel: 6500, usd: 1.60 },
      large: { riel: 7500, usd: 1.85 },
    },
    tag: "Popular",
    description: "Authentic fragrant green tea served cold and crisp over ice",
  },
  {
    id: "lemon-tea",
    nameKh: "តែក្រូចឆ្មា",
    nameEn: "Lemon Tea",
    category: "tea",
    image: "/drinks/lemon-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Zesty freshly squeezed lemon infused with brewed tea",
  },
  {
    id: "passion-fruit-tea",
    nameKh: "តែផាសិន",
    nameEn: "Passion Fruit Tea",
    category: "tea",
    image: "/drinks/passion-fruit-tea.png",
    prices: {
      regular: { riel: 6500, usd: 1.60 },
      large: { riel: 7500, usd: 1.80 },
    },
    description: "Sweet-tart passion fruit nectar steeped with fresh tea",
  },
  {
    id: "jasmine-tea",
    nameKh: "តែផ្កាម្លិះ",
    nameEn: "Jasmine Tea",
    category: "tea",
    image: "/drinks/jasmine-tea.png",
    prices: {
      regular: { riel: 5500, usd: 1.35 },
      large: { riel: 6000, usd: 1.50 },
    },
    description: "Delicate and aromatic floral tea leaves brewed to perfection",
  },
  {
    id: "strawberry-jasmine-tea",
    nameKh: "តែផ្កាម្លិះស្ត្របឺរី",
    nameEn: "Strawberry Jasmine Tea",
    category: "tea",
    image: "/drinks/strawberry-jasmine-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Ripe strawberry essence infused into fragrant jasmine tea",
  },
  {
    id: "blueberry-jasmine-tea",
    nameKh: "តែផ្កាម្លិះប៊្លូបឺរី",
    nameEn: "Blueberry Jasmine Tea",
    category: "tea",
    image: "/drinks/blueberry-jasmine-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 7000, usd: 1.75 },
    },
    description: "Juicy blueberry notes swirled with fragrant iced jasmine tea",
  },
  {
    id: "jasmine-milk-tea",
    nameKh: "តែទឹកដោះគោផ្កាម្លិះ",
    nameEn: "Jasmine Milk Tea",
    category: "tea",
    image: "/drinks/jasmine-milk-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    tag: "Favorite",
    description: "Aromatic jasmine green tea blended with smooth, creamy milk",
  },
  {
    id: "black-tea",
    nameKh: "តែខ្មៅ",
    nameEn: "Black Tea",
    category: "tea",
    image: "/drinks/black-tea.png",
    prices: {
      regular: { riel: 5500, usd: 1.35 },
      large: { riel: 6000, usd: 1.50 },
    },
    description: "Full-bodied robust Ceylon black tea served over crystal ice",
  },
  {
    id: "milk-tea",
    nameKh: "តែទឹកដោះគោ",
    nameEn: "Milk Tea",
    category: "tea",
    image: "/drinks/milk-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    tag: "Classic",
    description: "Traditional sweet and rich milk tea with a velvety finish",
  },
  {
    id: "honey-black-tea",
    nameKh: "តែខ្មៅទឹកឃ្មុំ",
    nameEn: "Honey Black Tea",
    category: "tea",
    image: "/drinks/honey-black-tea.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    description: "Golden wild honey stirred into robust chilled black tea",
  },

  // --- SODA ---
  {
    id: "blueberry-soda",
    nameKh: "សូដាប៊ឺរីខៀវ",
    nameEn: "Blueberry Soda",
    category: "soda",
    image: "/drinks/blueberry-soda.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    description: "Sparkling soda loaded with deep blueberry syrup and mint ice",
  },
  {
    id: "strawberry-soda",
    nameKh: "សូដាស្ត្របឺរី",
    nameEn: "Strawberry Soda",
    category: "soda",
    image: "/drinks/strawberry-soda.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    description: "Crisp sparkling soda bursting with sweet strawberry fizz",
  },
  {
    id: "passion-soda",
    nameKh: "សូដាក្រូចវល្លិ៍",
    nameEn: "Passion soda",
    category: "soda",
    image: "/drinks/passion-soda.png",
    prices: {
      regular: { riel: 6000, usd: 1.50 },
      large: { riel: 6500, usd: 1.60 },
    },
    tag: "Refreshing",
    description: "Tart passion fruit syrup combined with bubbly chilled soda water",
  },
];
