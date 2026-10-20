import { useState } from 'react'
import './CommercesSection.css'
import './OrdersSection.css'

const INITIAL_VISIBLE_COUNT = 6
const VISIBLE_COUNT_STEP = 4
const ALL_STATUSES = 'todos'

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', order: 0 },
  'en-curso': { label: 'En curso', order: 1 },
  entregado: { label: 'Entregado', order: 2 },
  cancelado: { label: 'Cancelado', order: 3 },
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Normaliza el texto para buscar sin distinguir mayúsculas ni tildes.
function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es')
}

function formatDateTime(isoDate) {
  return dateTimeFormatter.format(new Date(isoDate)).replace(',', '')
}

// Devuelve el resultado ascendente de comparar dos pedidos por la columna indicada.
function compareOrders(firstOrder, secondOrder, key) {
  switch (key) {
    case 'date':
      return new Date(firstOrder.createdAt) - new Date(secondOrder.createdAt)
    case 'id':
      return firstOrder.id.localeCompare(secondOrder.id, 'es', { numeric: true })
    case 'driver':
      return firstOrder.driver.localeCompare(secondOrder.driver, 'es')
    case 'destination':
      return firstOrder.destination.localeCompare(secondOrder.destination, 'es')
    case 'status':
      return STATUS_CONFIG[firstOrder.status].order - STATUS_CONFIG[secondOrder.status].order
    default:
      return 0
  }
}

function OrdersSection({ orders }) {
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const normalizedSearchTerm = normalizeText(searchTerm.trim())
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      [order.id, order.driver ?? '', order.destination].some((value) =>
        normalizeText(value).includes(normalizedSearchTerm),
      )
    const matchesStatus =
      !statusFilter || statusFilter === ALL_STATUSES || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const sortedOrders = [...filteredOrders].sort((firstOrder, secondOrder) => {
    // Los pedidos sin repartidor siempre quedan al final, sin importar la dirección.
    if (sort.key === 'driver') {
      if (!firstOrder.driver && !secondOrder.driver) return 0
      if (!firstOrder.driver) return 1
      if (!secondOrder.driver) return -1
    }

    const comparison = compareOrders(firstOrder, secondOrder, sort.key)
    return sort.direction === 'asc' ? comparison : -comparison
  })

  const visibleOrders = sortedOrders.slice(0, visibleCount)
  const canShowMore = visibleCount < sortedOrders.length

  const handleSort = (key) => {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value)
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }

  return (
    <section className="orders-section" aria-labelledby="orders-list-title">
      <h2 id="orders-list-title" className="orders-list-title">Listado de pedidos</h2>

      <div className="commerce-filters" aria-label="Filtros de pedidos">
        <label className="search-filter" htmlFor="order-search">
          <span className="sr-only">Buscar pedido por ID, repartidor o dirección</span>
          <div className="filter-input-wrapper">
            <SearchIcon />
            <input
              id="order-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar por ID, repartidor o dirección"
            />
          </div>
        </label>
        <label className="order-status-filter" htmlFor="order-status-filter">
          <span className="sr-only">Estado del pedido</span>
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className={statusFilter ? '' : 'is-placeholder'}
          >
            <option value="" disabled hidden>
              Estado del pedido
            </option>
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value={ALL_STATUSES}>Todos</option>
          </select>
        </label>
      </div>

      <div className="table-frame">
        <div className="table-scroll">
          <table className="commerce-table orders-table">
            <caption className="sr-only">Listado de pedidos registrados</caption>
            <thead>
              <tr>
                <SortableHeader column="date" label="Fecha y hora" sort={sort} onSort={handleSort} />
                <SortableHeader column="id" label="ID" sort={sort} onSort={handleSort} />
                <SortableHeader column="driver" label="Repartidor" sort={sort} onSort={handleSort} />
                <SortableHeader column="destination" label="Destino" sort={sort} onSort={handleSort} />
                <SortableHeader column="status" label="Estado" sort={sort} onSort={handleSort} />
                <th scope="col" className="actions-column">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Fecha y hora" className="order-date-cell">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <th scope="row" data-label="ID">
                    <span className="commerce-name">{order.id}</span>
                  </th>
                  <td data-label="Repartidor">
                    {order.driver ?? <span className="unassigned-driver">Sin asignar</span>}
                  </td>
                  <td data-label="Destino">{order.destination}</td>
                  <td data-label="Estado">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="actions-cell" data-label="Acciones">
                    <div className="row-actions">
                      <button
                        className="action-button"
                        type="button"
                        aria-label={`Modificar pedido ${order.id}`}
                        title={`Modificar pedido ${order.id}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="action-button action-button-danger"
                        type="button"
                        aria-label={`Cancelar pedido ${order.id}`}
                        title={`Cancelar pedido ${order.id}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleOrders.length === 0 && (
                <tr className="empty-results-row">
                  <td colSpan="6">No se encontraron pedidos con esos filtros.</td>
                </tr>
              )}
              {canShowMore && (
                <tr className="show-more-row">
                  <td colSpan="6">
                    <button
                      className="show-more-button"
                      type="button"
                      onClick={() => setVisibleCount((count) => count + VISIBLE_COUNT_STEP)}
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

function SortableHeader({ column, label, sort, onSort }) {
  const isActive = sort.key === column
  const directionLabel = isActive
    ? sort.direction === 'asc'
      ? 'ascendente'
      : 'descendente'
    : 'sin ordenar'

  return (
    <th scope="col" aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        className={`sort-button ${isActive ? 'is-active' : ''}`}
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Ordenar por ${label}, ${directionLabel}`}
      >
        <span>{label}</span>
        <span
          className={`sort-icon ${isActive ? `sort-${sort.direction}` : ''}`}
          aria-hidden="true"
        >
          <ChevronUpIcon />
          <ChevronDownIcon />
        </span>
      </button>
    </th>
  )
}

function OrderStatusBadge({ status }) {
  const { label } = STATUS_CONFIG[status]

  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.3 4.3" />
    </svg>
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

export default OrdersSection
