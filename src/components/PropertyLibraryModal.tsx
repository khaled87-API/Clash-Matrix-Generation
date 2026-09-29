import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  FileCode2,
  Sparkles,
  Info,
  Filter,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  NavisworksPropertyDefinition,
  PropertySource,
  XmlImportPreview,
} from '../types/propertyLibrary';
import {
  loadPropertyLibrary,
  savePropertyLibrary,
  addCustomProperty,
  updatePropertyInLibrary,
  deletePropertyFromLibrary,
  parseNavisworksXmlProperties,
  commitImportedProperties,
  filterPropertyLibrary,
  getPropertyIdentity,
} from '../selectionSets/propertyLibraryManager';
import { ConditionConfig } from '../types/selectionSet';

interface PropertyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPropertyForCondition?: (
    property: NavisworksPropertyDefinition,
    targetConditionIndex?: number
  ) => void;
  targetConditionIndex?: number;
  currentConditions?: ConditionConfig[];
}

export const PropertyLibraryModal: React.FC<PropertyLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPropertyForCondition,
  targetConditionIndex,
  currentConditions = [],
}) => {
  const [library, setLibrary] = useState<NavisworksPropertyDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Custom Property Form state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customCatDisplay, setCustomCatDisplay] = useState('');
  const [customCatInternal, setCustomCatInternal] = useState('');
  const [customPropDisplay, setCustomPropDisplay] = useState('');
  const [customPropInternal, setCustomPropInternal] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCatDisplay, setEditCatDisplay] = useState('');
  const [editCatInternal, setEditCatInternal] = useState('');
  const [editPropDisplay, setEditPropDisplay] = useState('');
  const [editPropInternal, setEditPropInternal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // XML Import State
  const [importPreview, setImportPreview] = useState<XmlImportPreview | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load properties on modal open
  useEffect(() => {
    if (isOpen) {
      const loaded = loadPropertyLibrary();
      setLibrary(loaded);
      setIsAddingCustom(false);
      setEditingId(null);
      setImportPreview(null);
      setImportSuccessMsg(null);
      setImportErrorMsg(null);
      setFormError(null);
      setEditError(null);

      // Category filter integration: if active condition has categoryInternalName / dataType, set it
      if (targetConditionIndex !== undefined && currentConditions[targetConditionIndex]) {
        const cond = currentConditions[targetConditionIndex];
        const cat = cond.categoryDisplayName || cond.dataType || cond.categoryInternalName || 'ALL';
        const matched = loaded.find(
          (p) =>
            p.categoryDisplayName.toLowerCase() === cat.toLowerCase() ||
            p.categoryInternalName.toLowerCase() === (cond.categoryInternalName || '').toLowerCase()
        );
        setCategoryFilter(matched ? matched.categoryDisplayName : cat);
      } else {
        setCategoryFilter('ALL');
      }
    }
  }, [isOpen, targetConditionIndex, currentConditions]);

  if (!isOpen) return null;

  // Derive unique categories for the filter dropdown
  const uniqueCategories = Array.from(
    new Set(library.map((p) => p.categoryDisplayName).filter(Boolean))
  ).sort();

  const filteredProperties = filterPropertyLibrary(
    library,
    searchQuery,
    categoryFilter,
    sourceFilter
  );

  // ----------------------------------------------------
  // Custom Property Handlers
  // ----------------------------------------------------
  const handleSaveCustomProperty = () => {
    setFormError(null);
    const res = addCustomProperty(
      {
        categoryDisplayName: customCatDisplay,
        categoryInternalName: customCatInternal,
        propertyDisplayName: customPropDisplay,
        propertyInternalName: customPropInternal,
        notes: customNotes,
      },
      library
    );

    if (!res.success) {
      setFormError(res.error || 'Failed to save property.');
      return;
    }

    setLibrary(res.updatedLibrary);
    setIsAddingCustom(false);
    setCustomCatDisplay('');
    setCustomCatInternal('');
    setCustomPropDisplay('');
    setCustomPropInternal('');
    setCustomNotes('');
  };

  const handleStartEdit = (prop: NavisworksPropertyDefinition) => {
    if (prop.source === 'autodesk-verified') return;
    setEditingId(prop.id);
    setIsAddingCustom(false);
    setEditCatDisplay(prop.categoryDisplayName);
    setEditCatInternal(prop.categoryInternalName);
    setEditPropDisplay(prop.propertyDisplayName);
    setEditPropInternal(prop.propertyInternalName);
    setEditNotes(prop.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = (propId: string) => {
    setEditError(null);
    const res = updatePropertyInLibrary(
      propId,
      {
        categoryDisplayName: editCatDisplay,
        categoryInternalName: editCatInternal,
        propertyDisplayName: editPropDisplay,
        propertyInternalName: editPropInternal,
        notes: editNotes,
      },
      library
    );

    if (!res.success) {
      setEditError(res.error || 'Failed to update property.');
      return;
    }

    setLibrary(res.updatedLibrary);
    setEditingId(null);
  };

  const handleDelete = (propId: string) => {
    const res = deletePropertyFromLibrary(propId, library);
    if (res.success) {
      setLibrary(res.updatedLibrary);
    }
  };

  // ----------------------------------------------------
  // XML Import Handlers (Client-Side Only)
  // ----------------------------------------------------
  const handleXmlFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error('File is empty.');

        const preview = parseNavisworksXmlProperties(content, file.name);
        if (preview.conditionsFound === 0) {
          setImportErrorMsg(`No <condition> elements found in "${file.name}".`);
          setImportPreview(null);
        } else {
          setImportPreview(preview);
          setImportErrorMsg(null);
        }
      } catch (err: any) {
        setImportErrorMsg(`Failed to parse XML: ${err.message || 'Unknown error'}`);
        setImportPreview(null);
      }
    };
    reader.onerror = () => {
      setImportErrorMsg('Error reading the selected XML file.');
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-selected if desired
    e.target.value = '';
  };

  const handleCommitXmlImport = () => {
    if (!importPreview) return;
    const res = commitImportedProperties(importPreview.properties, library);
    setLibrary(res.updatedLibrary);
    setImportSuccessMsg(
      `Successfully imported ${res.addedCount} new property definition(s) from "${importPreview.fileName}".`
    );
    setImportPreview(null);
  };

  // ----------------------------------------------------
  // Use Property in Active Condition
  // ----------------------------------------------------
  const handleUseProperty = (prop: NavisworksPropertyDefinition) => {
    if (onSelectPropertyForCondition) {
      onSelectPropertyForCondition(prop, targetConditionIndex);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A101D] border border-white/[0.12] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#070D1B]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Navisworks Property Library
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {library.length} Properties
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Centralized registry of verified, imported XML, and user-defined Navisworks property parameters
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Hidden File Input for XML */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleXmlFileSelected}
              className="hidden"
              id="file-input-xml-import"
            />

            <button
              type="button"
              id="btn-import-xml-library"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
              title="Import property definitions from a Navisworks XML export file"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Import Navisworks XML
            </button>

            <button
              type="button"
              id="btn-add-custom-prop"
              onClick={() => {
                setIsAddingCustom(true);
                setEditingId(null);
                setImportPreview(null);
              }}
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer border border-cyan-300/30"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Custom Property
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {importSuccessMsg && (
          <div className="px-6 py-2.5 bg-emerald-950/60 border-b border-emerald-500/30 flex items-center justify-between text-emerald-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportSuccessMsg(null)}
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {importErrorMsg && (
          <div className="px-6 py-2.5 bg-rose-950/60 border-b border-rose-500/30 flex items-center justify-between text-rose-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{importErrorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportErrorMsg(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* XML Import Preview Modal Section */}
        {importPreview && (
          <div className="p-6 bg-[#070D1B] border-b border-cyan-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Import Preview: {importPreview.fileName}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-4 mt-0.5">
                    <span>
                      Conditions Found:{' '}
                      <strong className="text-white">{importPreview.conditionsFound}</strong>
                    </span>
                    <span>
                      Unique Categories:{' '}
                      <strong className="text-cyan-300">
                        {importPreview.uniqueCategoriesCount}
                      </strong>
                    </span>
                    <span>
                      Unique Properties to Import:{' '}
                      <strong className="text-emerald-300">
                        {importPreview.uniquePropertiesCount}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-import-properties"
                  onClick={handleCommitXmlImport}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-md cursor-pointer border border-emerald-300/30 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Import Properties ({importPreview.uniquePropertiesCount})
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-48 overflow-y-auto border border-white/[0.08] rounded-xl overflow-hidden bg-[#050A15]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A101D] text-slate-400 border-b border-white/[0.08] uppercase text-[10px] font-mono sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Category Internal</th>
                    <th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2">Property Internal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-slate-200">
                  {importPreview.properties.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 font-medium text-amber-200">
                        {p.categoryDisplayName}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-cyan-300">
                        {p.categoryInternalName}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-100">
                        {p.propertyDisplayName}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-cyan-300">
                        {p.propertyInternalName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Custom Property Form */}
        {isAddingCustom && (
          <div className="p-6 bg-[#070D1B] border-b border-cyan-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add New Custom Property Definition
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Category Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-cat-display"
                  value={customCatDisplay}
                  onChange={(e) => {
                    setCustomCatDisplay(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Element or Custom"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Category Internal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-cat-internal"
                  value={customCatInternal}
                  onChange={(e) => {
                    setCustomCatInternal(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. LcRevitData_Element"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Property Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-prop-display"
                  value={customPropDisplay}
                  onChange={(e) => {
                    setCustomPropDisplay(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. FireRating or Priority"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Property Internal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-prop-internal"
                  value={customPropInternal}
                  onChange={(e) => {
                    setCustomPropInternal(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. custom_fire_rating"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                id="input-custom-notes"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Optional notes or usage context"
                className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-save-custom-prop"
                onClick={handleSaveCustomProperty}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer border border-cyan-300/30"
              >
                Save Property
              </button>
            </div>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="p-4 bg-[#070D1B] border-b border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-search-property-library"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties by display name, internal name, category, or notes..."
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Category Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                Category:
              </span>
              <select
                id="select-filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#050A15] border border-white/[0.12] rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {categoryFilter !== 'ALL' && (
                <button
                  type="button"
                  id="btn-show-all-properties"
                  onClick={() => setCategoryFilter('ALL')}
                  className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold border border-cyan-500/30 whitespace-nowrap transition-all cursor-pointer"
                  title="Remove category filter and show all properties in library"
                >
                  Show All Properties
                </button>
              )}
            </div>

            {/* Source Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                Source:
              </span>
              <select
                id="select-filter-source"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-[#050A15] border border-white/[0.12] rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                <option value="autodesk-verified">Autodesk Verified</option>
                <option value="navisworks-xml">Navisworks XML</option>
                <option value="user-defined">User Defined</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar text-xs">
          {filteredProperties.length === 0 && (
            <div className="text-center py-12 bg-[#050A15] rounded-2xl border border-dashed border-white/10 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No properties match your filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setSourceFilter('ALL');
                }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer underline underline-offset-2"
              >
                Reset Filters
              </button>
            </div>
          )}

          {filteredProperties.map((prop) => {
            const isEditing = editingId === prop.id;

            if (isEditing) {
              return (
                <div
                  key={prop.id}
                  className="bg-[#070D1B] p-4 rounded-xl border border-indigo-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                        Category Display Name
                      </label>
                      <input
                        type="text"
                        value={editCatDisplay}
                        onChange={(e) => setEditCatDisplay(e.target.value)}
                        className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                        Category Internal Name
                      </label>
                      <input
                        type="text"
                        value={editCatInternal}
                        onChange={(e) => setEditCatInternal(e.target.value)}
                        className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                        Property Display Name
                      </label>
                      <input
                        type="text"
                        value={editPropDisplay}
                        onChange={(e) => setEditPropDisplay(e.target.value)}
                        className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                        Property Internal Name
                      </label>
                      <input
                        type="text"
                        value={editPropInternal}
                        onChange={(e) => setEditPropInternal(e.target.value)}
                        className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {editError && (
                    <div className="p-2 bg-rose-950/60 border border-rose-500/40 rounded text-rose-200 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      {editError}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(prop.id)}
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Update Property
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={prop.id}
                className="bg-[#050A15] p-4 rounded-xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all group"
              >
                {/* Property Details */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-slate-100 text-sm">
                      {prop.propertyDisplayName}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">in</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {prop.categoryDisplayName}
                    </span>

                    {/* Source Badge */}
                    {prop.source === 'autodesk-verified' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Autodesk Verified
                      </span>
                    )}
                    {prop.source === 'navisworks-xml' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <FileCode2 className="w-3 h-3 text-indigo-400" />
                        Navisworks XML
                      </span>
                    )}
                    {prop.source === 'user-defined' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        User Defined
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-[11px] font-mono text-slate-400">
                    <div>
                      Category Internal:{' '}
                      <span className="text-cyan-300 font-semibold">{prop.categoryInternalName}</span>
                    </div>
                    <div>
                      Property Internal:{' '}
                      <span className="text-cyan-300 font-semibold">{prop.propertyInternalName}</span>
                    </div>
                  </div>

                  {prop.notes && (
                    <div className="text-[11px] text-slate-400 italic">
                      Note: {prop.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.05]">
                  {/* Use Property Button */}
                  <button
                    type="button"
                    onClick={() => handleUseProperty(prop)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 hover:text-white font-semibold text-xs border border-cyan-500/40 transition-all cursor-pointer shadow-sm"
                    title="Populate active FindSpec condition with this property"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                    Use Property
                  </button>

                  {/* Edit & Delete for non-verified */}
                  {prop.source !== 'autodesk-verified' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prop)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                        title="Edit Property"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(prop.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070D1B] flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            Showing {filteredProperties.length} of {library.length} properties in library
          </div>

          <button
            type="button"
            onClick={onClose}
            id="btn-close-property-library"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-medium border border-white/10 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
