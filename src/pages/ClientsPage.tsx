import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, Form, Row, Col, Badge, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiPhone, FiUsers } from 'react-icons/fi';
import ResponsiveTable, { type Column } from '../components/ResponsiveTable';
import { 
  useCustomers, 
  useCreateCustomer, 
  useUpdateCustomer
} from '../features/customers/hooks/useCustomers';
import type { Customer, CreateCustomerDTO } from '../shared/types';
import { useSellers } from '../features/sellers/hooks/useSellers';
import { useCrudForm } from '../shared/hooks/useCrudForm';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../auth/AuthContext';
import CustomerHistoryActions from '../features/customers/components/CustomerHistoryActions';

const emptyCustomer: CreateCustomerDTO = { name: '', lastName: '', rfc: '', phone: '', sellerId: 0 };
const mapCustomerToForm = (c: Customer): CreateCustomerDTO => ({
  name: c.name,
  lastName: c.lastName,
  rfc: c.rfc,
  phone: c.phone,
  sellerId: c.sellerId,
});

export default function ClientsPage() {
  const { isCommissionist, user } = useAuth();
  const commissionistSellerId = isCommissionist && user?.sellerId ? user.sellerId : null;
  // Comisionista usa 'mine' para obtener solo sus clientes; admin usa 'all'
  const customerScope = isCommissionist ? 'mine' : 'all';
  const { data: customers = [], isLoading, error, refetch } = useCustomers(customerScope);
  const { data: sellers = [], isLoading: sellersLoading } = useSellers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    showModal, editingId, isEditing, formData, setFormData,
    formErrors, setFormErrors, handleOpenModal, handleCloseModal,
  } = useCrudForm<CreateCustomerDTO, Customer>({ emptyForm: emptyCustomer, mapEntityToForm: mapCustomerToForm });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSellerId, setFilterSellerId] = useState<number | null>(commissionistSellerId);

  // Obtener vendedores únicos de los clientes
  const customerSellers = useMemo(() => {
    const sellerIds = [...new Set(customers.map(c => c.sellerId).filter(Boolean))] as number[];
    return sellers.filter(s => sellerIds.includes(s.id));
  }, [customers, sellers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    // Comisionista: siempre filtra por su propio sellerId
    const effectiveSellerId = commissionistSellerId ?? filterSellerId;
    if (effectiveSellerId !== null) {
      result = result.filter((c) => c.sellerId === effectiveSellerId);
    }
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.rfc.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [customers, searchTerm, filterSellerId, commissionistSellerId]);

  const getSellerName = useCallback((sellerId: number) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? `${seller.name} ${seller.lastName}` : 'Sin asignar';
  }, [sellers]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.lastName.trim()) errors.lastName = 'El apellido es requerido';
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }
    if (formData.sellerId <= 0) errors.sellerId = 'Debe seleccionar un vendedor';
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner message="Cargando clientes..." />;

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
        <Button variant="primary" onClick={() => {
          handleOpenModal();
          if (commissionistSellerId) {
            setFormData(prev => ({ ...prev, sellerId: commissionistSellerId }));
          }
        }}>
          <FiPlus className="me-2" />
          Agregar Cliente
        </Button>
      </div>

      {/* Search and Stats */}
      <Row className="mb-4 g-2">
        <Col md={4}>
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
        {!isCommissionist && customerSellers.length > 1 && (
          <Col md={3}>
            <Form.Select
              value={filterSellerId ?? ''}
              onChange={(e) => setFilterSellerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos los vendedores</option>
              {customerSellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} {seller.lastName}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
        <Col className="d-flex align-items-center justify-content-md-end mt-2 mt-md-0">
          <Badge bg="secondary" className="fs-6">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
          </Badge>
        </Col>
      </Row>

      {/* Table */}
      <ResponsiveTable<Customer>
        data={filteredCustomers}
        keyExtractor={(c) => c.id}
        emptyMessage={searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
        columns={[
          {
            key: 'name',
            header: 'Cliente',
            isCardTitle: true,
            render: (c) => (
              <span>
                <strong>{c.name}</strong> {c.lastName}
              </span>
            ),
          },
          {
            key: 'phone',
            header: 'Teléfono',
            render: (c) => (
              <>
                <FiPhone className="me-1 text-muted" />
                {c.phone}
              </>
            ),
          },
          {
            key: 'rfc',
            header: 'RFC',
            render: (c) => c.rfc || '-',
          },
          {
            key: 'seller',
            header: 'Vendedor',
            render: (c) => (
              <Badge bg="info" text="dark">
                {getSellerName(c.sellerId)}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Acciones',
            headerClassName: 'text-center',
            isActions: true,
            render: (c) => (
              <>
                <CustomerHistoryActions customer={c} />
                <OverlayTrigger placement="top" overlay={<Tooltip>Editar</Tooltip>}>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleOpenModal(c)}
                    aria-label={`Editar ${c.name}`}
                  >
                    <FiEdit2 />
                  </Button>
                </OverlayTrigger>
              </>
            ),
          },
        ] satisfies Column<Customer>[]}
      />

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditing ? 'Editar Cliente' : 'Agregar Cliente'}
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

            {!isCommissionist && (
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
            )}
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

      {/* Mutation Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear cliente" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar cliente" />
      )}

    </div>
  );
}
