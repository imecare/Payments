import { useState, useCallback, useMemo } from 'react';
import { Button, Table, Modal, Form, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiPhone, FiUsers } from 'react-icons/fi';
import { 
  useCustomers, 
  useCreateCustomer, 
  useUpdateCustomer, 
  useDeleteCustomer
} from '../features/customers/hooks/useCustomers';
import type { Customer, CreateCustomerDTO } from '../shared/types';
import { useSellers } from '../features/sellers/hooks/useSellers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ConfirmModal from '../components/ConfirmModal';

const emptyCustomer: CreateCustomerDTO = { 
  name: '', 
  lastName: '', 
  rfc: '',
  phone: '',
  sellerId: 0
};

export default function ClientsPage() {
  // Data fetching with React Query
  const { data: customers = [], isLoading, error, refetch } = useCustomers();
  const { data: sellers = [], isLoading: sellersLoading } = useSellers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateCustomerDTO>(emptyCustomer);
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.rfc.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Get seller name by ID
  const getSellerName = useCallback((sellerId: number) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? `${seller.name} ${seller.lastName}` : 'Sin asignar';
  }, [sellers]);

  // Handlers
  const handleOpenModal = useCallback((customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        lastName: customer.lastName,
        rfc: customer.rfc,
        phone: customer.phone,
        sellerId: customer.sellerId,
      });
    } else {
      setEditingId(null);
      setFormData(emptyCustomer);
    }
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyCustomer);
    setFormErrors({});
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es requerido';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }
    
    if (formData.sellerId <= 0) {
      errors.sellerId = 'Debe seleccionar un vendedor';
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
      console.error('Error saving customer:', err);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    
    try {
      await deleteMutation.mutateAsync(editingId);
      setShowDeleteModal(false);
      setEditingId(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  const openDeleteModal = (customer: Customer) => {
    setEditingId(customer.id);
    setShowDeleteModal(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Render
  if (isLoading) {
    return <LoadingSpinner message="Cargando clientes..." />;
  }

  if (error) {
    return <ErrorAlert error={error} title="Error al cargar clientes" onRetry={refetch} />;
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="mb-1">
            <FiUsers className="me-2" />
            Clientes
          </h4>
          <p className="text-muted mb-0">
            Gestiona los clientes y sus datos de contacto
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <FiPlus className="me-2" />
          Agregar Cliente
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
              placeholder="Buscar por nombre, teléfono o RFC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar clientes"
            />
          </InputGroup>
        </Col>
        <Col md={6} lg={8} className="d-flex align-items-center justify-content-md-end mt-3 mt-md-0">
          <Badge bg="secondary" className="fs-6">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
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
              <th>RFC</th>
              <th>Vendedor Asignado</th>
              <th style={{ width: '150px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Badge bg="light" text="dark">#{customer.id}</Badge>
                  </td>
                  <td>
                    <strong>{customer.name}</strong> {customer.lastName}
                  </td>
                  <td>
                    <FiPhone className="me-2 text-muted" />
                    {customer.phone}
                  </td>
                  <td>{customer.rfc || '-'}</td>
                  <td>
                    <Badge bg="info" text="dark">
                      {getSellerName(customer.sellerId)}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="me-2"
                      onClick={() => handleOpenModal(customer)}
                      aria-label={`Editar ${customer.name}`}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-danger"
                      onClick={() => openDeleteModal(customer)}
                      aria-label={`Eliminar ${customer.name}`}
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
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar Cliente' : 'Agregar Cliente'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    isInvalid={!!formErrors.name}
                    placeholder="Ingresa el nombre"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Apellido *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    isInvalid={!!formErrors.lastName}
                    placeholder="Ingresa el apellido"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.lastName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
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
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.phone}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>RFC</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="Opcional (12-13 caracteres)"
                    maxLength={13}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Vendedor Asignado *</Form.Label>
              <Form.Select
                value={formData.sellerId}
                onChange={(e) => setFormData({ ...formData, sellerId: Number(e.target.value) })}
                isInvalid={!!formErrors.sellerId}
                disabled={sellersLoading}
              >
                <option value={0}>Selecciona un vendedor</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} {seller.lastName}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {formErrors.sellerId}
              </Form.Control.Feedback>
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
        title="Eliminar Cliente"
        message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Mutation Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear cliente" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar cliente" />
      )}
      {deleteMutation.isError && (
        <ErrorAlert error={deleteMutation.error} title="Error al eliminar cliente" />
      )}
    </div>
  );
}
