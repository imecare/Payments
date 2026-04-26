import { useState, useCallback, useMemo } from 'react';
import { Button, Table, Modal, Form, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiPhone, FiUser } from 'react-icons/fi';
import { 
  useSellers, 
  useCreateSeller, 
  useUpdateSeller, 
  useDeleteSeller
} from '../features/sellers/hooks/useSellers';
import type { Seller, CreateSellerDTO } from '../shared/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ConfirmModal from '../components/ConfirmModal';

const emptySeller: CreateSellerDTO = { 
  name: '', 
  lastName: '', 
  phone: '' 
};

export default function SellersPage() {
  // Data fetching with React Query
  const { data: sellers = [], isLoading, error, refetch } = useSellers();
  const createMutation = useCreateSeller();
  const updateMutation = useUpdateSeller();
  const deleteMutation = useDeleteSeller();

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateSellerDTO>(emptySeller);
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered sellers based on search
  const filteredSellers = useMemo(() => {
    if (!searchTerm.trim()) return sellers;
    const term = searchTerm.toLowerCase();
    return sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.phone.includes(term)
    );
  }, [sellers, searchTerm]);

  // Handlers
  const handleOpenModal = useCallback((seller?: Seller) => {
    if (seller) {
      setEditingId(seller.id);
      setFormData({
        name: seller.name,
        lastName: seller.lastName,
        phone: seller.phone,
      });
    } else {
      setEditingId(null);
      setFormData(emptySeller);
    }
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptySeller);
    setFormErrors({});
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es requerido';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'El apellido debe tener al menos 2 caracteres';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving seller:', err);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    
    try {
      await deleteMutation.mutateAsync(editingId);
      setShowDeleteModal(false);
      setEditingId(null);
    } catch (err) {
      console.error('Error deleting seller:', err);
    }
  };

  const openDeleteModal = (seller: Seller) => {
    setEditingId(seller.id);
    setShowDeleteModal(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Render
  if (isLoading) {
    return <LoadingSpinner message="Cargando vendedores..." />;
  }

  if (error) {
    return <ErrorAlert error={error} title="Error al cargar vendedores" onRetry={refetch} />;
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="mb-1">
            <FiUser className="me-2" />
            Vendedores
          </h4>
          <p className="text-muted mb-0">
            Gestiona los vendedores/ayudantes del sistema
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <FiPlus className="me-2" />
          Agregar Vendedor
        </Button>
      </div>

      {/* Search and Stats */}
      <Row className="mb-4">
        <Col md={6} lg={4}>
          <InputGroup>
            <InputGroup.Text>
              <FiSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar vendedores"
            />
          </InputGroup>
        </Col>
        <Col md={6} lg={8} className="d-flex align-items-center justify-content-md-end mt-3 mt-md-0">
          <Badge bg="secondary" className="fs-6">
            {filteredSellers.length} vendedor{filteredSellers.length !== 1 ? 'es' : ''}
          </Badge>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover className="align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Teléfono</th>
              <th>Fecha de Registro</th>
              <th style={{ width: '150px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSellers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted">
                  {searchTerm ? 'No se encontraron vendedores' : 'No hay vendedores registrados'}
                </td>
              </tr>
            ) : (
              filteredSellers.map((seller) => (
                <tr key={seller.id}>
                  <td>
                    <Badge bg="light" text="dark">#{seller.id}</Badge>
                  </td>
                  <td>
                    <strong>{seller.name}</strong> {seller.lastName}
                  </td>
                  <td>
                    <FiPhone className="me-2 text-muted" />
                    {seller.phone}
                  </td>
                  <td>
                    {new Date(seller.date).toLocaleDateString('es-MX')}
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="me-2"
                      onClick={() => handleOpenModal(seller)}
                      aria-label={`Editar ${seller.name}`}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-danger"
                      onClick={() => openDeleteModal(seller)}
                      aria-label={`Eliminar ${seller.name}`}
                    >
                      <FiTrash2 />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar Vendedor' : 'Agregar Vendedor'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isInvalid={!!formErrors.name}
                placeholder="Ingresa el nombre"
                aria-describedby="nameError"
              />
              <Form.Control.Feedback type="invalid" id="nameError">
                {formErrors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Apellido *</Form.Label>
              <Form.Control
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                isInvalid={!!formErrors.lastName}
                placeholder="Ingresa el apellido"
                aria-describedby="lastNameError"
              />
              <Form.Control.Feedback type="invalid" id="lastNameError">
                {formErrors.lastName}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Teléfono *</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FiPhone />
                </InputGroup.Text>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  isInvalid={!!formErrors.phone}
                  placeholder="10 dígitos"
                  aria-describedby="phoneError"
                />
                <Form.Control.Feedback type="invalid" id="phoneError">
                  {formErrors.phone}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Vendedor"
        message="¿Estás seguro de que deseas eliminar este vendedor? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Mutation Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear vendedor" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar vendedor" />
      )}
      {deleteMutation.isError && (
        <ErrorAlert error={deleteMutation.error} title="Error al eliminar vendedor" />
      )}
    </div>
  );
}
