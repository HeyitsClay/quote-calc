import type { PersistentItem, QuoteItem } from './types';

export const calculateLaborCost = (wages: number[], laborHours: number) => {
  if (wages.length === 0 || laborHours === 0) return 0;
  return wages.reduce((total, wage) => total + (wage * (laborHours / wages.length)), 0);
};

export const calculateLaborPrice = (laborHours: number, targetHourly: number) => {
  return laborHours * targetHourly;
};

export const calculateMaterials = (
  quoteItems: QuoteItem[],
  persistentItems: PersistentItem[],
  globalMarkup: number
) => {
  let cost = 0;
  let price = 0;
  quoteItems.forEach(qItem => {
    const pItem = persistentItems.find(i => i.id === qItem.itemId);
    if (!pItem) return;
    const itemCost = pItem.cost * qItem.quantity;
    const markup = pItem.useCustomMarkup ? pItem.customMarkup : globalMarkup;
    const itemPrice = itemCost * (1 + markup / 100);
    cost += itemCost;
    price += itemPrice;
  });
  return { cost, price };
};

export const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 9);
};
