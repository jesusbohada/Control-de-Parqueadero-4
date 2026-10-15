import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Receipt, 
  FileText, 
  Tag, 
  AlertCircle,
  FolderPlus,
  Layers,
  Search,
  Sparkles,
  Palette,
  CheckCircle2,
  ListOrdered,
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
        badge: 'text-slate-600 dark:text-slate-300 bg-slate-800/80 border-slate-700',
        dot: 'bg-slate-400',
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
        return { badge: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400', color: 'blue', name: displayName };
      case 'emerald':
        return { badge: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400', color: 'emerald', name: displayName };
      case 'orange':
        return { badge: 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-400', color: 'orange', name: displayName };
      case 'purple':
        return { badge: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30', dot: 'bg-purple-400', color: 'purple', name: displayName };
      case 'rose':
        return { badge: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-400', color: 'rose', name: displayName };
      case 'cyan':
        return { badge: 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30', dot: 'bg-cyan-400', color: 'cyan', name: displayName };
      case 'indigo':
        return { badge: 'text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30', dot: 'bg-indigo-400', color: 'indigo', name: displayName };
      case 'amber':
        return { badge: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400', color: 'amber', name: displayName };
      case 'slate':
      default:
        return { badge: 'text-slate-600 dark:text-slate-300 bg-slate-800 border-slate-700', dot: 'bg-slate-400', color: 'slate', name: displayName };
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
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"}>
      <div 
        id="expense-concepts-modal"
        className={embedded ? "relative w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col" : "relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Gestión de Gastos y Salidas de Caja
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  Panel Administrativo
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                Administra los conceptos y categorías autorizadas para egresos y compras de caja menor.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('concepts');
              setIsCreatingConcept(false);
              setIsCreatingCategory(false);
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'concepts'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/60 rounded-t-lg'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Conceptos de Gastos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
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
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/60 rounded-t-lg'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categorías de Gastos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {categories.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* ========================================================================= */}
          {/* TAB 1: CONCEPTOS DE GASTOS                                                */}
          {/* ========================================================================= */}
          {activeTab === 'concepts' && (
            <>
              {/* Concept Creation / Edit Form */}
              {isCreatingConcept && (
                <form onSubmit={handleSubmitConcept} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      {editingConcept ? 'Editar Concepto de Gasto' : 'Crear Nuevo Concepto de Gasto'}
                    </h3>
                    <span className="text-xs text-slate-700 dark:text-slate-200">
                      {editingConcept?.isPreset ? 'Concepto Predeterminado' : 'Concepto Personalizado'}
                    </span>
                  </div>

                  {conceptError && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                      {conceptError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Nombre del Concepto <span className="text-amber-700 dark:text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Compra de rollos térmicos POS, Refrigerio de turno..."
                        value={formConceptName}
                        onChange={(e) => setFormConceptName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Categoría de Gasto <span className="text-amber-700 dark:text-amber-400">*</span>
                        </label>
                        {onSaveCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('categories');
                              handleOpenCreateCategory();
                            }}
                            className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.code ? `(${cat.code})` : ''} {!cat.isActive ? '[Inactiva]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Descripción / Instrucciones para el Cajero (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Adjuntar siempre foto legible de la factura o soporte..."
                        value={formConceptDescription}
                        onChange={(e) => setFormConceptDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
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
                        <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {formConceptIsActive ? 'Concepto Activo (Disponible para cajeros)' : 'Concepto Inactivo (Oculto en caja)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelConceptForm}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    <Search className="w-4 h-4 text-slate-600 dark:text-slate-300 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar conceptos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
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
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Concepto de Gasto
                  </button>
                )}
              </div>

              {/* Concepts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredConcepts.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Receipt className="w-8 h-8 text-slate-600 dark:text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No se encontraron conceptos de gastos</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Crea un nuevo concepto para registrar salidas de caja autorizadas.</p>
                  </div>
                ) : (
                  filteredConcepts.map((concept) => {
                    const catInfo = getCategoryStyles(concept.categoryId || concept.category);
                    return (
                      <div
                        key={concept.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          concept.isActive 
                            ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-950/40 border-slate-900 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{concept.name}</h4>
                                {!concept.isActive && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              {concept.description && (
                                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                                  {concept.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${catInfo.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dot}`}></span>
                              {catInfo.name}
                            </span>
                            {concept.isPreset && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                                Predeterminado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onSaveConcept({ ...concept, isActive: !concept.isActive })}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              concept.isActive
                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                                : 'text-slate-200 border-slate-800 bg-slate-900 hover:text-white'
                            }`}
                          >
                            {concept.isActive ? '✓ Activo en Caja' : 'Desactivado'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditConcept(concept)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Editar concepto"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!concept.isPreset && (
                              <button
                                type="button"
                                onClick={() => onDeleteConcept(concept.id)}
                                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:text-red-700 dark:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
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
                <form onSubmit={handleSubmitCategory} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      {editingCategory ? 'Editar Categoría de Gasto' : 'Crear Nueva Categoría de Gasto'}
                    </h3>
                    <span className="text-xs text-slate-700 dark:text-slate-200">
                      {editingCategory?.isPreset ? 'Categoría Predeterminada' : 'Categoría Personalizada'}
                    </span>
                  </div>

                  {categoryError && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                      {categoryError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Nombre de la Categoría <span className="text-amber-700 dark:text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Publicidad y Mercadeo, Seguridad y Vigilancia, Impuestos..."
                        value={formCatName}
                        onChange={(e) => setFormCatName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Código Corto / Sigla (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. PUB, SEG, IMP, MANT..."
                        maxLength={8}
                        value={formCatCode}
                        onChange={(e) => setFormCatCode(e.target.value.toUpperCase())}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none uppercase"
                      />
                    </div>

                    {/* Color Picker */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        Color e Identidad Visual de la Categoría
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormCatColor(opt.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              formCatColor === opt.id
                                ? 'border-amber-500 bg-amber-50 text-slate-950 ring-2 ring-amber-400/40 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.class.split(' ')[0]}`}></span>
                            <span className="truncate text-[11px]">{opt.name.split(' / ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Descripción o Alcance (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Qué tipo de egresos abarca esta categoría..."
                        value={formCatDescription}
                        onChange={(e) => setFormCatDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
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
                        <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {formCatIsActive ? 'Categoría Activa' : 'Categoría Inactiva'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelCategoryForm}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  <Search className="w-4 h-4 text-slate-600 dark:text-slate-300 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={handleOpenCreateCategory}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Categoría de Gasto
                  </button>
                )}
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCategories.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <FolderTree className="w-8 h-8 text-slate-600 dark:text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No se encontraron categorías de gastos</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Crea una nueva categoría para organizar los conceptos de egreso.</p>
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const style = getCategoryStyles(cat.id);
                    const associatedConcepts = concepts.filter(c => c.categoryId === cat.id || c.category === cat.name);

                    return (
                      <div
                        key={cat.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          cat.isActive 
                            ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-950/40 border-slate-900 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${style.dot} shadow-xs`}></span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</h4>
                                  {cat.code && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                      {cat.code}
                                    </span>
                                  )}
                                  {!cat.isActive && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                      Inactiva
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {cat.description && (
                            <p className="text-xs text-slate-700 dark:text-slate-200 mt-2 pl-6">
                              {cat.description}
                            </p>
                          )}

                          <div className="mt-3 pl-6 flex items-center gap-2 flex-wrap text-xs text-slate-700 dark:text-slate-200">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                              <Receipt className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              {associatedConcepts.length} concepto(s) asociado(s)
                            </span>
                            {cat.isPreset && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                                Predeterminada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onSaveCategory && onSaveCategory({ ...cat, isActive: !cat.isActive })}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              cat.isActive
                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                                : 'text-slate-200 border-slate-800 bg-slate-900 hover:text-white'
                            }`}
                          >
                            {cat.isActive ? '✓ Categoría Activa' : 'Inactiva'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Editar categoría"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!cat.isPreset && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategoryWithCheck(cat.id)}
                                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:text-red-700 dark:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-4 flex-wrap">
            <div>
              Conceptos: <strong className="text-slate-700 dark:text-slate-200">{concepts.length}</strong> (
              <strong className="text-emerald-700 dark:text-emerald-400">{concepts.filter(c => c.isActive).length} activos</strong>)
            </div>
            <div>
              Categorías: <strong className="text-slate-700 dark:text-slate-200">{categories.length}</strong> (
              <strong className="text-emerald-700 dark:text-emerald-400">{categories.filter(c => c.isActive).length} activas</strong>)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};
