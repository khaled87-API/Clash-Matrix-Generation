import React, { useState, useEffect } from 'react';
import {
  Filter,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bookmark,
  Code2,
  Layers,
  Settings2,
  BookOpen,
} from 'lucide-react';
import { ParsedWorkbook } from '../types/excel';
import { ConditionConfig, NavisworksDataType, SelectionSetConfig, DataTypeCategory } from '../types/selectionSet';
import { NavisworksPropertyDefinition } from '../types/propertyLibrary';
import {
  DEFAULT_PROPERTY_PRESETS,
  loadSavedPresets,
} from '../selectionSets/propertyPresets';
import {
  resolveCategoryInternalName,
} from '../selectionSets/categoryManager';
import { loadCategoryLibrary } from '../selectionSets/categoryLibraryManager';
import { cloneStandard8BimConditions } from '../selectionSets/standardConditions';
import { CategoryManagerModal } from './CategoryManagerModal';
import { PropertyLibraryModal } from './PropertyLibraryModal';
import { CategoryLibraryModal } from './CategoryLibraryModal';
import { NavisworksCategoryDefinition } from '../types/categoryLibrary';
import { colIndexToLetter } from '../excel/parser';

interface ConditionsStepProps {
  workbook: ParsedWorkbook;
  selectionSetConfig: SelectionSetConfig;
  onUpdateConditions: (conditions: ConditionConfig[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ConditionsStep: React.FC<ConditionsStepProps> = ({
  workbook,
  selectionSetConfig,
  onUpdateConditions,
  onPrev,
  onNext,
}) => {
  const [categories, setCategories] = useState<NavisworksCategoryDefinition[]>(() =>
    loadCategoryLibrary()
  );
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isPropertyLibraryOpen, setIsPropertyLibraryOpen] = useState(false);
  const [isCategoryLibraryOpen, setIsCategoryLibraryOpen] = useState(false);
  const [activeTargetConditionIndex, setActiveTargetConditionIndex] = useState<number | undefined>(undefined);
  const presets = loadSavedPresets();

  // Reload categories on mount
  useEffect(() => {
    setCategories(loadCategoryLibrary());
  }, []);

  const handleAddCondition = () => {
    const defaultCol = workbook.columns[0]?.index ?? 0;
    const defaultCategory = categories[0] || {
      displayName: 'Element',
      internalName: 'LcRevitData_Element',
    };

    const newCond: ConditionConfig = {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      excelColumnIndex: defaultCol,
      excelColumnLetter: colIndexToLetter(defaultCol),
      dataType: defaultCategory.displayName,
      categoryInternalName: defaultCategory.internalName,
      propertyDisplayName: 'CD_ClashPriority',
      propertyInternalName: 'lcldrevit_parameter_3568759',
      test: 'contains',
      flags: 10,
      valueSource: 'excel',
      value: '',
    };
    onUpdateConditions([...selectionSetConfig.conditions, newCond]);
  };

  const handleRemoveCondition = (index: number) => {
    onUpdateConditions(selectionSetConfig.conditions.filter((_, idx) => idx !== index));
  };

  const handleMoveCondition = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectionSetConfig.conditions.length) return;

    const updated = [...selectionSetConfig.conditions];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onUpdateConditions(updated);
  };

  const handleUpdateCondition = (index: number, updates: Partial<ConditionConfig>) => {
    const updated = [...selectionSetConfig.conditions];
    updated[index] = {
      ...updated[index],
      ...updates,
    };

    // If dataType is updated, automatically adjust categoryInternalName based on current categories
    if (updates.dataType && !updates.categoryInternalName) {
      const matchedCat = categories.find(
        (c) =>
          c.displayName === updates.dataType ||
          c.id === updates.dataType ||
          c.internalName === updates.dataType
      );
      if (matchedCat) {
        updated[index].categoryInternalName = matchedCat.internalName;
      } else {
        updated[index].categoryInternalName = resolveCategoryInternalName(
          updates.dataType
        );
      }
    }

    if (updates.excelColumnIndex !== undefined) {
      updated[index].excelColumnLetter = colIndexToLetter(updates.excelColumnIndex);
    }

    onUpdateConditions(updated);
  };

  const handleApplyPreset = (index: number, presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    handleUpdateCondition(index, {
      dataType: preset.dataType,
      categoryInternalName: preset.categoryInternalName,
      propertyDisplayName: preset.propertyDisplayName,
      propertyInternalName: preset.propertyInternalName,
      test: preset.test,
      flags: preset.flags,
    });
  };

