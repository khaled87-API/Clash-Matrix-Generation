import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Code2,
  Sparkles,
  Info,
} from 'lucide-react';
import { DataTypeCategory, ConditionConfig } from '../types/selectionSet';
import {
  BUILT_IN_CATEGORIES,
  loadUserCategories,
  saveUserCategories,
  getAllCategories,
  validateCategory,
} from '../selectionSets/categoryManager';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConditions?: ConditionConfig[];
  onCategoriesChanged?: (allCategories: DataTypeCategory[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  currentConditions = [],
  onCategoriesChanged,
}) => {
  const [categories, setCategories] = useState<DataTypeCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New Category Form State
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newInternalName, setNewInternalName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editInternalName, setEditInternalName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion Confirmation / Warning State
  const [deleteWarning, setDeleteWarning] = useState<{
    cat: DataTypeCategory;
    usageCount: number;
  } | null>(null);

  // Load categories on open
  useEffect(() => {
    if (isOpen) {
      const all = getAllCategories();
      setCategories(all);
      setIsAddingNew(false);
      setEditingId(null);
      setFormError(null);
      setEditError(null);
      setDeleteWarning(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const notifyChange = (updatedList: DataTypeCategory[]) => {
    setCategories(updatedList);
    saveUserCategories(updatedList);
    onCategoriesChanged?.(updatedList);
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setNewDisplayName('');
    setNewInternalName('');
    setNewDescription('');
    setFormError(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewDisplayName('');
    setNewInternalName('');
    setNewDescription('');
    setFormError(null);
  };

  const handleSaveNew = () => {
    setFormError(null);
    const validation = validateCategory(
      { displayName: newDisplayName, internalName: newInternalName },
      categories
    );

    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid category configuration.');
      return;
    }

    const newCategory: DataTypeCategory = {
      id: `user_cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      displayName: newDisplayName.trim(),
      internalName: newInternalName.trim(),
      builtIn: false,
      description: newDescription.trim() || undefined,
    };

    const updated = [...categories, newCategory];
    notifyChange(updated);
    setIsAddingNew(false);
    setNewDisplayName('');
    setNewInternalName('');
    setNewDescription('');
  };

  const handleStartEdit = (cat: DataTypeCategory) => {
    if (cat.builtIn) return;
    setEditingId(cat.id);
    setIsAddingNew(false);
    setEditDisplayName(cat.displayName);
    setEditInternalName(cat.internalName);
    setEditDescription(cat.description || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = (catId: string) => {
    setEditError(null);
    const validation = validateCategory(
      { displayName: editDisplayName, internalName: editInternalName },
      categories,
      catId
    );

    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid category configuration.');
      return;
    }

    const updated = categories.map((c) => {
      if (c.id === catId) {
        return {
          ...c,
          displayName: editDisplayName.trim(),
          internalName: editInternalName.trim(),
          description: editDescription.trim() || undefined,
        };
      }
      return c;
    });

    notifyChange(updated);
    setEditingId(null);
  };

  const handleDeleteRequest = (cat: DataTypeCategory) => {
    if (cat.builtIn) return;
    // Check if category is used in active conditions
    const usageCount = currentConditions.filter(
      (cond) =>
        cond.dataType === cat.displayName ||
        cond.categoryInternalName === cat.internalName
    ).length;

    if (usageCount > 0) {
      setDeleteWarning({ cat, usageCount });
    } else {
      executeDelete(cat.id);
    }
  };

  const executeDelete = (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    notifyChange(updated);
    setDeleteWarning(null);
  };

  const builtInList = categories.filter((c) => c.builtIn);
  const userList = categories.filter((c) => !c.builtIn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A101D] border border-white/[0.12] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#070D1B]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Data Type Category Manager
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Manage built-in and user-defined Navisworks FindSpec categories
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* Info Banner */}
          <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              Categories define the top-level <code className="text-cyan-300 font-mono bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800">&lt;category&gt;&lt;name internal=&quot;...&quot;&gt;...&lt;/name&gt;&lt;/category&gt;</code> in generated Navisworks Selection Sets. Custom categories persist in local storage.
            </p>
          </div>

          {/* Section 1: Built-in Protected Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Built-in Protected Categories ({builtInList.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Immutable</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {builtInList.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#050A15] p-3 rounded-xl border border-white/[0.08] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      {cat.displayName}
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                        Built-in
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-cyan-400/80">
                      internal: &quot;{cat.internalName}&quot;
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-500/40" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: User-Defined Categories */}
          <div className="space-y-3 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                User-Defined Categories ({userList.length})
              </h3>

              {!isAddingNew && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  id="btn-add-new-category"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold transition-all cursor-pointer shadow-sm text-xs border border-cyan-300/30"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add New Category
                </button>
              )}
            </div>

            {/* Add New Category Form */}
            {isAddingNew && (
              <div className="bg-[#070D1B] p-4.5 rounded-xl border border-cyan-500/40 space-y-3.5 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    New Custom Category Definition
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                      Category Display Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-new-cat-display"
                      value={newDisplayName}
                      onChange={(e) => {
                        setNewDisplayName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="e.g. Project Property or My Category"
                      className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                      Category Internal Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-new-cat-internal"
                      value={newInternalName}
                      onChange={(e) => {
                        setNewInternalName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="e.g. MyInternalCategory or LcCustom_Project"
                      className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live XML Preview for Category */}
                <div className="bg-[#050A15] p-2.5 rounded-lg border border-white/[0.08] font-mono text-[11px] text-slate-300">
                  <div className="text-[10px] text-slate-500 mb-1 uppercase font-semibold">
                    Live XML Preview:
                  </div>
                  <div className="text-slate-400">
                    &lt;category&gt;&lt;name internal=&quot;
                    <span className="text-cyan-300 font-bold">
                      {newInternalName.trim() || 'InternalName'}
                    </span>
                    &quot;&gt;
                    <span className="text-amber-300 font-bold">
                      {newDisplayName.trim() || 'Display Name'}
                    </span>
                    &lt;/name&gt;&lt;/category&gt;
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="text-[11px]">{formError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNew}
                    id="btn-save-new-category"
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold shadow-md cursor-pointer border border-cyan-300/30"
                  >
                    Save Category
                  </button>
                </div>
              </div>
            )}

            {/* List of user categories */}
            {userList.length === 0 && !isAddingNew && (
              <div className="text-center py-6 bg-[#050A15] rounded-xl border border-dashed border-white/10 space-y-2">
                <p className="text-slate-400 text-xs">No user-defined categories yet.</p>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer underline underline-offset-2"
                >
                  + Add your first custom category
                </button>
              </div>
            )}

            <div className="space-y-2">
              {userList.map((cat) => {
                const isEditing = editingId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#070D1B] p-4 rounded-xl border border-indigo-500/40 space-y-3 animate-in fade-in"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                            Category Display Name
                          </label>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => {
                              setEditDisplayName(e.target.value);
                              setEditError(null);
                            }}
                            className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 text-[10px] font-semibold mb-1">
                            Category Internal Name
                          </label>
                          <input
                            type="text"
                            value={editInternalName}
                            onChange={(e) => {
                              setEditInternalName(e.target.value);
                              setEditError(null);
                            }}
                            className="w-full bg-[#050A15] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
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
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          Update Category
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="bg-[#050A15] p-3 rounded-xl border border-white/[0.08] flex items-center justify-between hover:border-white/20 transition-all group"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {cat.displayName}
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          User Defined
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-cyan-400/80">
                        internal: &quot;{cat.internalName}&quot;
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Warning Modal / Dialog */}
          {deleteWarning && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">
                    Category Currently In Use!
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Category <strong className="text-white">&quot;{deleteWarning.cat.displayName}&quot;</strong> is currently used in{' '}
                    <span className="text-amber-300 font-bold">{deleteWarning.usageCount} active FindSpec condition rule(s)</span>.
                    Deleting it may result in missing category mappings. Are you sure you want to proceed?
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeDelete(deleteWarning.cat.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070D1B] flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            {userList.length} user-defined categories configured
          </div>

          <button
            type="button"
            onClick={onClose}
            id="btn-close-category-manager"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-medium border border-white/10 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
