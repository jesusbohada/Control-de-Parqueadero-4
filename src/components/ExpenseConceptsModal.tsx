import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Receipt, 
  AlertCircle,
  FolderPlus,
  Search,
  Palette,
  FolderTree
} from 'lucide-react';
import { ExpenseConcept, ExpenseCategory, SystemUser } from '../types';

interface ExpenseConceptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: ExpenseConcept[];
  categories?: ExpenseCategory[];
  onSaveConcept: (concept: ExpenseConcept) => void;
  onDeleteConcept: (conceptId: string) => void;
  onSaveCategory?: (category: ExpenseCategory) => void;
  onDeleteCategory?: (categoryId: string) => void;
  currentUser: SystemUser;
  embedded?: boolean;
}

const COLOR_OPTIONS = [
  { id: 'amber', name: 'Ámbar / Dorado', class: 'bg-amber-500 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { id: 'blue', name: 'Azul / Conectividad', class: 'bg-blue-500 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  { id: 'emerald', name: 'Verde Esmeralda / Aseo', class: 'bg-emerald-500 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'orange', name: 'Naranja / Infraestructura', class: 'bg-orange-500 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  { id: 'purple', name: 'Púrpura / Nómina', class: 'bg-purple-500 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  { id: 'rose', name: 'Rosa / Urgencias', class: 'bg-rose-500 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  { id: 'cyan', name: 'Cian / Software', class: 'bg-cyan-500 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
  { id: 'indigo', name: 'Índigo / Jurídico', class: 'bg-indigo-500 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  { id: 'slate', name: 'Gris / General', class: 'bg-slate-500 text-slate-600 dark:text-slate-300 border-slate-700' },
];

export const ExpenseConceptsModal: React.FC<ExpenseConceptsModalProps> = ({
  isOpen,
  onClose,
  concepts,
  categories = [],
  onSaveConcept,
  onDeleteConcept,
  onSaveCategory,
  onDeleteCategory,
  currentUser,
  embedded = false
}) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'categories'>('concepts');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Concept Form state
  const [editingConcept, setEditingConcept] = useState<ExpenseConcept | null>(null);
  const [isCreatingConcept, setIsCreatingConcept] = useState(false);
  const [formConceptName, setFormConceptName] = useState('');
  const [formConceptCategoryId, setFormConceptCategoryId] = useState<string>('');
  const [formConceptCategoryName, setFormConceptCategoryName] = useState<string>('');
  const [formConceptDescription, setFormConceptDescription] = useState('');
  const [formConceptIsActive, setFormConceptIsActive] = useState(true);
  const [conceptError, setConceptError] = useState<string | null>(null);

  // Category Form state
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [formCatName, setFormCatName] = useState('');
  const [formCatCode, setFormCatCode] = useState('');
  const [formCatColor, setFormCatColor] = useState('amber');
  const [formCatDescription, setFormCatDescription] = useState('');
  const [formCatIsActive, setFormCatIsActive] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helpers for category visual styles
  const getCategoryStyles = (categoryNameOrId?: string) => {
    if (!categoryNameOrId) {
      return {
        badge: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-500 dark:bg-slate-400',
        color: 'slate',
        name: 'General'
      };
    }

    // Try finding in categories array by id or name
    const found = categories.find(
      c => c.id === categoryNameOrId || c.name.toLowerCase() === categoryNameOrId.toLowerCase()
    );

    const color = found?.color || (
      categoryNameOrId === 'supplies' ? 'amber' :
      categoryNameOrId === 'services' ? 'blue' :
      categoryNameOrId === 'maintenance' ? 'orange' :
      categoryNameOrId === 'payroll' ? 'purple' :
      categoryNameOrId === 'aseo' ? 'emerald' : 'slate'
    );

    const displayName = found?.name || categoryNameOrId;

    switch (color) {
      case 'blue':
        return { badge: 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', color: 'blue', name: displayName };
      case 'emerald':
        return { badge: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', color: 'emerald', name: displayName };
      case 'orange':
        return { badge: 'text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800', dot: 'bg-orange-500', color: 'orange', name: displayName };
      case 'purple':
        return { badge: 'text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800', dot: 'bg-purple-500', color: 'purple', name: displayName };
      case 'rose':
        return { badge: 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500', color: 'rose', name: displayName };
      case 'cyan':
        return { badge: 'text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500', color: 'cyan', name: displayName };
      case 'indigo':
        return { badge: 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500', color: 'indigo', name: displayName };
      case 'amber':
        return { badge: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', color: 'amber', name: displayName };
      case 'slate':
      default:
        return { badge: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700', dot: 'bg-slate-500 dark:bg-slate-400', color: 'slate', name: displayName };
    }
  };

  // --- Concept Handlers ---
  const handleOpenCreateConcept = (preselectedCatId?: string) => {
    setEditingConcept(null);
    setFormConceptName('');
    const defaultCat = categories.find(c => c.id === preselectedCatId) || categories[0];
    setFormConceptCategoryId(defaultCat ? defaultCat.id : '');
    setFormConceptCategoryName(defaultCat ? defaultCat.name : 'General');
    setFormConceptDescription('');
    setFormConceptIsActive(true);
    setConceptError(null);
    setIsCreatingConcept(true);
  };

  const handleOpenEditConcept = (concept: ExpenseConcept) => {
    setEditingConcept(concept);
    setFormConceptName(concept.name);
    
    // Match category
    const cat = categories.find(c => c.id === concept.categoryId || c.name === concept.category);
    setFormConceptCategoryId(cat ? cat.id : (categories[0]?.id || ''));
    setFormConceptCategoryName(cat ? cat.name : (concept.category || 'General'));
    
    setFormConceptDescription(concept.description || '');
    setFormConceptIsActive(concept.isActive);
    setConceptError(null);
    setIsCreatingConcept(true);
  };

  const handleCancelConceptForm = () => {
    setIsCreatingConcept(false);
    setEditingConcept(null);
    setConceptError(null);
  };

  const handleSubmitConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConceptName.trim()) {
      setConceptError('El nombre del concepto de gasto es obligatorio');
      return;
    }

    const selectedCat = categories.find(c => c.id === formConceptCategoryId);
    const catName = selectedCat ? selectedCat.name : (formConceptCategoryName || 'General');

    const newConcept: ExpenseConcept = {
      id: editingConcept ? editingConcept.id : `exp-c-${Date.now()}`,
      name: formConceptName.trim(),
      category: catName,
      categoryId: selectedCat ? selectedCat.id : undefined,
      description: formConceptDescription.trim(),
      isActive: formConceptIsActive,
      isPreset: editingConcept ? editingConcept.isPreset : false,
      createdAt: editingConcept ? editingConcept.createdAt : new Date().toISOString(),
    };

    onSaveConcept(newConcept);
    handleCancelConceptForm();
  };

  // --- Category Handlers ---
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setFormCatName('');
    setFormCatCode('');
    setFormCatColor('amber');
    setFormCatDescription('');
    setFormCatIsActive(true);
    setCategoryError(null);
    setIsCreatingCategory(true);
  };

  const handleOpenEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormCatName(category.name);
    setFormCatCode(category.code || '');
    setFormCatColor(category.color || 'amber');
    setFormCatDescription(category.description || '');
    setFormCatIsActive(category.isActive);
    setCategoryError(null);
    setIsCreatingCategory(true);
  };

  const handleCancelCategoryForm = () => {
    setIsCreatingCategory(false);
    setEditingCategory(null);
    setCategoryError(null);
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCatName.trim()) {
      setCategoryError('El nombre de la categoría es obligatorio');
      return;
    }

    if (onSaveCategory) {
      const newCategory: ExpenseCategory = {
        id: editingCategory ? editingCategory.id : `cat-exp-${Date.now()}`,
        name: formCatName.trim(),
        code: formCatCode.trim().toUpperCase() || undefined,
        color: formCatColor,
        description: formCatDescription.trim() || undefined,
        isActive: formCatIsActive,
        isPreset: editingCategory ? editingCategory.isPreset : false,
        createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString(),
      };

      onSaveCategory(newCategory);
      handleCancelCategoryForm();
    }
  };

  const handleDeleteCategoryWithCheck = (categoryId: string) => {
    const assignedCount = concepts.filter(c => c.categoryId === categoryId || c.category === categories.find(x => x.id === categoryId)?.name).length;
    if (assignedCount > 0) {
      if (!confirm(`Esta categoría tiene ${assignedCount} concepto(s) de gasto asignado(s). ¿Desea eliminar la categoría de todos modos?`)) {
        return;
      }
    }
    if (onDeleteCategory) {
      onDeleteCategory(categoryId);
    }
  };

  // Filtered concepts
  const filteredConcepts = concepts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedCategoryFilter === 'all') return matchesSearch;
    return matchesSearch && (c.categoryId === selectedCategoryFilter || c.category === selectedCategoryFilter);
  });

  // Filtered categories
  const filteredCategories = categories.filter(cat => {
    return cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.code && cat.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"}>
      <div 
        id="expense-concepts-modal"
        className={embedded ? "relative w-full wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:bg-slate-900 dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] overflow-hidden flex flex-col" : "relative w-full max-w-5xl wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:bg-slate-900 dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] overflow-hidden flex flex-col max-h-[92vh]"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Gestión de Gastos y Salidas de Caja
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Panel Administrativo
                </span>
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Administra los conceptos y categorías autorizadas para egresos y compras de caja menor.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-5 mt-4 inline-flex w-fit max-w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setActiveTab('concepts');
              setIsCreatingConcept(false);
              setIsCreatingCategory(false);
              setSearchTerm('');
            }}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'concepts'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Conceptos de Gastos</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {concepts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              setIsCreatingConcept(false);
              setIsCreatingCategory(false);
              setSearchTerm('');
            }}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categorías de Gastos</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {categories.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* ========================================================================= */}
          {/* TAB 1: CONCEPTOS DE GASTOS                                                */}
          {/* ========================================================================= */}
          {activeTab === 'concepts' && (
            <>
              {/* Concept Creation / Edit Form */}
              {isCreatingConcept && (
                <form onSubmit={handleSubmitConcept} className="wz-surface bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,.3)]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      {editingConcept ? 'Editar Concepto de Gasto' : 'Crear Nuevo Concepto de Gasto'}
                    </h3>
                    <span className="text-[13px] text-slate-600 dark:text-slate-400">
                      {editingConcept?.isPreset ? 'Concepto Predeterminado' : 'Concepto Personalizado'}
                    </span>
                  </div>

                  {conceptError && (
                    <div className="rounded-xl border px-3.5 py-3 text-sm bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      {conceptError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Nombre del Concepto <span className="text-amber-700 dark:text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Compra de rollos térmicos POS, Refrigerio de turno..."
                        value={formConceptName}
                        onChange={(e) => setFormConceptName(e.target.value)}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                          Categoría de Gasto <span className="text-amber-700 dark:text-amber-400">*</span>
                        </label>
                        {onSaveCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('categories');
                              handleOpenCreateCategory();
                            }}
                            className="text-[13px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 min-h-[32px] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Crear Categoría</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={formConceptCategoryId}
                        onChange={(e) => {
                          const catId = e.target.value;
                          setFormConceptCategoryId(catId);
                          const found = categories.find(c => c.id === catId);
                          if (found) setFormConceptCategoryName(found.name);
                        }}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.code ? `(${cat.code})` : ''} {!cat.isActive ? '[Inactiva]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Descripción / Instrucciones para el Cajero (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Adjuntar siempre foto legible de la factura o soporte..."
                        value={formConceptDescription}
                        onChange={(e) => setFormConceptDescription(e.target.value)}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formConceptIsActive}
                          onChange={(e) => setFormConceptIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formConceptIsActive ? 'Concepto Activo (Disponible para cajeros)' : 'Concepto Inactivo (Oculto en caja)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelConceptForm}
                      className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition dark:from-blue-500 dark:to-blue-600 cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Guardar Concepto
                    </button>
                  </div>
                </form>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
                  <div className="relative flex-1 sm:w-64 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 top-4" />
                    <input
                      type="text"
                      placeholder="Buscar conceptos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="all">Todas las Categorías</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!isCreatingConcept && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateConcept()}
                    className="w-full sm:w-auto min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition dark:from-blue-500 dark:to-blue-600 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Concepto de Gasto
                  </button>
                )}
              </div>

              {/* Concepts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredConcepts.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                    <Receipt className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="font-display text-base font-bold text-slate-800 dark:text-slate-200">No se encontraron conceptos de gastos</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1">Crea un nuevo concepto para registrar salidas de caja autorizadas.</p>
                  </div>
                ) : (
                  filteredConcepts.map((concept) => {
                    const catInfo = getCategoryStyles(concept.categoryId || concept.category);
                    return (
                      <div
                        key={concept.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          concept.isActive 
                            ? 'wz-surface bg-white border-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] hover:-translate-y-px dark:bg-slate-900 dark:border-white/[0.07]' 
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">{concept.name}</h4>
                                {!concept.isActive && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              {concept.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {concept.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${catInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dot}`}></span>
                              {catInfo.name}
                            </span>
                            {concept.isPreset && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Predeterminado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onSaveConcept({ ...concept, isActive: !concept.isActive })}
                            className={`min-h-[44px] text-sm font-semibold px-3.5 rounded-xl border transition-colors cursor-pointer ${
                              concept.isActive
                                ? 'text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {concept.isActive ? '✓ Activo en Caja' : 'Desactivado'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditConcept(concept)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                              title="Editar concepto"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!concept.isPreset && (
                              <button
                                type="button"
                                onClick={() => onDeleteConcept(concept.id)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                                title="Eliminar concepto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CATEGORÍAS DE GASTOS                                              */}
          {/* ========================================================================= */}
          {activeTab === 'categories' && (
            <>
              {/* Category Creation / Edit Form */}
              {isCreatingCategory && (
                <form onSubmit={handleSubmitCategory} className="wz-surface bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,.3)]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {editingCategory ? 'Editar Categoría de Gasto' : 'Crear Nueva Categoría de Gasto'}
                    </h3>
                    <span className="text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                      {editingCategory?.isPreset ? 'Categoría Predeterminada' : 'Categoría Personalizada'}
                    </span>
                  </div>

                  {categoryError && (
                    <div className="rounded-xl border px-3.5 py-3 text-sm bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      {categoryError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Nombre de la Categoría <span className="text-amber-600 dark:text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Publicidad y Mercadeo, Seguridad y Vigilancia, Impuestos..."
                        value={formCatName}
                        onChange={(e) => setFormCatName(e.target.value)}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Código Corto / Sigla (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. PUB, SEG, IMP, MANT..."
                        maxLength={8}
                        value={formCatCode}
                        onChange={(e) => setFormCatCode(e.target.value.toUpperCase())}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 font-mono uppercase"
                      />
                    </div>

                    {/* Color Picker */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Color e Identidad Visual de la Categoría
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormCatColor(opt.id)}
                            className={`flex items-center gap-2 min-h-[48px] px-3 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 cursor-pointer ${
                              formCatColor === opt.id
                                ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                                : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.class.split(' ')[0]}`}></span>
                            <span className="truncate text-sm">{opt.name.split(' / ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Descripción o Alcance (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Qué tipo de egresos abarca esta categoría..."
                        value={formCatDescription}
                        onChange={(e) => setFormCatDescription(e.target.value)}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formCatIsActive}
                          onChange={(e) => setFormCatIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formCatIsActive ? 'Categoría Activa' : 'Categoría Inactiva'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelCategoryForm}
                      className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition dark:from-blue-500 dark:to-blue-600 cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Guardar Categoría
                    </button>
                  </div>
                </form>
              )}

              {/* Category Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 sm:w-64 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 top-4" />
                  <input
                    type="text"
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={handleOpenCreateCategory}
                    className="w-full sm:w-auto min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition dark:from-blue-500 dark:to-blue-600 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Categoría de Gasto
                  </button>
                )}
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCategories.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                    <FolderTree className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="font-display text-base font-bold text-slate-800 dark:text-slate-200">No se encontraron categorías de gastos</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1">Crea una nueva categoría para organizar los conceptos de egreso.</p>
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const style = getCategoryStyles(cat.id);
                    const associatedConcepts = concepts.filter(c => c.categoryId === cat.id || c.category === cat.name);

                    return (
                      <div
                        key={cat.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          cat.isActive 
                            ? 'wz-surface bg-white border-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] hover:-translate-y-px dark:bg-slate-900 dark:border-white/[0.07]' 
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${style.dot} shadow-xs`}></span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">{cat.name}</h4>
                                  {cat.code && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {cat.code}
                                    </span>
                                  )}
                                  {!cat.isActive && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      Inactiva
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {cat.description && (
                            <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-2 pl-6">
                              {cat.description}
                            </p>
                          )}

                          <div className="mt-3 pl-6 flex items-center gap-2 flex-wrap text-[13px] text-slate-600 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                              <Receipt className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              {associatedConcepts.length} concepto(s) asociado(s)
                            </span>
                            {cat.isPreset && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Predeterminada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onSaveCategory && onSaveCategory({ ...cat, isActive: !cat.isActive })}
                            className={`min-h-[44px] text-sm font-semibold px-3.5 rounded-xl border transition-colors cursor-pointer ${
                              cat.isActive
                                ? 'text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {cat.isActive ? '✓ Categoría Activa' : 'Inactiva'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                              title="Editar categoría"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!cat.isPreset && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategoryWithCheck(cat.id)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-4 flex-wrap">
            <div>
              Conceptos: <strong className="text-slate-900 dark:text-slate-100">{concepts.length}</strong> (
              <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{concepts.filter(c => c.isActive).length} activos</strong>)
            </div>
            <div>
              Categorías: <strong className="text-slate-900 dark:text-slate-100">{categories.length}</strong> (
              <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{categories.filter(c => c.isActive).length} activas</strong>)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};