  const handleApplyPropertyFromLibrary = (
    prop: NavisworksPropertyDefinition,
    targetIndex?: number
  ) => {
    const targetIdx = targetIndex !== undefined ? targetIndex : 0;
    if (targetIdx < 0 || targetIdx >= selectionSetConfig.conditions.length) {
      // If no valid target condition exists, create a new one using this property
      const defaultCol = workbook.columns[0]?.index ?? 0;
      const newCond: ConditionConfig = {
        id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        excelColumnIndex: defaultCol,
        excelColumnLetter: colIndexToLetter(defaultCol),
        dataType: prop.categoryDisplayName,
        categoryInternalName: prop.categoryInternalName,
        propertyDisplayName: prop.propertyDisplayName,
        propertyInternalName: prop.propertyInternalName,
        test: 'contains',
        flags: prop.defaultFlags !== undefined ? prop.defaultFlags : 10,
        valueSource: 'excel',
        value: '',
      };
      onUpdateConditions([...selectionSetConfig.conditions, newCond]);
      return;
    }

    // Populate the ACTIVE FindSpec condition with Category and Property definitions without overwriting test, flags, or value unless needed
    handleUpdateCondition(targetIdx, {
      dataType: prop.categoryDisplayName,
      categoryInternalName: prop.categoryInternalName,
      propertyDisplayName: prop.propertyDisplayName,
      propertyInternalName: prop.propertyInternalName,
    });
  };

  const handleApplyCategoryFromLibrary = (
    cat: NavisworksCategoryDefinition,
    targetIndex?: number
  ) => {
    const targetIdx = targetIndex !== undefined ? targetIndex : 0;
    if (targetIdx < 0 || targetIdx >= selectionSetConfig.conditions.length) {
      const defaultCol = workbook.columns[0]?.index ?? 0;
      const newCond: ConditionConfig = {
        id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        excelColumnIndex: defaultCol,
        excelColumnLetter: colIndexToLetter(defaultCol),
        dataType: cat.displayName,
        categoryInternalName: cat.internalName,
        propertyDisplayName: 'CD_ClashPriority',
        propertyInternalName: 'lcldrevit_parameter_3568759',
        test: 'contains',
        flags: 10,
        valueSource: 'excel',
        value: '',
      };
      onUpdateConditions([...selectionSetConfig.conditions, newCond]);
      return;
    }

    // Populate ONLY category display name and internal name on the active condition
    handleUpdateCondition(targetIdx, {
      dataType: cat.displayName,
      categoryInternalName: cat.internalName,
    });
  };

  const handleResetToStandardBimConditions = () => {
    const priorityCol = selectionSetConfig.nameParts[0]?.columnIndex ?? 4;
    const groupCol = selectionSetConfig.nameParts[1]?.columnIndex ?? 5;
    onUpdateConditions(cloneStandard8BimConditions(priorityCol, groupCol));
  };

