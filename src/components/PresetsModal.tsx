import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, X, RotateCcw, Check, Sparkles, Layers } from 'lucide-react';
import { PropertyPreset, NavisworksDataType, DataTypeCategory } from '../types/selectionSet';
import {
  DEFAULT_PROPERTY_PRESETS,
  loadSavedPresets,
  saveCustomPresets,
} from '../selectionSets/propertyPresets';
import {
  getAllCategories,
  resolveCategoryInternalName,
} from '../selectionSets/categoryManager';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose }) => {
  const [presets, setPresets] = useState<PropertyPreset[]>(() => loadSavedPresets());
  const [categories, setCategories] = useState<DataTypeCategory[]>(() => getAllCategories());
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPresets(loadSavedPresets());
      setCategories(getAllCategories());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPreset = () => {
    const defaultCat = categories[0] || {
      displayName: 'Element',
      internalName: 'LcRevitData_Element',
    };
    const newPreset: PropertyPreset = {
      id: `custom_${Date.now()}`,
      name: 'Custom Parameter Condition',
      dataType: defaultCat.displayName,
      categoryInternalName: defaultCat.internalName,
      propertyDisplayName: 'Parameter Name',
      propertyInternalName: 'lcldrevit_parameter_0000000',
      test: 'contains',
      flags: 10,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    saveCustomPresets(updated);
  };

  const handleUpdatePreset = (index: number, updates: Partial<PropertyPreset>) => {
    const updated = [...presets];
    updated[index] = { ...updated[index], ...updates };

    if (updates.dataType) {
      const matched = categories.find(
        (c) => c.displayName === updates.dataType || c.id === updates.dataType
      );
      if (matched) {
        updated[index].categoryInternalName = matched.internalName;
      } else {
        updated[index].categoryInternalName = resolveCategoryInternalName(
          updates.dataType,
          categories
        );
      }
    }

    setPresets(updated);
    saveCustomPresets(updated);
  };

  const handleDeletePreset = (index: number) => {
    const updated = presets.filter((_, idx) => idx !== index);
    setPresets(updated);
    saveCustomPresets(updated);
  };

  const handleResetDefaults = () => {
    setPresets(DEFAULT_PROPERTY_PRESETS);
    saveCustomPresets(DEFAULT_PROPERTY_PRESETS);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const builtInCategories = categories.filter((c) => c.builtIn);
  const userCategories = categories.filter((c) => !c.builtIn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0A101D] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#070D1B]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Navisworks Property Presets Library
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Persistent local storage configurations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <p className="text-xs text-slate-300">
            Define reusable Revit parameter mappings, data types, and Navisworks flags.
            These presets can be quickly applied to any Selection Set condition rule.
          </p>

          <div className="space-y-3.5">
            {presets.map((preset, idx) => (
              <div
                key={preset.id}
                className="bg-[#050A15] p-4.5 rounded-xl border border-white/[0.08] space-y-3.5 text-xs hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={preset.name}
                    onChange={(e) => handleUpdatePreset(idx, { name: e.target.value })}
                    className="bg-[#070D1B] border border-white/[0.12] rounded-lg px-3 py-1.5 text-xs text-white font-semibold w-2/3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                    placeholder="Preset Name"
                  />

                  <button
                    type="button"
                    onClick={() => handleDeletePreset(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer"
                    title="Delete Preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-semibold">Category Type</label>
                    <select
                      value={preset.dataType}
                      onChange={(e) =>
                        handleUpdatePreset(idx, {
                          dataType: e.target.value,
                        })
                      }
                      className="w-full bg-[#070D1B] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <optgroup label="Built-in Categories" className="bg-[#070D1B] text-slate-400">
                        {builtInCategories.map((cat) => (
                          <option key={cat.id} value={cat.displayName} className="bg-[#070D1B] text-slate-200">
                            {cat.displayName}
                          </option>
                        ))}
                      </optgroup>
                      {userCategories.length > 0 && (
                        <optgroup label="User-Defined Categories" className="bg-[#070D1B] text-cyan-400">
                          {userCategories.map((cat) => (
                            <option key={cat.id} value={cat.displayName} className="bg-[#070D1B] text-cyan-200">
                              {cat.displayName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-semibold">Property Display</label>
                    <input
                      type="text"
                      value={preset.propertyDisplayName}
                      onChange={(e) => handleUpdatePreset(idx, { propertyDisplayName: e.target.value })}
                      className="w-full bg-[#070D1B] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-semibold">Property Internal</label>
                    <input
                      type="text"
                      value={preset.propertyInternalName}
                      onChange={(e) => handleUpdatePreset(idx, { propertyInternalName: e.target.value })}
                      className="w-full bg-[#070D1B] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-semibold">Flags</label>
                    <input
                      type="number"
                      value={preset.flags}
                      onChange={(e) =>
                        handleUpdatePreset(idx, { flags: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-[#070D1B] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-semibold">Test</label>
                    <select
                      value={preset.test}
                      onChange={(e) =>
                        handleUpdatePreset(idx, {
                          test: e.target.value as 'contains' | 'equals' | 'wildcard',
                        })
                      }
                      className="w-full bg-[#070D1B] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="wildcard">wildcard</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070D1B] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Reset to Standard BIM Presets
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleAddPreset}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-300/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Preset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-medium border border-white/10 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
