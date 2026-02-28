export interface PersistentItem {
  id: string;
  name: string;
  cost: number;
  useCustomMarkup: boolean;
  customMarkup: number;
}

export interface QuoteItem {
  itemId: string;
  quantity: number;
}

export interface SavedQuote {
  id: string;
  name: string;
  date: string;
  items: QuoteItem[];
  laborHours: number;
  totalPrice: number;
}

export interface AppSettings {
  targetHourly: number;
  wages: number[];
  globalMarkup: number;
  persistentItems: PersistentItem[];
  savedQuotes: SavedQuote[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  targetHourly: 100,
  wages: [25],
  globalMarkup: 20,
  persistentItems: [],
  savedQuotes: [],
};