  const verifiedCategories = categories.filter(
    (c) => c.source === 'autodesk-verified' || (c as any).builtIn
  );
  const userCategories = categories.filter((c) => c.source === 'user-defined');
  const xmlCategories = categories.filter((c) => c.source === 'navisworks-xml');

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 04 // FindSpec Rules
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <Filter className="w-6 h-6 text-cyan-400" />
              Step 4: Selection Set Condition Rules (FindSpec)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Configure search conditions for Navisworks Selection Sets. Map Excel columns to categories
              (Element, Custom, Text, Identity Data, or user-defined categories), display names, internal parameter names, and explicit flags.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Manage Category Library Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTargetConditionIndex(undefined);
                setIsCategoryLibraryOpen(true);
              }}
              id="btn-manage-category-library"
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all shadow-sm cursor-pointer"
              title="Open Navisworks Category Library to search, add, import XML, or use verified category definitions"
            >
              <Layers className="w-4 h-4 mr-1.5 text-indigo-400" />
              Manage Category Library
            </button>

            {/* Manage Property Library Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTargetConditionIndex(undefined);
                setIsPropertyLibraryOpen(true);
              }}
              id="btn-manage-property-library"
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all shadow-sm cursor-pointer"
              title="Open Navisworks Property Library to search, add, import XML, or use verified property parameters"
            >
              <BookOpen className="w-4 h-4 mr-1.5 text-cyan-400" />
              Manage Property Library
            </button>

            {/* Manage Categories Button */}
            <button
              type="button"
              onClick={() => setIsCategoryManagerOpen(true)}
              id="btn-manage-categories-header"
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition-all shadow-sm cursor-pointer"
              title="Add, edit, or remove custom Data Type Categories"
            >
              <Layers className="w-4 h-4 mr-1.5 text-slate-300" />
              Categories ({categories.length})
            </button>

            <button
              type="button"
              onClick={handleResetToStandardBimConditions}
              id="btn-load-standard-bim-conditions"
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition-all shadow-sm cursor-pointer"
              title="Apply 1 standard BIM rule: Category = Element, Property = Category (flags: 10)"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
              Load Standard BIM Rule
            </button>

            <button
              type="button"
              onClick={handleAddCondition}
              id="btn-add-condition-top"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer border border-cyan-300/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Condition
            </button>
          </div>
        </div>
      </div>

      {/* Condition Cards List */}
      <div className="space-y-4">
        {selectionSetConfig.conditions.map((cond, idx) => (
          <div
            key={cond.id}
            className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-4 hover:border-cyan-500/30 transition-all"
          >
            {/* Condition Header Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-bold font-mono shadow-inner">
                  {idx + 1}
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  Condition Rule #{idx + 1}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                {/* Pick from Category Library */}
                <button
                  type="button"
                  id={`btn-pick-category-library-${idx}`}
                  onClick={() => {
                    setActiveTargetConditionIndex(idx);
                    setIsCategoryLibraryOpen(true);
                  }}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer"
                  title="Pick a category from the Navisworks Category Library for this condition"
                >
                  <Layers className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  Category
                </button>

                {/* Pick from Property Library */}
                <button
                  type="button"
                  id={`btn-pick-property-library-${idx}`}
                  onClick={() => {
                    setActiveTargetConditionIndex(idx);
                    setIsPropertyLibraryOpen(true);
                  }}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
                  title="Pick a property from the Navisworks Property Library for this condition"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  Property
                </button>

                {/* Apply Preset Dropdown */}
                <div className="flex items-center space-x-1.5 bg-[#050A15] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <select
                    id={`select-preset-${idx}`}
                    onChange={(e) => handleApplyPreset(idx, e.target.value)}
                    defaultValue=""
                    className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#050A15] text-slate-400">
                      Load Preset...
                    </option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#050A15] text-slate-200">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reorder & Delete */}
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveCondition(idx, 'up')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 transition-colors cursor-pointer"
                  title="Move condition up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === selectionSetConfig.conditions.length - 1}
                  onClick={() => handleMoveCondition(idx, 'down')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 transition-colors cursor-pointer"
                  title="Move condition down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors ml-1 cursor-pointer"
                  title="Delete condition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Condition Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
              {/* 1. Value Source & Excel Column / Custom Value */}
              <div className="lg:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 font-semibold">
                    Value / Source Mapping
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {cond.value ? 'Explicit Value' : `Excel Col ${cond.excelColumnLetter || '?'}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id={`select-condition-column-${idx}`}
                    value={cond.excelColumnIndex ?? ''}
                    onChange={(e) =>
                      handleUpdateCondition(idx, {
                        excelColumnIndex: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-2.5 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
                  >
                    {workbook.columns.map((col) => (
                      <option key={col.index} value={col.index}>
                        Col {col.letter} ({col.header})
                      </option>
                    ))}
                  </select>
                  <input
                    id={`input-condition-value-${idx}`}
                    type="text"
                    value={cond.value || ''}
                    onChange={(e) =>
                      handleUpdateCondition(idx, {
                        value: e.target.value,
                        valueSource: e.target.value ? 'custom' : 'excel',
                      })
                    }
                    placeholder="Custom Value..."
                    title="Enter custom/static value or leave blank to use Excel column cell value"
                    className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-2.5 py-2 text-xs text-amber-200 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* 2. Data Type Category */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-400 font-semibold">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTargetConditionIndex(idx);
                      setIsCategoryLibraryOpen(true);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Open Navisworks Category Library"
                  >
                    <Settings2 className="w-2.5 h-2.5" />
                    Manage
                  </button>
                </div>
                <select
                  id={`select-datatype-category-${idx}`}
                  value={
                    categories.find(
                      (c) =>
                        c.internalName === cond.categoryInternalName ||
                        c.displayName === cond.dataType
                    )?.internalName ||
                    cond.categoryInternalName ||
                    cond.dataType ||
                    ''
                  }
                  onChange={(e) => {
                    const selectedCat = categories.find(
                      (c) =>
                        c.internalName === e.target.value ||
                        c.displayName === e.target.value
                    );
                    if (selectedCat) {
                      handleUpdateCondition(idx, {
                        dataType: selectedCat.displayName,
                        categoryInternalName: selectedCat.internalName,
                      });
                    } else {
                      handleUpdateCondition(idx, {
                        dataType: e.target.value,
                        categoryInternalName: resolveCategoryInternalName(e.target.value),
                      });
                    }
                  }}
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
                >
                  <optgroup label="Autodesk Verified" className="bg-[#050A15] text-slate-400 font-semibold">
                    {verifiedCategories.map((cat) => (
                      <option
                        key={cat.id || cat.internalName}
                        value={cat.internalName}
                        className="bg-[#050A15] text-slate-100"
                      >
                        {cat.displayName}
                      </option>
                    ))}
                  </optgroup>
                  {userCategories.length > 0 && (
                    <optgroup label="User-Defined Categories" className="bg-[#050A15] text-cyan-400 font-semibold">
                      {userCategories.map((cat) => (
                        <option
                          key={cat.id || cat.internalName}
                          value={cat.internalName}
                          className="bg-[#050A15] text-cyan-200"
                        >
                          {cat.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {xmlCategories.length > 0 && (
                    <optgroup label="Imported XML Categories" className="bg-[#050A15] text-amber-400 font-semibold">
                      {xmlCategories.map((cat) => (
                        <option
                          key={cat.id || cat.internalName}
                          value={cat.internalName}
                          className="bg-[#050A15] text-amber-200"
                        >
                          {cat.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {!categories.some(
                    (c) =>
                      c.internalName === cond.categoryInternalName ||
                      c.displayName === cond.dataType
                  ) &&
                    (cond.dataType || cond.categoryInternalName) && (
                      <option
                        value={cond.categoryInternalName || cond.dataType}
                        className="bg-[#050A15] text-slate-300"
                      >
                        {cond.dataType || cond.categoryInternalName}
                      </option>
                    )}
                </select>
              </div>

              {/* 3. Property Display Name */}
              <div className="lg:col-span-2">
                <label className="block text-slate-400 mb-1.5 font-semibold">
                  Property Display Name
                </label>
                <input
                  id={`input-property-display-${idx}`}
                  type="text"
                  value={cond.propertyDisplayName}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      propertyDisplayName: e.target.value,
                    })
                  }
                  placeholder="e.g. CD_ClashPriority"
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                />
              </div>

              {/* 4. Property Internal Name */}
              <div className="lg:col-span-2">
                <label className="block text-slate-400 mb-1.5 font-semibold">
                  Property Internal Name
                </label>
                <input
                  id={`input-property-internal-${idx}`}
                  type="text"
                  value={cond.propertyInternalName}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      propertyInternalName: e.target.value,
                    })
                  }
                  placeholder="e.g. lcldrevit_parameter_3568759"
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                />
              </div>

              {/* 5. Flags & Test */}
              <div className="lg:col-span-2 flex space-x-2">
                <div className="w-1/2">
                  <label className="block text-slate-400 mb-1.5 font-semibold">
                    Flags
                  </label>
                  <input
                    id={`input-flags-${idx}`}
                    type="number"
                    value={cond.flags}
                    onChange={(e) =>
                      handleUpdateCondition(idx, {
                        flags: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-2 py-2 text-xs text-slate-100 font-mono text-center focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-slate-400 mb-1.5 font-semibold">
                    Test
                  </label>
                  <select
                    id={`select-test-${idx}`}
                    value={cond.test}
                    onChange={(e) =>
                      handleUpdateCondition(idx, {
                        test: e.target.value as 'contains' | 'equals' | 'wildcard',
                      })
                    }
                    className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-1.5 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                  >
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value="wildcard">wildcard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* XML Live Preview Snippet for this condition */}
            <div className="bg-[#050A15]/90 rounded-xl p-3 border border-white/[0.08] text-[11px] font-mono text-slate-300 overflow-x-auto flex items-center justify-between">
              <div>
                <span className="text-slate-500">&lt;condition test=</span>
                <span className="text-amber-300">&quot;{cond.test}&quot;</span>
                <span className="text-slate-500"> flags=</span>
                <span className="text-purple-300">&quot;{cond.flags}&quot;</span>
                <span className="text-slate-500">&gt; &lt;category&gt; &lt;name internal=</span>
                <span className="text-cyan-300 font-semibold">&quot;{cond.categoryInternalName}&quot;</span>
                <span className="text-slate-500">&gt;</span>
                <span className="text-amber-200 font-semibold">{cond.dataType}</span>
                <span className="text-slate-500">&lt;/name&gt; &lt;/category&gt; &lt;property&gt; &lt;name internal=</span>
                <span className="text-cyan-300">&quot;{cond.propertyInternalName}&quot;</span>
                <span className="text-slate-500">&gt;{cond.propertyDisplayName}&lt;/name&gt; &lt;/property&gt; &lt;value&gt;&lt;data type=&quot;wstring&quot;&gt;</span>
                <span className="text-emerald-300 font-semibold">{cond.value || `[Excel Col ${cond.excelColumnLetter || '?'}]`}</span>
                <span className="text-slate-500">&lt;/data&gt;&lt;/value&gt; &lt;/condition&gt;</span>
              </div>
            </div>
          </div>
        ))}

        {selectionSetConfig.conditions.length === 0 && (
          <div className="text-center py-12 bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-dashed border-white/10 space-y-3">
            <Filter className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">No condition rules configured.</p>
            <button
              type="button"
              onClick={handleResetToStandardBimConditions}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Load Standard BIM Rule
            </button>
          </div>
        )}
      </div>

      {/* Conditions Legend & Quick Reference */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-white/[0.08] pb-3">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Conditions Legend &amp; Quick Reference
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Flags / Logic */}
          <div className="p-4 rounded-xl bg-[#050A15]/80 border border-white/[0.06] space-y-3">
            <h4 className="font-semibold text-cyan-300 uppercase tracking-wider text-[11px] font-mono">
              Condition Relationship / Flags
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 text-xs shrink-0">
                  10 → AND
                </span>
                <div>
                  <span className="font-semibold text-white block">10 — AND</span>
                  <p className="text-slate-400 text-[11px] leading-snug">
                    All linked conditions must be satisfied. Elements must match this condition in combination with surrounding rules.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-purple-300 bg-purple-950/80 border border-purple-500/40 text-xs shrink-0">
                  74 → OR
                </span>
                <div>
                  <span className="font-semibold text-white block">74 — OR</span>
                  <p className="text-slate-400 text-[11px] leading-snug">
                    Any linked condition can satisfy the logical branch. Useful when querying across alternate category tabs or parameter names.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FindSpec Structure */}
          <div className="p-4 rounded-xl bg-[#050A15]/80 border border-white/[0.06] space-y-3">
            <h4 className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] font-mono">
              FindSpec Attributes
            </h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-semibold font-mono w-24 shrink-0">Category:</span>
                <span className="text-slate-300">Navisworks tab/data category (e.g. <code className="text-amber-200">Element</code> → <code className="text-cyan-300">LcRevitData_Element</code>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-semibold font-mono w-24 shrink-0">Property:</span>
                <span className="text-slate-300">Display name &amp; internal parameter name (e.g. <code className="text-amber-200">Category</code> → <code className="text-cyan-300">lcldrevit_parameter_-1002000</code>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-semibold font-mono w-24 shrink-0">Test:</span>
                <span className="text-slate-300">Matching operator (<code className="text-emerald-300">contains</code>, <code className="text-emerald-300">equals</code>, or <code className="text-emerald-300">wildcard</code>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-semibold font-mono w-24 shrink-0">Value:</span>
                <span className="text-slate-300">Dynamic value extracted per row from mapped Excel column or static custom string.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Library Modal */}
      <CategoryLibraryModal
        isOpen={isCategoryLibraryOpen}
        onClose={() => {
          setIsCategoryLibraryOpen(false);
          setCategories(loadCategoryLibrary());
        }}
        targetConditionIndex={activeTargetConditionIndex}
        currentConditions={selectionSetConfig.conditions}
        onCategoriesUpdated={(updated) => {
          setCategories(updated);
        }}
        onSelectCategoryForCondition={(cat, targetIdx) => {
          handleApplyCategoryFromLibrary(cat, targetIdx);
        }}
      />

      {/* Property Library Modal */}
      <PropertyLibraryModal
        isOpen={isPropertyLibraryOpen}
        onClose={() => setIsPropertyLibraryOpen(false)}
        targetConditionIndex={activeTargetConditionIndex}
        currentConditions={selectionSetConfig.conditions}
        onSelectPropertyForCondition={(prop, targetIdx) => {
          handleApplyPropertyFromLibrary(prop, targetIdx);
        }}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => {
          setIsCategoryManagerOpen(false);
          setCategories(loadCategoryLibrary());
        }}
        currentConditions={selectionSetConfig.conditions}
        onCategoriesChanged={() => {
          setCategories(loadCategoryLibrary());
        }}
      />

      {/* Nav Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-conditions-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Selection Sets
        </button>

        <button
          onClick={onNext}
          id="btn-conditions-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Proceed to Clash Matrix Grid
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
