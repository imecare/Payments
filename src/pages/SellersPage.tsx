import { useState, useMemo } from 'react';
import { Button, Table, Modal, Form, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiPhone, FiUser, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { 
  useSellers, 
  useCreateSeller, 
  useUpdateSeller, 
  useToggleSellerStatus
} from '../features/sellers/hooks/useSellers';
import type { Seller, CreateSellerDTO } from '../shared/types';
import { useCrudForm } from '../shared/hooks/useCrudForm';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

const emptySeller: CreateSellerDTO = { name: '', lastName: '', phone: '' };
const mapSellerToForm = (s: Seller): CreateSellerDTO => ({
  name: s.name,
  lastName: s.lastName,
  phone: s.phone,
});

export default function SellersPage() {
  const { data: sellers = [], isLoading, error, refetch } = useSellers();
  const createMutation = useCreateSeller();
  const updateMutation = useUpdateSeller();
  const toggleStatusMutation = useToggleSellerStatus();

  const {
    showModal, editingId, isEditing, formData, setFormData,
    formErrors, setFormErrors, handleOpenModal, handleCloseModal,
  } = useCrudForm<CreateSellerDTO, Seller>({ emptyForm: emptySeller, mapEntityToForm: mapSellerToForm });

  const [searchTerm, setSearchTerm] = useState('');

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

  const handleToggleStatus = async (seller: Seller) => {
    const newStatus = seller.statusId === 1 ? 0 : 1;
    try {
      await toggleStatusMutation.mutateAsync({ id: seller.id, statusId: newStatus });
    } catch (err) {
      console.error('Error toggling seller status:', err);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner message="Cargando vendedores..." />;

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
              <th>Estado</th>
              <th>Fecha de Registro</th>
              <th style={{ width: '200px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSellers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">
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
                    <Badge bg={seller.statusId === 1 ? 'success' : 'secondary'}>
                      {seller.statusId === 1 ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    {new Date(seller.date).toLocaleDateString('es-MX')}
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant={seller.statusId === 1 ? 'outline-danger' : 'outline-success'}
                      className="me-2"
                      onClick={() => handleToggleStatus(seller)}
                      disabled={toggleStatusMutation.isPending}
                      aria-label={seller.statusId === 1 ? 'Desactivar' : 'Activar'}
                      title={seller.statusId === 1 ? 'Desactivar vendedor' : 'Activar vendedor'}
                    >
                      {seller.statusId === 1 ? <FiToggleRight /> : <FiToggleLeft />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="me-2"
                      onClick={() => handleOpenModal(seller)}
                      aria-label={`Editar ${seller.name}`}
                    >
                      <FiEdit2 />
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
            {isEditing ? 'Editar Vendedor' : 'Agregar Vendedor'}
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

      {toggleStatusMutation.isError && (
        <ErrorAlert error={toggleStatusMutation.error} title="Error al cambiar estado" />
      )}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear vendedor" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar vendedor" />
      )}
    </div>
  );
}
