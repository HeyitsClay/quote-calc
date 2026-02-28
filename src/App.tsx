import React, { useState, useEffect, useMemo } from 'react';
import * as Ariakit from "@ariakit/react";
import { DEFAULT_SETTINGS } from './types';
import type { AppSettings, QuoteItem, SavedQuote, PersistentItem } from './types';
import { calculateLaborCost, calculateLaborPrice, calculateMaterials, generateId } from './utils';
import { Button, Input, Card, Toast } from './components/Shared';
import './App.css';

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('quote_builder_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [laborHours, setLaborHours] = useState<number>(() => {
    const saved = localStorage.getItem('quote_builder_hours');
    return saved ? Number(saved) : 0;
  });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() => {
    const saved = localStorage.getItem('quote_builder_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [quoteName, setQuoteName] = useState<string>(() => {
    return localStorage.getItem('quote_builder_name') || '';
  });
  const [searchValue, setSearchValue] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const filteredItems = useMemo(() => {
    return settings.persistentItems.filter(item => 
      item.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [settings.persistentItems, searchValue]);

  const addToast = (message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    localStorage.setItem('quote_builder_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('quote_builder_hours', laborHours.toString());
    localStorage.setItem('quote_builder_items', JSON.stringify(quoteItems));
    localStorage.setItem('quote_builder_name', quoteName);
  }, [laborHours, quoteItems, quoteName]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // --- Calculations ---
  const laborCost = useMemo(() => calculateLaborCost(settings.wages, laborHours), [settings.wages, laborHours]);
  const laborPrice = useMemo(() => calculateLaborPrice(laborHours, settings.targetHourly), [laborHours, settings.targetHourly]);
  const laborProfit = laborPrice - laborCost;

  const materials = useMemo(() => calculateMaterials(quoteItems, settings.persistentItems, settings.globalMarkup), [quoteItems, settings.persistentItems, settings.globalMarkup]);
  const materialProfit = materials.price - materials.cost;
  
  const totalPrice = laborPrice + materials.price;
  const totalCost = laborCost + materials.cost;
  const totalProfit = totalPrice - totalCost;
  const margin = totalPrice > 0 ? (totalProfit / totalPrice) * 100 : 0;

  // --- Handlers ---
  const handleAddPersistentItem = () => {
    const newItem: PersistentItem = { id: generateId(), name: 'New Item', cost: 0, useCustomMarkup: false, customMarkup: 0 };
    updateSettings({ persistentItems: [...settings.persistentItems, newItem] });
  };

  const handleUpdatePersistentItem = (id: string, updates: Partial<PersistentItem>) => {
    updateSettings({
      persistentItems: settings.persistentItems.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const handleDeletePersistentItem = (id: string) => {
    updateSettings({ persistentItems: settings.persistentItems.filter(item => item.id !== id) });
  };

  const handleAddToQuote = (itemId: string) => {
    setQuoteItems([...quoteItems, { itemId, quantity: 1 }]);
  };

  const handleSaveQuote = () => {
    if (!quoteName) {
      addToast('Please enter a quote name.');
      return;
    }
    const newQuote: SavedQuote = {
      id: generateId(),
      name: quoteName,
      date: new Date().toLocaleDateString(),
      items: [...quoteItems],
      laborHours,
      totalPrice
    };
    updateSettings({ savedQuotes: [newQuote, ...settings.savedQuotes] });
    setQuoteName('');
    addToast('Quote saved to history!');
  };

  const handleClearQuote = () => {
    if (confirm('Are you sure you want to clear the current quote? This cannot be undone.')) {
      setQuoteName('');
      setQuoteItems([]);
      setLaborHours(0);
      addToast('Quote cleared.');
    }
  };

  return (
    <div className="app-container">
      <Ariakit.TabProvider defaultSelectedId="quote">
        <Ariakit.TabList className="tabs" aria-label="Main Navigation">
          <Ariakit.Tab id="quote" className="tab-btn">Quote</Ariakit.Tab>
          <Ariakit.Tab id="history" className="tab-btn">History</Ariakit.Tab>
          <Ariakit.Tab id="settings" className="tab-btn">Settings</Ariakit.Tab>
        </Ariakit.TabList>

        <main className="content">
          <Ariakit.TabPanel tabId="quote">
            <Card title="Labor & Time">
              <div style={{ display: 'flex', width: '100%', marginBottom: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Cost</div>
                  <div className="mono-val danger" style={{ fontSize: '0.85rem' }}>${laborCost.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Profit</div>
                  <div className="mono-val success" style={{ fontSize: '0.85rem' }}>${laborProfit.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Total</div>
                  <div className="mono-val bold" style={{ fontSize: '0.85rem' }}>${laborPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="divider" style={{ marginBottom: '1.5rem' }} />
              <div className="flex-center">
                <div style={{ width: '85px' }}>
                  <Input 
                    label="Hours" 
                    type="number" 
                    className="input-lg"
                    containerClassName="text-center"
                    value={laborHours || ''} 
                    onChange={e => setLaborHours(Number(e.target.value))} 
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
            </Card>

            <Card title="Materials">
              {quoteItems.length > 0 && (
                <>
                  <div style={{ display: 'flex', width: '100%', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Materials Cost</div>
                      <div className="mono-val danger" style={{ fontSize: '0.85rem' }}>${materials.cost.toFixed(2)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Materials Profit</div>
                      <div className="mono-val success" style={{ fontSize: '0.85rem' }}>${materialProfit.toFixed(2)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Materials Total</div>
                      <div className="mono-val bold" style={{ fontSize: '0.85rem' }}>${materials.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="divider" style={{ marginBottom: '1rem' }} />
                </>
              )}

              <Ariakit.ComboboxProvider 
                value={searchValue}
                setValue={(val) => {
                  // If the value matches an item name exactly, it's a selection
                  const selectedItem = settings.persistentItems.find(i => i.name === val);
                  if (selectedItem) {
                    handleAddToQuote(selectedItem.id);
                    setSearchValue(''); // Clear immediately
                  } else {
                    setSearchValue(val); // Otherwise just update typing
                  }
                }}
              >
                <div className="input-container">
                  <Ariakit.Combobox 
                    placeholder="Add Item from Library..." 
                    className="select-trigger" 
                  />
                </div>
                <Ariakit.ComboboxPopover gutter={4} sameWidth className="select-popover">
                  {filteredItems.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <Ariakit.ComboboxItem 
                        value={item.name} 
                        className="combobox-item"
                      >
                        {item.name} (${item.cost.toFixed(2)})
                      </Ariakit.ComboboxItem>
                      {idx < filteredItems.length - 1 && <Ariakit.ComboboxSeparator className="combobox-separator" />}
                    </React.Fragment>
                  ))}
                  {filteredItems.length === 0 && <div className="combobox-item">No items found</div>}
                </Ariakit.ComboboxPopover>
              </Ariakit.ComboboxProvider>

              <div className="items-list" style={{ marginTop: '1rem' }}>
                {quoteItems.map((qItem, idx) => {
                  const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
                  if (!pItem) return null;
                  const itemCost = pItem.cost * qItem.quantity;
                  const markup = pItem.useCustomMarkup ? pItem.customMarkup : settings.globalMarkup;
                  const itemPrice = itemCost * (1 + markup / 100);
                  return (
                    <div key={idx} className="item-row align-center">
                      <div className="item-name-col">
                        <span className="item-name">{pItem.name}</span>
                        <span className="item-subtext">Base: ${pItem.cost.toFixed(2)} | {markup}%</span>
                      </div>
                      <div className="item-meta-col">
                        <Input 
                          type="number" 
                          value={qItem.quantity} 
                          className="input-qty mobile-width-qty"
                          containerClassName="no-margin"
                          style={{ width: '75px', textAlign: 'center' }}
                          onChange={e => {
                            const next = [...quoteItems];
                            next[idx].quantity = Number(e.target.value);
                            setQuoteItems(next);
                          }}
                        />
                        <div className="mobile-min-width-stack" style={{ textAlign: 'right', minWidth: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                          <div style={{ fontSize: '0.75rem' }}>
                            <span className="item-subtext">
                              <span className="hide-mobile">Cost:</span>
                              <span className="show-mobile">C:</span>
                            </span> <span className="mono-val danger">${itemCost.toFixed(2)}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem' }}>
                            <span className="item-subtext">
                              <span className="hide-mobile">Profit:</span>
                              <span className="show-mobile">P:</span>
                            </span> <span className="mono-val success">${(itemPrice - itemCost).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mobile-min-width-total" style={{ textAlign: 'right', minWidth: '100px' }}>
                           <div className="item-subtext">Total Price</div>
                           <div className="mono-val bold">${itemPrice.toFixed(2)}</div>
                        </div>
                        <Button variant="danger" size="sm" className="btn-icon" onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}>✕</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Summary" className="summary-card">
              <div style={{ display: 'flex', width: '100%', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Material Cost</div>
                  <div className="mono-val danger" style={{ fontSize: '0.85rem' }}>${materials.cost.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Material Profit</div>
                  <div className="mono-val success" style={{ fontSize: '0.85rem' }}>${materialProfit.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Material Total</div>
                  <div className="mono-val bold" style={{ fontSize: '0.85rem' }}>${materials.price.toFixed(2)}</div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', width: '100%', marginBottom: '1rem', marginTop: '0.75rem' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Cost</div>
                  <div className="mono-val danger" style={{ fontSize: '0.85rem' }}>${laborCost.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Profit</div>
                  <div className="mono-val success" style={{ fontSize: '0.85rem' }}>${laborProfit.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="item-subtext" style={{ fontSize: '0.65rem' }}>Labor Total</div>
                  <div className="mono-val bold" style={{ fontSize: '0.85rem' }}>${laborPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', width: '100%', marginTop: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext">Net Profit</div>
                  <div className="mono-val success bold" style={{ fontSize: '1.6rem' }}>${totalProfit.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="item-subtext">Margin</div>
                  <div className="mono-val success bold" style={{ fontSize: '1.6rem' }}>{margin.toFixed(1)}%</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="item-subtext">Total Amount</div>
                  <div className="mono-val bold" style={{ fontSize: '1.6rem' }}>${totalPrice.toFixed(2)}</div>
                </div>
              </div>
            </Card>

            <Card title="Save or Export">
              <div className="flex-row no-margin align-center">
                <Input 
                  placeholder="Quote Name..." 
                  value={quoteName} 
                  onChange={e => setQuoteName(e.target.value)} 
                  containerClassName="flex-1 no-margin"
                />
                <Button onClick={handleSaveQuote} variant="primary">Save Quote</Button>
              </div>
              <Button 
                variant="secondary" 
                className="full-width" 
                style={{ marginTop: '10px' }} 
                onClick={() => {
                  const materialDetails = quoteItems.map(qi => {
                    const p = settings.persistentItems.find(i => i.id === qi.itemId);
                    if (!p) return '';
                    const cost = p.cost * qi.quantity;
                    const markup = p.useCustomMarkup ? p.customMarkup : settings.globalMarkup;
                    const price = cost * (1 + markup / 100);
                    return `[${qi.quantity}x] ${p.name}\n    Cost: $${cost.toFixed(2)} | Profit: $${(price - cost).toFixed(2)} | Total: $${price.toFixed(2)}`;
                  }).filter(Boolean).join('\n');

                  const summary = [
                    `--- QUOTE SUMMARY (${new Date().toLocaleDateString()}) ---`,
                    `TOTAL AMOUNT: $${totalPrice.toFixed(2)}`,
                    `NET PROFIT:   $${totalProfit.toFixed(2)} (${margin.toFixed(1)}%)`,
                    '',
                    `--- LABOR & TIME ---`,
                    `Hours:        ${laborHours}`,
                    `Labor Cost:   $${laborCost.toFixed(2)}`,
                    `Labor Profit: $${laborProfit.toFixed(2)}`,
                    `Labor Total:  $${laborPrice.toFixed(2)}`,
                    '',
                    `--- MATERIALS ---`,
                    materialDetails || 'No materials added.',
                    '',
                    `Materials Cost:   $${materials.cost.toFixed(2)}`,
                    `Materials Profit: $${materialProfit.toFixed(2)}`,
                    `Materials Total:  $${materials.price.toFixed(2)}`,
                  ].join('\n');

                  navigator.clipboard.writeText(summary);
                  addToast('Detailed summary copied to clipboard!');
                }}
              >
                Export to Clipboard
              </Button>
            </Card>

            <Card>
              <Button 
                variant="danger" 
                className="full-width" 
                onClick={handleClearQuote}
              >
                Clear Quote
              </Button>
            </Card>
          </Ariakit.TabPanel>

          <Ariakit.TabPanel tabId="history">
            <Card title="Saved Quotes">
              <div className="items-list">
                {settings.savedQuotes.length === 0 && (
                  <div className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>No saved quotes yet.</div>
                )}
                {settings.savedQuotes.map(quote => (
                  <div 
                    key={quote.id} 
                    className="item-row align-center" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setQuoteItems(quote.items);
                      setLaborHours(quote.laborHours);
                      setQuoteName(quote.name);
                      addToast(`Loaded quote: ${quote.name}`);
                    }}
                  >
                    <div className="item-name-col">
                      <span className="item-name">{quote.name}</span>
                      <span className="item-subtext">{quote.date} • {quote.laborHours} hrs • {quote.items.length} items</span>
                    </div>
                    <div className="item-meta-col">
                      <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                        <div className="item-subtext">Total Amount</div>
                        <div className="mono-val bold">${quote.totalPrice.toFixed(2)}</div>
                      </div>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        className="btn-icon" 
                        onClick={(e) => {
                          e.stopPropagation(); // Don't load the quote when deleting
                          updateSettings({ savedQuotes: settings.savedQuotes.filter(q => q.id !== quote.id) });
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Ariakit.TabPanel>

          <Ariakit.TabPanel tabId="settings">
            <Card 
              title="Global Pricing & Labor" 
              actions={<Button variant="secondary" size="sm" onClick={() => updateSettings({ wages: [...settings.wages, 0] })}>+ Add Wage</Button>}
            >
              <div className="hud-grid grid-divider">
                <div className="pricing-left">
                  <div>
                    <Input 
                      label="Target Hourly Rate" 
                      type="number" 
                      className="w-3-digit"
                      prefix="$"
                      value={settings.targetHourly} 
                      onChange={e => updateSettings({ targetHourly: Number(e.target.value) })}
                    />
                    <Input 
                      label="Global Markup (%)" 
                      type="number" 
                      className="w-3-digit"
                      value={settings.globalMarkup} 
                      onChange={e => updateSettings({ globalMarkup: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="labor-right">
                  <div>
                    <div className="field-group">
                      <label className="field-label">Labor Wages</label>
                      <div className="items-list">
                        {settings.wages.map((wage, idx) => (
                          <div key={idx} className="flex-row no-margin align-center" style={{ gap: '8px', marginBottom: '8px' }}>
                            <Input
                              type="number"
                              value={wage}
                              className="w-3-digit"
                              prefix="$"
                              onChange={e => {
                                const next = [...settings.wages];
                                next[idx] = Number(e.target.value);
                                updateSettings({ wages: next });
                              }}
                              style={{ marginBottom: 0 }}
                            />
                            <Button variant="danger" size="sm" className="btn-icon" onClick={() => updateSettings({ wages: settings.wages.filter((_, i) => i !== idx) })}>✕</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>              </div>
            </Card>

            <Card title="Item Library" actions={<Button variant="secondary" size="sm" onClick={handleAddPersistentItem}>+ Add Item</Button>}>
              <div className="items-list">
                {settings.persistentItems.map(item => (
                  <div key={item.id} className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
                    <div className="flex-row align-center" style={{ marginBottom: '24px', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <Input 
                          placeholder="Item Name" 
                          value={item.name} 
                          onChange={e => handleUpdatePersistentItem(item.id, { name: e.target.value })}
                          containerClassName="no-margin"
                        />
                      </div>
                      <Button variant="danger" size="sm" className="btn-icon" onClick={() => handleDeletePersistentItem(item.id)}>✕</Button>
                    </div>
                    <div className="hud-grid">
                      <Input 
                        label="Cost" 
                        type="number" 
                        prefix="$"
                        value={item.cost || ''} 
                        onChange={e => handleUpdatePersistentItem(item.id, { cost: Number(e.target.value) })}
                      />
                      <div className="field-group">
                        <Ariakit.CheckboxProvider 
                          value={item.useCustomMarkup} 
                          setValue={val => handleUpdatePersistentItem(item.id, { useCustomMarkup: !!val })}
                        >
                          <Ariakit.Checkbox render={<label className="checkbox-row" />}>
                            <Ariakit.CheckboxCheck className="checkbox" />
                            <span className="field-label" style={{ marginBottom: 0 }}>Custom Markup</span>
                          </Ariakit.Checkbox>
                        </Ariakit.CheckboxProvider>
                        {item.useCustomMarkup ? (
                          <input 
                            className="input-field" 
                            type="number" 
                            value={item.customMarkup} 
                            onChange={e => handleUpdatePersistentItem(item.id, { customMarkup: Number(e.target.value) })}
                          />
                        ) : (
                          <input className="input-field input-dimmed" value={`${settings.globalMarkup}% (Global)`} disabled />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Data Management">
              <div className="text-dim" style={{ marginBottom: '1rem' }}>
                Backup or transfer your item library and pricing settings via the clipboard.
              </div>
              <div className="flex-row no-margin">
                <Button 
                  variant="secondary" 
                  className="full-width" 
                  onClick={() => {
                    const data = JSON.stringify(settings, null, 2);
                    navigator.clipboard.writeText(data);
                    addToast('Settings copied to clipboard!');
                  }}
                >
                  Export Settings
                </Button>
                <Button 
                  variant="secondary" 
                  className="full-width" 
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const parsed = JSON.parse(text);
                      if (parsed && typeof parsed === 'object' && 'targetHourly' in parsed) {
                        if (confirm('Importing will overwrite your current settings and item library. Continue?')) {
                          setSettings(parsed);
                          addToast('Settings imported successfully!');
                        }
                      } else {
                        addToast('Invalid settings data in clipboard.');
                      }
                    } catch (err) {
                      addToast('Failed to read from clipboard.');
                    }
                  }}
                >
                  Import Settings
                </Button>
              </div>
            </Card>
          </Ariakit.TabPanel>
        </main>
      </Ariakit.TabProvider>

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} />
        ))}
      </div>
    </div>
  );
}

export default App;
