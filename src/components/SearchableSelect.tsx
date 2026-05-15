import { useState, useRef, useEffect, useId } from 'react';
import { Form, ListGroup, Badge } from 'react-bootstrap';
import { FiSearch, FiX } from 'react-icons/fi';

export interface SelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
}

/**
 * Dropdown con búsqueda en tiempo real.
 * Reemplaza <Form.Select> cuando la lista de opciones es larga.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  isInvalid = false,
  disabled = false,
  emptyLabel = 'Selecciona una opción',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange(0);
    setQuery('');
    setOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger — muestra el cliente seleccionado o placeholder */}
      <div
        className={`form-control d-flex align-items-center justify-content-between ${
          isInvalid ? 'is-invalid' : ''
        } ${disabled ? 'bg-light' : ''}`}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
          userSelect: 'none',
        }}
        onClick={handleInputClick}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleInputClick();
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        {selected ? (
          <span className="text-truncate">
            <strong>{selected.label}</strong>
            {selected.sublabel && (
              <small className="text-muted ms-2">{selected.sublabel}</small>
            )}
          </span>
        ) : (
          <span className="text-muted">{emptyLabel}</span>
        )}
        <span className="d-flex gap-1 ms-2 flex-shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              aria-label="Limpiar selección"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="text-muted"
              style={{ cursor: 'pointer' }}
            >
              <FiX size={14} />
            </span>
          )}
          <span className="text-muted" style={{ fontSize: '10px' }}>▼</span>
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="border rounded shadow bg-white"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1055,
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search input */}
          <div className="p-2 border-bottom">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <FiSearch size={13} className="text-muted" />
              </span>
              <input
                ref={inputRef}
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0]);
                }}
                autoComplete="off"
              />
              {query && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => setQuery('')}
                  tabIndex={-1}
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }} id={listId} role="listbox">
            {filtered.length === 0 ? (
              <div className="text-center text-muted py-3 small">
                No se encontraron resultados
              </div>
            ) : (
              <ListGroup variant="flush">
                {filtered.map((opt) => (
                  <ListGroup.Item
                    key={opt.value}
                    action
                    active={opt.value === value}
                    onClick={() => handleSelect(opt)}
                    className="py-2 px-3"
                    role="option"
                    aria-selected={opt.value === value}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                      {opt.label}
                    </div>
                    {opt.sublabel && (
                      <small className="text-muted">{opt.sublabel}</small>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>

          {/* Counter */}
          {options.length > 5 && (
            <div className="border-top px-3 py-1 bg-light d-flex justify-content-between align-items-center">
              <small className="text-muted">
                {filtered.length} de {options.length}
              </small>
              {query && (
                <Badge bg="secondary" pill style={{ fontSize: '10px' }}>
                  filtrando
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
