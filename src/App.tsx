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
        // Migration: Ensure savedQuotes exists
        if (!parsed.savedQuotes) parsed.savedQuotes = [];
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to parse settings', e);
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
    // Check if it's already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                       || (window.navigator as any).standalone 
                       || document.referrer.includes('android-app://');

    // Only show on mobile browsers that aren't installed yet
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && !isStandalone) {
      setShowNudge(true);
    }
  }, []);

  // Settings Actions
  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const addPersistentItem = () => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 9);
      
    const newItem: PersistentItem = {
      id,
      name: '',
      cost: 0,
      useCustomMarkup: false,
      customMarkup: 0,
    };
    updateSettings({ persistentItems: [...settings.persistentItems, newItem] });
  };

  const updatePersistentItem = (id: string, updates: Partial<PersistentItem>) => {
    updateSettings({
      persistentItems: settings.persistentItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removePersistentItem = (id: string) => {
    if (confirm('Delete this item from your library?')) {
      updateSettings({
        persistentItems: settings.persistentItems.filter(item => item.id !== id),
      });
    }
  };

  const addWage = () => {
    updateSettings({ wages: [...settings.wages, 0] });
  };

  const updateWage = (index: number, val: number) => {
    const newWages = [...settings.wages];
    newWages[index] = val;
    updateSettings({ wages: newWages });
  };

  const removeWage = (index: number) => {
    updateSettings({ wages: settings.wages.filter((_, i) => i !== index) });
  };

  // Quote Actions
  const addToQuote = (itemId: string) => {
    setQuoteItems([...quoteItems, { itemId, quantity: 1 }]);
  };

  const updateQuoteItemQuantity = (index: number, quantity: number) => {
    const newItems = [...quoteItems];
    newItems[index].quantity = quantity;
    setQuoteItems(newItems);
  };

  const removeFromQuote = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const saveCurrentQuote = () => {
    if (!quoteName.trim()) {
      alert('Please enter a name for the quote');
      return;
    }

    const materials = calculateMaterialTotals();
    const laborP = laborHours * settings.targetHourly;
    
    const newSavedQuote: SavedQuote = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: quoteName,
      date: new Date().toLocaleDateString(),
      items: [...quoteItems],
      laborHours,
      totalPrice: materials.price + laborP,
    };

    updateSettings({ savedQuotes: [newSavedQuote, ...settings.savedQuotes] });
    setQuoteName('');
    alert('Quote saved!');
  };

  const loadSavedQuote = (quote: SavedQuote) => {
    setQuoteItems(quote.items);
    setLaborHours(quote.laborHours);
    setQuoteName(quote.name);
    setActiveTab('quote');
  };

  const deleteSavedQuote = (id: string) => {
    if (confirm('Are you sure you want to delete this saved quote?')) {
      updateSettings({
        savedQuotes: settings.savedQuotes.filter(q => q.id !== id)
      });
    }
  };

  const exportQuoteToText = () => {
    const laborP = laborHours * settings.targetHourly;
    
    let text = `[LABOR]\n`;
    text += `- Hours: ${laborHours}\n`;
    text += `- Rate: $${settings.targetHourly}/hr\n`;
    text += `- Labor Price: $${laborP.toFixed(2)}\n\n`;
    
    if (quoteItems.length > 0) {
      text += `[MATERIALS]\n`;
      quoteItems.forEach(qItem => {
        const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
        if (pItem) {
          const markup = pItem.useCustomMarkup ? pItem.customMarkup : settings.globalMarkup;
          const lineTotal = (pItem.cost * qItem.quantity) * (1 + markup / 100);
          text += `- ${pItem.name}: ${qItem.quantity} x $${pItem.cost} (+${markup}%) = $${lineTotal.toFixed(2)}\n`;
        }
      });
      text += `\n`;
    }
    
    text += `[TOTALS]\n`;
    text += `- Total Quote: $${totalPrice.toFixed(2)}\n`;
    text += `- Margin: ${margin.toFixed(1)}%\n`;

    navigator.clipboard.writeText(text);
    alert('Quote copied to clipboard as plain text!');
  };

  const exportSettings = () => {
    const data = JSON.stringify(settings);
    navigator.clipboard.writeText(data);
    alert('All settings and library items copied to clipboard!');
  };

  const importSettings = () => {
    const data = prompt('Paste your settings code here:');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.persistentItems && Array.isArray(parsed.persistentItems)) {
        setSettings(parsed);
        alert('Settings imported successfully!');
      } else {
        alert('Invalid settings code.');
      }
    } catch (e) {
      alert('Failed to parse settings code.');
    }
  };

  const exportSavedQuotes = () => {
    const data = JSON.stringify(settings.savedQuotes);
    navigator.clipboard.writeText(data);
    alert('Saved quotes list copied to clipboard!');
  };

  const importSavedQuotes = () => {
    const data = prompt('Paste your saved quotes code here:');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Merge with existing and remove duplicates by ID
        const newQuotes = [...parsed, ...settings.savedQuotes];
        const uniqueQuotes = Array.from(new Map(newQuotes.map(q => [q.id, q])).values());
        updateSettings({ savedQuotes: uniqueQuotes });
        alert(`${parsed.length} quotes imported and merged!`);
      } else {
        alert('Invalid quotes code.');
      }
    } catch (e) {
      alert('Failed to parse quotes code.');
    }
  };

  // Calculations
  const calculateLaborCost = () => {
    if (settings.wages.length === 0 || laborHours === 0) return 0;
    const hoursPerPerson = laborHours / settings.wages.length;
    return settings.wages.reduce((total, wage) => total + (wage * hoursPerPerson), 0);
  };

  const calculateMaterialTotals = () => {
    let cost = 0;
    let price = 0;

    quoteItems.forEach(qItem => {
      const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
      if (!pItem) return;

      const itemCost = pItem.cost * qItem.quantity;
      const markup = pItem.useCustomMarkup ? pItem.customMarkup : settings.globalMarkup;
      const itemPrice = itemCost * (1 + markup / 100);

      cost += itemCost;
      price += itemPrice;
    });

    return { cost, price };
  };

  const laborCost = calculateLaborCost();
  const laborPrice = laborHours * settings.targetHourly;
  const materials = calculateMaterialTotals();

  const totalCost = laborCost + materials.cost;
  const totalPrice = laborPrice + materials.price;
  const profit = totalPrice - totalCost;
  const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

  return (
    <div className="app-container">
      {showNudge && (
        <div className="install-nudge">
          <div className="nudge-content">
            <span>Install as a real app for a better experience!</span>
            <p>Tap the <b>Share</b> icon then <b>'Add to Home Screen'</b></p>
          </div>
          <button onClick={() => setShowNudge(false)}>×</button>
        </div>
      )}
      <nav className="tabs">
        <button
          className={activeTab === 'quote' ? 'active' : ''}
          onClick={() => setActiveTab('quote')}
        >
          Quote
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Saved
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <main className="content">
        {activeTab === 'quote' ? (
          <div className="quote-view">
            <section className="card">
              <h3>Labor</h3>
              <div className="input-group">
                <label>Total Labor Hours</label>
                <input
                  type="number"
                  value={laborHours || ''}
                  onChange={(e) => setLaborHours(Number(e.target.value))}
                  placeholder="e.g. 8"
                />
              </div>
              <div className="labor-grid">
                <div className="labor-row">
                  <span className="label">Labor Cost (Wages)</span>
                  <span className="value">${laborCost.toFixed(2)}</span>
                </div>
                <div className="labor-row">
                  <span className="label">Labor Price (Billable)</span>
                  <span className="value">${laborPrice.toFixed(2)}</span>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Materials / Items</h3>
              <div className="add-item-select">
                <select onChange={(e) => {
                  if (e.target.value) {
                    addToQuote(e.target.value);
                    e.target.value = '';
                  }
                }}>
                  <option value="">Add item from settings...</option>
                  {settings.persistentItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (${item.cost})</option>
                  ))}
                </select>
              </div>

              <div className="quote-items-list">
                {quoteItems.map((qItem, idx) => {
                  const pItem = settings.persistentItems.find(i => i.id === qItem.itemId);
                  if (!pItem) return null;
                  
                  const markup = pItem.useCustomMarkup ? pItem.customMarkup : settings.globalMarkup;
                  const itemCostTotal = pItem.cost * qItem.quantity;
                  const lineTotal = itemCostTotal * (1 + markup / 100);
                  const markupProfit = lineTotal - itemCostTotal;

                  return (
                    <div key={idx} className="quote-item-row">
                      <div className="item-info">
                        <span className="item-name">{pItem.name}</span>
                        <div className="item-price">
                          <span>Cost: <b>${pItem.cost.toFixed(2)}</b></span>
                          <span>Markup: <b>{markup}%</b></span>
                        </div>
                      </div>
                      <div className="item-line-total">
                        <span className="value">${lineTotal.toFixed(2)}</span>
                        <span className="markup-profit">(+${markupProfit.toFixed(2)})</span>
                      </div>
                      <div className="item-actions">
                        <input
                          type="number"
                          value={qItem.quantity || ''}
                          onChange={(e) => updateQuoteItemQuantity(idx, Number(e.target.value))}
                          min="1"
                        />
                        <button className="btn-danger" onClick={() => removeFromQuote(idx)}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card summary-card">
              <h3>Total Summary</h3>
              <div className="summary-grid">
                <span className="label">Material Cost:</span> <span className="value">${materials.cost.toFixed(2)}</span>
                <span className="label">Material Price:</span> <span className="value">${materials.price.toFixed(2)}</span>
                <hr />
                <span className="label">Labor Cost (Wages):</span> <span className="value">${laborCost.toFixed(2)}</span>
                <span className="label">Labor Price (Billable):</span> <span className="value">${laborPrice.toFixed(2)}</span>
                <hr />
                <span className="label">Total Project Cost:</span> <span className="value">${totalCost.toFixed(2)}</span>
                <span className="label highlight">Total Quote Amount:</span> <span className="value highlight">${totalPrice.toFixed(2)}</span>
                <hr />
                <span className="label">Project Net Profit:</span> <span className="value profit-text">${profit.toFixed(2)}</span>
                <span className="label">Profit Margin:</span> <span className="value profit-text">{margin.toFixed(1)}%</span>
              </div>
              
              <div className="save-quote-area">
                <h3>Save & Export</h3>
                <div className="save-input-group">
                  <input 
                    type="text" 
                    placeholder="Name this quote..." 
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                  />
                  <button className="btn-primary" onClick={saveCurrentQuote}>Save</button>
                </div>
                <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={exportQuoteToText}>Export to Clipboard (Text)</button>
              </div>
            </section>
          </div>
        ) : activeTab === 'history' ? (
          <div className="history-view">
            <section className="card">
              <h3>Quote History</h3>
              <div className="settings-actions" style={{ marginBottom: '1.5rem' }}>
                <button className="btn-secondary" onClick={exportSavedQuotes}>Backup Quotes</button>
                <button className="btn-secondary" onClick={importSavedQuotes}>Restore Quotes</button>
              </div>
              <div className="saved-quotes-list">
                {settings.savedQuotes.length === 0 ? (
                  <p className="help-text">No saved quotes yet.</p>
                ) : (
                  settings.savedQuotes.map(quote => (
                    <div key={quote.id} className="saved-quote-row">
                      <div className="quote-info" onClick={() => loadSavedQuote(quote)}>
                        <span className="quote-name">{quote.name}</span>
                        <span className="quote-meta">{quote.date} • ${quote.totalPrice.toFixed(2)}</span>
                      </div>
                      <button className="btn-danger" onClick={() => deleteSavedQuote(quote.id)}>×</button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="settings-view">
            <section className="card">
              <h3>Global Settings</h3>
              <div className="input-group">
                <label>Target Hourly Rate ($)</label>
                <input
                  type="number"
                  value={settings.targetHourly}
                  onChange={(e) => updateSettings({ targetHourly: Number(e.target.value) })}
                />
              </div>
              <div className="input-group">
                <label>Global Material Markup (%)</label>
                <input
                  type="number"
                  value={settings.globalMarkup}
                  onChange={(e) => updateSettings({ globalMarkup: Number(e.target.value) })}
                />
              </div>
              <div className="settings-actions">
                <button className="btn-secondary" onClick={exportSettings}>Export All Settings</button>
                <button className="btn-secondary" onClick={importSettings}>Import Settings</button>
              </div>
            </section>

            <section className="card">
              <h3>Employee Wages</h3>
              <div className="wages-list">
                {settings.wages.map((wage, idx) => (
                  <div key={idx} className="wage-row">
                    <input
                      type="number"
                      value={wage}
                      onChange={(e) => updateWage(idx, Number(e.target.value))}
                      placeholder="Wage $/hr"
                    />
                    <button className="btn-danger" onClick={() => removeWage(idx)}>×</button>
                  </div>
                ))}
                <button className="btn-secondary" onClick={addWage}>+ Add Wage</button>
              </div>
              <p className="help-text">Hours will be split equally among all listed wages.</p>
            </section>

            <section className="card">
              <h3>Persistent Items</h3>
              <div className="persistent-items-list">
                {settings.persistentItems.map(item => (
                  <div key={item.id} className="persistent-item-editor">
                    <input
                      className="item-name-input"
                      type="text"
                      value={item.name}
                      placeholder="Item Name"
                      onChange={(e) => updatePersistentItem(item.id, { name: e.target.value })}
                    />
                    <div className="item-details-row">
                      <div className="input-group">
                        <label>Cost</label>
                        <input
                          type="number"
                          value={item.cost || ''}
                          onChange={(e) => updatePersistentItem(item.id, { cost: Number(e.target.value) })}
                        />
                      </div>
                      <div className="markup-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={item.useCustomMarkup}
                            onChange={(e) => updatePersistentItem(item.id, { useCustomMarkup: e.target.checked })}
                          />
                          Custom Markup
                        </label>
                        {item.useCustomMarkup && (
                          <input
                            type="number"
                            value={item.customMarkup}
                            onChange={(e) => updatePersistentItem(item.id, { customMarkup: Number(e.target.value) })}
                            placeholder="%"
                          />
                        )}
                      </div>
                      <button className="btn-danger" onClick={() => removePersistentItem(item.id)}>×</button>
                    </div>
                  </div>
                ))}
                <button className="btn-secondary" onClick={addPersistentItem}>+ Add New Item</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
