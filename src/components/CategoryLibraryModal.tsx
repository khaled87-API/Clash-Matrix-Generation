import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
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
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  CategorySource,
  CategoryXmlImportPreview,
  NavisworksCategoryDefinition,
} from '../types/categoryLibrary';
import {
  loadCategoryLibrary,
  saveCategoryLibrary,
  addCustomCategory,
  updateCategoryInLibrary,
  deleteCategoryFromLibrary,
  parseNavisworksXmlCategories,
  commitImportedCategories,
  filterCategoryLibrary,
} from '../selectionSets/categoryLibraryManager';
import { ConditionConfig } from '../types/selectionSet';

interface CategoryLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategoryForCondition?: (
    category: NavisworksCategoryDefinition,
    targetConditionIndex?: number
  ) => void;
  targetConditionIndex?: number;
  currentConditions?: ConditionConfig[];
  onCategoriesUpdated?: (updatedLibrary: NavisworksCategoryDefinition[]) => void;
}

export const CategoryLibraryModal: React.FC<CategoryLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectCategoryForCondition,
  targetConditionIndex,
  currentConditions = [],
  onCategoriesUpdated,
}) => {
  const [library, setLibrary] = useState<NavisworksCategoryDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Custom Category Form state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [customInternalName, setCustomInternalName] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editInternalName, setEditInternalName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // XML Import State
  const [importPreview, setImportPreview] = useState<CategoryXmlImportPreview | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories on modal open
  useEffect(() => {
    if (isOpen) {
      const loaded = loadCategoryLibrary();
      setLibrary(loaded);
      setIsAddingCustom(false);
      setEditingId(null);
      setImportPreview(null);
      setImportSuccessMsg(null);
      setImportErrorMsg(null);
      setFormError(null);
      setEditError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCategories = filterCategoryLibrary(
    library,
    searchQuery,
    sourceFilter
  );

  // ----------------------------------------------------
  // Custom Category Handlers
  // ----------------------------------------------------
  const handleSaveCustomCategory = () => {
    setFormError(null);
    const res = addCustomCategory(
      {
        displayName: customDisplayName,
        internalName: customInternalName,
        notes: customNotes,
      },
      library
    );

    if (!res.success || !res.updatedLibrary) {
      setFormError(res.error || 'Failed to save category.');
      return;
    }

    setLibrary(res.updatedLibrary);
    onCategoriesUpdated?.(res.updatedLibrary);
    setIsAddingCustom(false);
    setCustomDisplayName('');
    setCustomInternalName('');
    setCustomNotes('');
  };

  const handleStartEdit = (cat: NavisworksCategoryDefinition) => {
    if (cat.source === 'autodesk-verified') return;
    setEditingId(cat.id);
    setIsAddingCustom(false);
    setEditDisplayName(cat.displayName);
    setEditInternalName(cat.internalName);
    setEditNotes(cat.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = (catId: string) => {
    setEditError(null);
    const res = updateCategoryInLibrary(
      catId,
      {
        displayName: editDisplayName,
        internalName: editInternalName,
        notes: editNotes,
      },
      library
    );

    if (!res.success) {
      setEditError(res.error || 'Failed to update category.');
      return;
    }

    setLibrary(res.updatedLibrary);
    onCategoriesUpdated?.(res.updatedLibrary);
    setEditingId(null);
  };

  const handleDelete = (catId: string) => {
    const res = deleteCategoryFromLibrary(catId, library);
    if (res.success) {
      setLibrary(res.updatedLibrary);
      onCategoriesUpdated?.(res.updatedLibrary);
    }
  };

  // ----------------------------------------------------
  // XML Import Handlers
  // ----------------------------------------------------
  const handleXmlFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error('File is empty.');

        const preview = parseNavisworksXmlCategories(content, file.name);
        if (preview.categoriesFound === 0) {
          setImportErrorMsg(`No <category> elements found in "${file.name}".`);
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

    e.target.value = '';
  };

  const handleCommitXmlImport = () => {
    if (!importPreview) return;
    const res = commitImportedCategories(importPreview.categories, library);
    setLibrary(res.updatedLibrary);
    onCategoriesUpdated?.(res.updatedLibrary);
    setImportSuccessMsg(
      `Successfully imported ${res.addedCount} new category definition(s) from "${importPreview.fileName}".`
    );
    setImportPreview(null);
  };

  // Get active target condition description
  const activeCondition =
    targetConditionIndex !== undefined && currentConditions[targetConditionIndex]
      ? currentConditions[targetConditionIndex]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0B132B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Hidden XML File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleXmlFileSelected}
          accept=".xml"
          className="hidden"
          id="xml-category-file-input"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#050A15]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  NAVISWORKS CATEGORY LIBRARY
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold border border-cyan-500/30">
                  {library.length} Categories
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized registry of verified, XML-imported, and custom Navisworks category definitions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
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

        {/* XML Import Preview Section */}
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
                      Categories Found in XML:{' '}
                      <strong className="text-white">{importPreview.categoriesFound}</strong>
                    </span>
                    <span>
                      Unique Categories to Import:{' '}
                      <strong className="text-emerald-300">
                        {importPreview.uniqueCategoriesCount}
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
                  id="btn-commit-xml-categories"
                  onClick={handleCommitXmlImport}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  Commit Import ({importPreview.uniqueCategoriesCount})
                </button>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#050A15] p-2 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] text-slate-400 border-b border-white/[0.08]">
                    <th className="pb-1.5 font-semibold">Display Name</th>
                    <th className="pb-1.5 font-semibold">Internal Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {importPreview.categories.map((c, i) => (
                    <tr key={i} className="text-slate-300">
                      <td className="py-1">{c.displayName}</td>
                      <td className="py-1 font-mono text-slate-400">{c.internalName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Custom Category Form */}
        {isAddingCustom && (
          <div className="p-6 bg-[#070D1B] border-b border-cyan-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add New Custom Category Definition
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Category Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-cat-display-name"
                  value={customDisplayName}
                  onChange={(e) => {
                    setCustomDisplayName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Mechanical System or Custom Parameter"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Category Internal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-custom-cat-internal-name"
                  value={customInternalName}
                  onChange={(e) => {
                    setCustomInternalName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. LcRevitData_Mechanical"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  id="input-custom-cat-notes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Discipline specific HVAC categories"
                  className="w-full bg-[#050A15] border border-white/[0.15] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {formError && (
              <div className="text-rose-400 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-save-custom-category"
                onClick={handleSaveCustomCategory}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                Save Category
              </button>
            </div>
          </div>
        )}

        {/* Target condition banner if opened from a specific condition */}
        {activeCondition && (
          <div className="px-6 py-2 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>
                Applying selection to <strong>Condition #{targetConditionIndex! + 1}</strong> (
                {activeCondition.dataType || 'Current Condition'})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Only Category Display & Internal Names will be updated
            </span>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="p-6 border-b border-white/[0.08] bg-[#070D1B] flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-search-category-library"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by display name, internal name, or notes..."
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

          {/* Source Filter */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
              Source:
            </span>
            <select
              id="select-filter-category-source"
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

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar text-xs">
          {filteredCategories.length === 0 && (
            <div className="text-center py-12 bg-[#050A15] rounded-2xl border border-dashed border-white/10 space-y-3">
              <Layers className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No categories match your filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('ALL');
                }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer underline underline-offset-2"
              >
                Reset Filters
              </button>
            </div>
          )}

          {filteredCategories.map((cat) => {
            const isEditing = editingId === cat.id;

            if (isEditing) {
              return (
                <div
                  key={cat.id}
                  className="p-4 bg-[#050A15] border border-cyan-500/50 rounded-xl space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <span className="font-semibold text-cyan-300 text-xs">Edit Category</span>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="w-full bg-[#070D1B] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                        Internal Name
                      </label>
                      <input
                        type="text"
                        value={editInternalName}
                        onChange={(e) => setEditInternalName(e.target.value)}
                        className="w-full bg-[#070D1B] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-[#070D1B] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {editError && (
                    <p className="text-rose-400 text-xs flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {editError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cat.id}
                className="group p-3.5 bg-[#050A15] hover:bg-[#070D1B] border border-white/[0.08] hover:border-cyan-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-white text-sm">{cat.displayName}</span>

                    {/* Source Badge */}
                    {cat.source === 'autodesk-verified' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Autodesk Verified
                      </span>
                    )}

                    {cat.source === 'navisworks-xml' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                        <FileCode2 className="w-3 h-3 text-indigo-400" />
                        Navisworks XML
                      </span>
                    )}

                    {cat.source === 'user-defined' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        User Defined
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span>
                      Internal Name:{' '}
                      <code className="text-cyan-300 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {cat.internalName}
                      </code>
                    </span>
                    {cat.notes && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Info className="w-3 h-3 text-slate-500" />
                        {cat.notes}
                      </span>
                    )}
                    {cat.sourceFileName && (
                      <span className="text-slate-500 text-[11px]">
                        From: {cat.sourceFileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  {onSelectCategoryForCondition && (
                    <button
                      type="button"
                      id={`btn-use-category-${cat.id}`}
                      onClick={() => {
                        onSelectCategoryForCondition(cat, targetConditionIndex);
                        onClose();
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/20"
                    >
                      Use Category
                      <ArrowRight className="w-3.5 h-3.5 ml-1 text-cyan-400" />
                    </button>
                  )}

                  {cat.source !== 'autodesk-verified' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        title="Edit category"
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        title="Delete category"
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
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

        {/* Modal Footer / Bottom Buttons */}
        <div className="p-4 border-t border-white/[0.08] bg-[#050A15] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-import-navisworks-xml-categories"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer"
              title="Import category definitions from a Navisworks XML export file"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Import Navisworks XML
            </button>

            <button
              type="button"
              id="btn-add-custom-category"
              onClick={() => {
                setIsAddingCustom(true);
                setEditingId(null);
                setFormError(null);
              }}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Add Custom Category
            </button>
          </div>

          <button
            type="button"
            id="btn-close-category-library"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
