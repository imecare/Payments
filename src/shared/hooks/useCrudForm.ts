/**
 * Generic hook for create/edit modal forms.
 * Encapsulates: showModal, editingId, formData, formErrors, open/close handlers.
 *
 * Usage:
 *   // Define these at module level (stable references)
 *   const emptyForm: MyDTO = { name: '' };
 *   const mapEntityToForm = (e: MyEntity): MyDTO => ({ name: e.name });
 *
 *   // Inside component:
 *   const form = useCrudForm<MyDTO, MyEntity>({ emptyForm, mapEntityToForm });
 */
import { useState, useCallback } from 'react';

interface UseCrudFormOptions<TForm, TEntity extends { id: number }> {
  emptyForm: TForm;
  mapEntityToForm: (entity: TEntity) => TForm;
}

export interface UseCrudFormResult<TForm, TEntity extends { id: number }> {
  showModal: boolean;
  editingId: number | null;
  /** true when editing an existing entity */
  isEditing: boolean;
  formData: TForm;
  setFormData: React.Dispatch<React.SetStateAction<TForm>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Open modal for creating (no arg) or editing (pass entity) */
  handleOpenModal: (entity?: TEntity) => void;
  /** Close modal and reset all state */
  handleCloseModal: () => void;
}

export function useCrudForm<TForm, TEntity extends { id: number }>({
  emptyForm,
  mapEntityToForm,
}: UseCrudFormOptions<TForm, TEntity>): UseCrudFormResult<TForm, TEntity> {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenModal = useCallback(
    (entity?: TEntity) => {
      if (entity) {
        setEditingId(entity.id);
        setFormData(mapEntityToForm(entity));
      } else {
        setEditingId(null);
        setFormData(emptyForm);
      }
      setFormErrors({});
      setShowModal(true);
    },
    [emptyForm, mapEntityToForm]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
  }, [emptyForm]);

  return {
    showModal,
    editingId,
    isEditing: editingId !== null,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    handleOpenModal,
    handleCloseModal,
  };
}
