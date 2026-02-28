import { useState, useEffect } from 'react';
import './App.css';

interface PersistentItem {
  id: string;
  name: string;
  cost: number;
  useCustomMarkup: boolean;
  customMarkup: number;
}

interface SavedQuote {
  id: string;
  name: string;
  date: string;
  items: QuoteItem[];
  laborHours: number;
  totalPrice: number;
}

interface AppSettings {
  targetHourly: number;
  wages: number[];
  globalMarkup: number;
  persistentItems: PersistentItem[];
  savedQuotes: SavedQuote[];
}

interface QuoteItem {
  itemId: string;
  quantity: number;
  customName?: string;
  customCost?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  targetHourly: 100,
  wages: [25],
  globalMarkup: 20,
  persistentItems: [],
  savedQuotes: [],
};

function App() {
  const [activeTab, setActiveTab] = useState<'quote' | 'settings' | 'history'>('quote');
  const [showNudge, setShowNudge] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('quote_builder_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.savedQuotes) parsed.savedQuotes = [];
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  const [laborHours, setLaborHours] = useState<number>(0);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteName, setQuoteName] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('quote_builder_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !isStandalone) setShowNudge(true);
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const addPersistentItem = () => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const newItem: PersistentItem = { id, name: '', cost: 0, useCustomMarkup: false, customMarkup: 0 };
    updateSettings({ persistentItems: [...settings.persistentItems, newItem] });
  };

  const updatePersistentItem = (id: string, updates: Partial<PersistentItem>) => {
    updateSettings({
      persistentItems: settings.persistentItems.map(item => item.id === id ? { ...item, ...updates } : item),
    });
  };

  const removePersistentItem = (id: string) => {
    if (confirm('Delete this item?')) {
      updateSettings({ persistentItems: settings.persistentItems.filter(item => item.id !== id) });
    }
  };

  const addWage = () => updateSettings({ wages: [...settings.wages, 0] });
  const updateWage = (index: number, val: number) => {
    const newWages = [...settings.wages];
    newWages[index] = val;
    updateSettings({ wages: newWages });
  };
  const removeWage = (index: number) => {
    if (confirm('Remove wage?')) updateSettings({ wages: settings.wages.filter((_, i) => i !== index) });
  };

  const addToQuote = (itemId: string) => setQuoteItems([...quoteItems, { itemId, quantity: 1 }]);
  const updateQuoteItemQuantity = (index: number, quantity: number) => {
    const newItems = [...quoteItems];
    newItems[index].quantity = quantity;
    setQuoteItems(newItems);
  };
  const removeFromQuote = (index: number) => setQuoteItems(quoteItems.filter((_, i) => i !== index));

  const calculateLaborCost = () => {
    if (settings.wages.length === 0 || laborHours === 0) return 0;
    return settings.wages.reduce((total, wage) => total + (wage * (laborHours / settings.wages.length)), 0);
  };

  const calculateMaterialTotals = () => {
    let cost = 0; let price = 0;
    quoteItems.forEach(qItem => {
      const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
      if (!pItem) return;
      const itemCost = pItem.cost * qItem.quantity;
      const markup = pItem.useCustomMarkup ? pItem.customMarkup : settings.globalMarkup;
      const itemPrice = itemCost * (1 + markup / 100);
      cost += itemCost; price += itemPrice;
    });
    return { cost, price };
  };

  const laborCost = calculateLaborCost();
  const laborPrice = laborHours * settings.targetHourly;
  const materials = calculateMaterialTotals();
  const totalPrice = laborPrice + materials.price;
  const profit = totalPrice - (laborCost + materials.cost);
  const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

  const saveCurrentQuote = () => {
    if (!quoteName.trim()) return alert('Enter a name');
    const newSavedQuote: SavedQuote = {
      id: Math.random().toString(36).substring(2, 9),
      name: quoteName,
      date: new Date().toLocaleDateString(),
      items: [...quoteItems],
      laborHours,
      totalPrice: materials.price + laborPrice,
    };
    updateSettings({ savedQuotes: [newSavedQuote, ...settings.savedQuotes] });
    setQuoteName('');
    alert('Saved');
  };

  const loadSavedQuote = (quote: SavedQuote) => {
    setQuoteItems(quote.items);
    setLaborHours(quote.laborHours);
    setQuoteName(quote.name);
    setActiveTab('quote');
  };

  const deleteSavedQuote = (id: string) => {
    if (confirm('Delete this quote?')) {
      updateSettings({ savedQuotes: settings.savedQuotes.filter(q => q.id !== id) });
    }
  };

  const exportQuoteToText = () => {
    let text = `[LABOR]\n- Hours: ${laborHours}\n- Price: $${laborPrice.toFixed(2)}\n\n[MATERIALS]\n`;
    quoteItems.forEach(qItem => {
      const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
      if (pItem) text += `- ${pItem.name}: x${qItem.quantity}\n`;
    });
    text += `\n[TOTAL]: $${totalPrice.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    alert('Copied');
  };

  return (
    <div className="app-container">
      {showNudge && (
        <div className="install-nudge">
          <p>Install App: Tap <b>Share</b> then <b>'Add to Home Screen'</b></p>
          <button className="btn-danger" onClick={() => setShowNudge(false)}></button>
        </div>
      )}
      <nav className="tabs">
        <button className={activeTab === 'quote' ? 'active' : ''} onClick={() => setActiveTab('quote')}>Quote</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>Saved</button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
      </nav>

      <main className="content">
        {activeTab === 'quote' ? (
          <div className="view">
            <section className="card">
              <h3>Labor Cost</h3>
              <div className="hud-row">
                <label>Total Hours</label>
                <input type="number" value={laborHours || ''} onChange={(e) => setLaborHours(Number(e.target.value))} />
              </div>
              <div className="hud-data-list">
                <div className="hud-data-row"><span>Wages:</span><span className="mono">${laborCost.toFixed(2)}</span></div>
                <div className="hud-data-row"><span>Billable:</span><span className="mono">${laborPrice.toFixed(2)}</span></div>
              </div>
            </section>

            <section className="card">
              <h3>Materials / Items</h3>
              <div className="input-group">
                <select onChange={(e) => { if (e.target.value) { addToQuote(e.target.value); e.target.value = ''; } }}>
                  <option value="">Add from library...</option>
                  {settings.persistentItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="items-list">
                {quoteItems.map((qItem, idx) => {
                  const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
                  if (!pItem) return null;
                  return (
                    <div key={idx} className="quote-item-row">
                      <span className="name">{pItem.name}</span>
                      <div className="actions">
                        <input type="number" value={qItem.quantity} onChange={(e) => updateQuoteItemQuantity(idx, Number(e.target.value))} />
                        <button className="btn-danger" onClick={() => removeFromQuote(idx)}></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card summary-card">
              <h3>Total Summary</h3>
              <div className="hud-data-list">
                <div className="hud-data-row"><span>Material Cost:</span><span className="mono">${materials.cost.toFixed(2)}</span></div>
                <div className="hud-data-row"><span>Material Price:</span><span className="mono">${materials.price.toFixed(2)}</span></div>
                <hr/>
                <div className="hud-data-row highlight"><span>Total Quote:</span><span className="mono cyan">${totalPrice.toFixed(2)}</span></div>
                <div className="hud-data-row"><span>Net Profit:</span><span className="mono success">${profit.toFixed(2)}</span></div>
                <div className="hud-data-row"><span>Margin:</span><span className="mono success">{margin.toFixed(1)}%</span></div>
              </div>
              <div className="footer-actions">
                <div className="save-row">
                  <input type="text" placeholder="Name this quote..." value={quoteName} onChange={(e) => setQuoteName(e.target.value)} />
                  <button className="btn-primary" onClick={saveCurrentQuote}>Save</button>
                </div>
                <button className="btn-secondary full-width" onClick={exportQuoteToText}>Export to Clipboard</button>
              </div>
            </section>
          </div>
        ) : activeTab === 'history' ? (
          <div className="view">
            <section className="card">
              <h3>Quote History</h3>
              <div className="history-list">
                {settings.savedQuotes.map(quote => (
                  <div key={quote.id} className="history-row">
                    <span onClick={() => loadSavedQuote(quote)}>{quote.name}</span>
                    <div className="meta">
                      <span className="mono cyan">${quote.totalPrice.toFixed(2)}</span>
                      <button className="btn-danger" onClick={() => deleteSavedQuote(quote.id)}></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="view">
            <section className="card">
              <h3>Global Settings</h3>
              <div className="hud-row">
                <label>Target Hourly ($)</label>
                <input type="number" value={settings.targetHourly} onChange={(e) => updateSettings({ targetHourly: Number(e.target.value) })} />
              </div>
              <div className="hud-row">
                <label>Global Markup (%)</label>
                <input type="number" value={settings.globalMarkup} onChange={(e) => updateSettings({ globalMarkup: Number(e.target.value) })} />
              </div>
            </section>

            <section className="card">
              <h3>Labor Wages</h3>
              {settings.wages.map((wage, idx) => (
                <div key={idx} className="hud-row">
                  <label>Hourly {idx + 1}</label>
                  <div className="wage-input">
                    <input type="number" value={wage} onChange={(e) => updateWage(idx, Number(e.target.value))} />
                    <button className="btn-danger" onClick={() => removeWage(idx)}></button>
                  </div>
                </div>
              ))}
              <button className="btn-secondary" onClick={addWage}>+ Add Wage</button>
            </section>

            <section className="card">
              <h3>Line Items</h3>
            {settings.persistentItems.map((item) => (
                <div key={item.id} className="item-editor-card">
                  <div className="header">
                    <span className="drag">⠿</span>
                    <input type="text" value={item.name} onChange={(e) => updatePersistentItem(item.id, { name: e.target.value })} placeholder="Item Name" />
                    <button className="btn-danger" onClick={() => removePersistentItem(item.id)}></button>
                  </div>
                  <div className="details">
                    <div className="input-group">
                      <label>Cost</label>
                      <input type="number" value={item.cost || ''} onChange={(e) => updatePersistentItem(item.id, { cost: Number(e.target.value) })} />
                    </div>
                    <div className="markup-group">
                      <label className="checkbox"><input type="checkbox" checked={item.useCustomMarkup} onChange={(e) => updatePersistentItem(item.id, { useCustomMarkup: e.target.checked })} />Markup %</label>
                      {item.useCustomMarkup && <input type="number" value={item.customMarkup} onChange={(e) => updatePersistentItem(item.id, { customMarkup: Number(e.target.value) })} />}
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn-secondary" onClick={addPersistentItem}>+ Add Item</button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
