import type { ReactNode } from 'react';
import { Table, Card } from 'react-bootstrap';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Si true, esta columna se muestra como encabezado de la card en mobile */
  isCardTitle?: boolean;
  /** Si true, esta columna se muestra en la sección de acciones al pie de la card */
  isActions?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  className?: string;
}

/** 
 * Tabla responsiva: tabla completa en desktop (≥768px), 
 * tarjetas Bootstrap apiladas en móvil (<768px).
 * No usa CSS para transformar la tabla — usa d-none/d-block de Bootstrap.
 */
function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No hay datos registrados',
  striped = true,
  hover = true,
  bordered = true,
  className = '',
}: ResponsiveTableProps<T>) {

  const regularColumns = columns.filter((c) => !c.isActions);
  const titleColumn = columns.find((c) => c.isCardTitle) ?? columns[0];
  const actionsColumn = columns.find((c) => c.isActions);

  if (data.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p className="mb-0">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── DESKTOP: tabla estándar ── */}
      <div className="d-none d-md-block">
        <Table
          striped={striped}
          bordered={bordered}
          hover={hover}
          className={`align-middle mb-0 ${className}`}
        >
          <thead className="table-dark">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ── MOBILE: tarjetas apiladas ── */}
      <div className="d-md-none">
        {data.map((item) => (
          <Card key={keyExtractor(item)} className="mb-3 shadow-sm border">
            {/* Encabezado de la card: columna marcada como título */}
            <Card.Header className="bg-light d-flex align-items-center py-2 px-3">
              <span className="fw-bold">{titleColumn.render(item)}</span>
            </Card.Header>

            <Card.Body className="p-0">
              {regularColumns
                .filter((col) => col.key !== titleColumn.key)
                .map((col) => (
                  <div
                    key={col.key}
                    className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
                    style={{ minHeight: '2.5rem' }}
                  >
                    <small className="text-muted fw-semibold text-nowrap me-3">
                      {col.header}
                    </small>
                    <div className="text-end">{col.render(item)}</div>
                  </div>
                ))}
            </Card.Body>

            {/* Pie de la card: acciones */}
            {actionsColumn && (
              <Card.Footer className="bg-light d-flex justify-content-center gap-2 py-2">
                {actionsColumn.render(item)}
              </Card.Footer>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

export default ResponsiveTable;
