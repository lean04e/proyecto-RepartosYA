import { useState } from 'react'
import './CommercesSection.css'

const INITIAL_VISIBLE_COUNT = 6

function CommercesSection({ commerces }) {
  const [sort, setSort] = useState({ key: 'orders', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  const sortedCommerces = [...commerces].sort((firstCommerce, secondCommerce) => {
    const firstValue = firstCommerce[sort.key]
    const secondValue = secondCommerce[sort.key]
    const comparison =
      typeof firstValue === 'string'
        ? firstValue.localeCompare(secondValue, 'es')
        : firstValue - secondValue

    return sort.direction === 'asc' ? comparison : -comparison
  })

  const visibleCommerces = sortedCommerces.slice(0, visibleCount)
  const canShowMore = visibleCount < sortedCommerces.length

  const handleSort = (key) => {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <section className="commerces-section" aria-labelledby="commerces-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gestion de operaciones</p>
          <h1 id="commerces-title">Comercios</h1>
        </div>
        <div className="section-summary" aria-label="Resumen de comercios">
          <strong>{commerces.length}</strong>
          <span>comercios registrados</span>
        </div>
      </div>

      <div className="table-frame">
        <div className="table-scroll">
          <table className="commerce-table">
            <caption className="sr-only">Listado de comercios registrados</caption>
            <thead>
              <tr>
                <SortableHeader
                  column="name"
                  label="Nombre del comercio"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableHeader
                  column="orders"
                  label="Número de pedidos en el último mes"
                  sort={sort}
                  onSort={handleSort}
                  className="orders-column"
                />
                <th scope="col">Teléfono</th>
                <SortableHeader
                  column="address"
                  label="Dirección"
                  sort={sort}
                  onSort={handleSort}
                  className="address-column"
                />
                <th scope="col" className="actions-column">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCommerces.map((commerce) => (
                <tr key={commerce.id}>
                  <th scope="row" data-label="Nombre del comercio">
                    <span className="commerce-name">{commerce.name}</span>
                  </th>
                  <td data-label="Pedidos último mes" className="orders-cell">
                    {commerce.orders.toLocaleString('es-AR')}
                  </td>
                  <td data-label="Teléfono">{commerce.phone}</td>
                  <td data-label="Dirección">{commerce.address}</td>
                  <td className="row-actions" data-label="Acciones">
                    <button
                      className="action-button"
                      type="button"
                      aria-label={`Editar ${commerce.name}`}
                      title={`Editar ${commerce.name}`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="action-button action-button-danger"
                      type="button"
                      aria-label={`Borrar ${commerce.name}`}
                      title={`Borrar ${commerce.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {canShowMore && (
                <tr className="show-more-row">
                  <td colSpan="5">
                    <button
                      className="show-more-button"
                      type="button"
                      onClick={() => setVisibleCount((count) => count + 4)}
                    >
                      Mostrar más
                      <ChevronDownIcon />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function SortableHeader({ column, label, sort, onSort, className = '' }) {
  const isActive = sort.key === column
  const directionLabel = isActive
    ? sort.direction === 'asc'
      ? 'ascendente'
      : 'descendente'
    : 'sin ordenar'

  return (
    <th scope="col" className={className} aria-sort={isActive ? sort.direction : 'none'}>
      <button
        className={`sort-button ${isActive ? 'is-active' : ''}`}
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Ordenar por ${label}, ${directionLabel}`}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sort.direction : null} />
      </button>
    </th>
  )
}

function SortIcon({ direction }) {
  return (
    <span className={`sort-icon ${direction ? `sort-${direction}` : ''}`} aria-hidden="true">
      <ChevronUpIcon />
      <ChevronDownIcon />
    </span>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 5.5 4 4M4 20l3.8-.8L19.3 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v5M14 11v5M6.5 7l.7 13h9.6l.7-13M9 7V4h6v3" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

export default CommercesSection