import { useEffect, useState } from 'react'
import { generateDefaultOrders } from '../data/mockCommerces'
import './CommercesSection.css'

const INITIAL_VISIBLE_COUNT = 6

function CommercesSection({ commerces }) {
  const [commerceList, setCommerceList] = useState(commerces)
  const [sort, setSort] = useState({ key: 'orders', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [detailCommerce, setDetailCommerce] = useState(null)
  const [editingCommerce, setEditingCommerce] = useState(null)
  const [formData, setFormData] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [deletingCommerce, setDeletingCommerce] = useState(null)
  const [addingCommerce, setAddingCommerce] = useState(false)
  const [newCommerceData, setNewCommerceData] = useState(null)
  const [newCommerceErrors, setNewCommerceErrors] = useState({})
  const [successToastMessage, setSuccessToastMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [minimumOrders, setMinimumOrders] = useState('')

  const showSuccessToast = (message) => {
    setSuccessToastMessage(message)
    setTimeout(() => setSuccessToastMessage(''), 3500)
  }

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('es')
  const filteredCommerces = commerceList.filter((commerce) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      commerce.name.toLocaleLowerCase('es').includes(normalizedSearchTerm) ||
      commerce.address.toLocaleLowerCase('es').includes(normalizedSearchTerm)
    const matchesMinimumOrders =
      minimumOrders === '' || commerce.orders >= Number(minimumOrders)

    return matchesSearch && matchesMinimumOrders
  })

  const sortedCommerces = [...filteredCommerces].sort((firstCommerce, secondCommerce) => {
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

  const handleOpenDetail = (commerce) => {
    setDetailCommerce(commerce)
  }

  const handleCloseDetail = () => {
    setDetailCommerce(null)
  }

  const handleOpenEdit = (commerce) => {
    setEditingCommerce(commerce)
    setFormData({
      name: commerce.name,
      orders: String(commerce.orders),
      phone: commerce.phone,
      address: commerce.address,
    })
    setFormErrors({})
  }

  const handleCloseEdit = () => {
    setEditingCommerce(null)
    setFormData(null)
    setFormErrors({})
    setConfirmationOpen(false)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [name]: false }))
  }

  const handleApplyEdit = (event) => {
    event.preventDefault()

    const nextErrors = Object.fromEntries(
      Object.entries(formData).map(([field, value]) => [field, !value.trim()]),
    )

    if (Object.values(nextErrors).some(Boolean)) {
      setFormErrors(nextErrors)
      return
    }

    const hasChanges = Object.entries(formData).some(
      ([field, value]) => String(editingCommerce[field]) !== value,
    )

    if (!hasChanges) {
      handleCloseEdit()
      return
    }

    setConfirmationOpen(true)
  }

  const handleConfirmEdit = () => {
    const updatedOrders = Number(formData.orders)
    setCommerceList((currentCommerces) =>
      currentCommerces.map((commerce) =>
        commerce.id === editingCommerce.id
          ? { ...commerce, ...formData, orders: updatedOrders }
          : commerce,
      ),
    )
    if (detailCommerce && detailCommerce.id === editingCommerce.id) {
      setDetailCommerce((prev) => ({
        ...prev,
        ...formData,
        orders: updatedOrders,
      }))
    }
    handleCloseEdit()
    showSuccessToast('El comercio ha sido modificado exitosamente')
  }

  const handleOpenDelete = (commerce) => {
    setDeletingCommerce(commerce)
  }

  const handleCloseDelete = () => {
    setDeletingCommerce(null)
  }

  const handleConfirmDelete = () => {
    setCommerceList((currentCommerces) =>
      currentCommerces.filter((commerce) => commerce.id !== deletingCommerce.id),
    )
    if (detailCommerce && detailCommerce.id === deletingCommerce.id) {
      setDetailCommerce(null)
    }
    handleCloseDelete()
    showSuccessToast('El comercio ha sido borrado exitosamente')
  }

  const handleOpenAdd = () => {
    setNewCommerceData({ name: '', orders: '', phone: '', address: '' })
    setNewCommerceErrors({})
    setAddingCommerce(true)
  }

  const handleCloseAdd = () => {
    setAddingCommerce(false)
    setNewCommerceData(null)
    setNewCommerceErrors({})
  }

  const handleNewCommerceFieldChange = (event) => {
    const { name, value } = event.target
    setNewCommerceData((currentData) => ({ ...currentData, [name]: value }))
    setNewCommerceErrors((currentErrors) => ({ ...currentErrors, [name]: false }))
  }

  const handleAddCommerce = (event) => {
    event.preventDefault()

    const nextErrors = Object.fromEntries(
      Object.entries(newCommerceData).map(([field, value]) => [field, !value.trim()]),
    )

    if (Object.values(nextErrors).some(Boolean)) {
      setNewCommerceErrors(nextErrors)
      return
    }

    const nextId = Math.max(0, ...commerceList.map((commerce) => commerce.id)) + 1
    const initialOrders = Number(newCommerceData.orders)
    const commerceToAdd = {
      id: nextId,
      ...newCommerceData,
      orders: initialOrders,
      historicalOrders: initialOrders,
      recentOrders: generateDefaultOrders(nextId),
    }

    setCommerceList((currentCommerces) => [...currentCommerces, commerceToAdd])
    handleCloseAdd()
    showSuccessToast('El comercio ha sido añadido exitosamente')
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }

  const handleMinimumOrdersChange = (event) => {
    setMinimumOrders(event.target.value)
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }

  return (
    <section className="commerces-section" aria-labelledby="commerces-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gestion de operaciones</p>
          <h1 id="commerces-title">Comercios</h1>
        </div>
        <button className="add-commerce-button" type="button" onClick={handleOpenAdd}>
          <StoreIcon />
          <span>Cargar comercio</span>
        </button>
      </div>

      <div className="commerce-filters" aria-label="Filtros de comercios">
        <label className="search-filter" htmlFor="commerce-search">
          <span className="sr-only">Buscar comercio por nombre o dirección</span>
          <div className="filter-input-wrapper">
            <SearchIcon />
            <input
              id="commerce-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre o dirección"
            />
          </div>
        </label>
        <label className="minimum-orders-filter" htmlFor="minimum-orders">
          <span className="sr-only">Min. Pedidos</span>
          <input
            id="minimum-orders"
            type="number"
            min="0"
            value={minimumOrders}
            onChange={handleMinimumOrdersChange}
            placeholder="Min. Pedidos"
            aria-label="Min. Pedidos"
          />
        </label>
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
                <tr
                  key={commerce.id}
                  className="commerce-row"
                  onClick={() => handleOpenDetail(commerce)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver detalle de ${commerce.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleOpenDetail(commerce)
                    }
                  }}
                >
                  <th scope="row" data-label="Nombre del comercio">
                    <span className="commerce-name">{commerce.name}</span>
                  </th>
                  <td data-label="Pedidos último mes" className="orders-cell">
                    {commerce.orders.toLocaleString('es-AR')}
                  </td>
                  <td data-label="Teléfono">{commerce.phone}</td>
                  <td data-label="Dirección">{commerce.address}</td>
                   <td className="actions-cell" data-label="Acciones">
                    <div className="row-actions">
                      <button
                        className="action-button"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(commerce)
                        }}
                        aria-label={`Editar ${commerce.name}`}
                        title={`Editar ${commerce.name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="action-button action-button-danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDelete(commerce)
                        }}
                        aria-label={`Borrar ${commerce.name}`}
                        title={`Borrar ${commerce.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCommerces.length === 0 && (
                <tr className="empty-results-row">
                  <td colSpan="5">No se encontraron comercios con esos filtros.</td>
                </tr>
              )}
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
      {detailCommerce && (
        <CommerceDetailModal
          commerce={detailCommerce}
          onClose={handleCloseDetail}
          onEdit={handleOpenEdit}
        />
      )}
      {editingCommerce &&
        (confirmationOpen ? (
          <ConfirmEditModal
            commerceName={formData.name}
            onCancel={handleCloseEdit}
            onConfirm={handleConfirmEdit}
          />
        ) : (
          <EditCommerceModal
            formData={formData}
            formErrors={formErrors}
            onChange={handleFieldChange}
            onClose={handleCloseEdit}
            onSubmit={handleApplyEdit}
          />
        ))}
      {deletingCommerce && (
        <DeleteCommerceModal
          commerceName={deletingCommerce.name}
          onCancel={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
      {addingCommerce && (
        <AddCommerceModal
          formData={newCommerceData}
          formErrors={newCommerceErrors}
          onChange={handleNewCommerceFieldChange}
          onClose={handleCloseAdd}
          onSubmit={handleAddCommerce}
        />
      )}
      {successToastMessage && (
        <div className="success-toast" role="status">
          {successToastMessage}
        </div>
      )}
    </section>
  )
}

function EditCommerceModal({ formData, formErrors, onChange, onClose, onSubmit }) {
  const fields = [
    { name: 'name', label: 'Nombre del comercio', type: 'text' },
    {
      name: 'orders',
      label: 'Número de pedidos en el último mes',
      type: 'number',
    },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'address', label: 'Dirección', type: 'text' },
  ]

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-commerce-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Editar registro</p>
            <h2 id="edit-commerce-title">Modificar comercio</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modificacion de comercio"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            {fields.map((field) => (
              <label className="form-field" htmlFor={`commerce-${field.name}`} key={field.name}>
                <span>{field.label}</span>
                <input
                  id={`commerce-${field.name}`}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name]}
                  onChange={onChange}
                  className={formErrors[field.name] ? 'has-error' : ''}
                  aria-invalid={formErrors[field.name] || undefined}
                  aria-describedby={formErrors[field.name] ? `${field.name}-error` : undefined}
                />
                {formErrors[field.name] && (
                  <small id={`${field.name}-error`} className="field-error" role="alert">
                    Completa este campo.
                  </small>
                )}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="modal-apply" type="submit">
              Aplicar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddCommerceModal({ formData, formErrors, onChange, onClose, onSubmit }) {
  const fields = [
    { name: 'name', label: 'Nombre del comercio', type: 'text' },
    {
      name: 'orders',
      label: 'Número de pedidos en el último mes',
      type: 'number',
    },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'address', label: 'Dirección', type: 'text' },
  ]

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-commerce-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Nuevo registro</p>
            <h2 id="add-commerce-title">Cargar comercio</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar carga de comercio"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            {fields.map((field) => (
              <label className="form-field" htmlFor={`new-commerce-${field.name}`} key={field.name}>
                <span>{field.label}</span>
                <input
                  id={`new-commerce-${field.name}`}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name]}
                  onChange={onChange}
                  className={formErrors[field.name] ? 'has-error' : ''}
                  aria-invalid={formErrors[field.name] || undefined}
                  aria-describedby={formErrors[field.name] ? `new-${field.name}-error` : undefined}
                />
                {formErrors[field.name] && (
                  <small id={`new-${field.name}-error`} className="field-error" role="alert">
                    Completa este campo.
                  </small>
                )}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="modal-apply" type="submit">
              Cargar comercio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmEditModal({ commerceName, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-edit-title"
      >
        <h2 id="confirm-edit-title">¿Aplicar cambios?</h2>
        <p className="confirmation-copy">
          Se actualizarán los datos de <strong>{commerceName}</strong> en la lista de comercios.
        </p>
        <div className="confirmation-actions">
          <button className="modal-cancel" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="modal-apply" type="button" onClick={onConfirm}>
            Confirmar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteCommerceModal({ commerceName, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal delete-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-commerce-title"
      >
        <h2 id="delete-commerce-title">¿Confirmas borrar el comercio?</h2>
        <p className="confirmation-copy">
          Se eliminará <strong>{commerceName}</strong> de la lista de comercios.
        </p>
        <div className="confirmation-actions">
          <button className="modal-cancel" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="modal-delete" type="button" onClick={onConfirm}>
            Borrar comercio
          </button>
        </div>
      </div>
    </div>
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
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

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h16v10H4zM3 10l2-5h14l2 5M8 20v-5h4v5M16 14h1" />
    </svg>
  )
}

function CommerceDetailModal({ commerce, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Compatibilidad con Backend / Base de Datos:
  // Se leen pedidos históricos y pedidos recientes con fallback seguro
  const historicalOrders =
    commerce.historicalOrders !== undefined
      ? commerce.historicalOrders
      : Math.round(Number(commerce.orders || 0) * 3)

  const recentOrders =
    Array.isArray(commerce.recentOrders) && commerce.recentOrders.length > 0
      ? commerce.recentOrders.slice(0, 10)
      : []

  return (
    <div className="modal-backdrop detail-backdrop" role="presentation" onClick={onClose}>
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commerce-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2 id="commerce-detail-title">{commerce.name}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de comercio"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="detail-modal-body">
          {/* Bloque con los datos del comercio */}
          <div className="detail-summary-grid">
            <div className="detail-card">
              <span className="detail-card-label">
                <PhoneIcon />
                <span>Teléfono</span>
              </span>
              <span className="detail-card-value">{commerce.phone || 'No especificado'}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <LocationIcon />
                <span>Dirección</span>
              </span>
              <span className="detail-card-value">{commerce.address || 'No especificada'}</span>
            </div>

            <div className="detail-card detail-card-highlight">
              <span className="detail-card-label">
                <CalendarMonthIcon />
                <span>Pedidos en el último mes</span>
              </span>
              <span className="detail-card-value detail-metric-number">
                {Number(commerce.orders || 0).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="detail-card detail-card-highlight">
              <span className="detail-card-label">
                <HistoryIcon />
                <span>Número de pedidos histórica</span>
              </span>
              <span className="detail-card-value detail-metric-number">
                {historicalOrders.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Historial de pedidos */}
          <div className="detail-orders-section">
            <h3 className="detail-orders-title">Historial de pedidos</h3>

            <div className="detail-orders-frame">
              <table className="detail-orders-table">
                <caption className="sr-only">Últimos pedidos del comercio</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">ID del pedido</th>
                    <th scope="col">Estado del pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-date-cell">{order.date}</td>
                        <td className="order-id-cell">
                          <code>{order.id}</code>
                        </td>
                        <td className="order-status-cell">
                          <OrderStatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="detail-orders-empty">
                        No hay pedidos recientes registrados para este comercio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="detail-modal-footer">
          <button className="modal-apply" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }) {
  const normalized = (status || '').toLowerCase()

  let label = 'Desconocido'
  let badgeClass = 'status-default'

  if (normalized === 'entregado') {
    label = 'Entregado'
    badgeClass = 'status-entregado'
  } else if (normalized === 'pendiente') {
    label = 'Pendiente'
    badgeClass = 'status-pendiente'
  } else if (normalized === 'cancelado') {
    label = 'Cancelado'
    badgeClass = 'status-cancelado'
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}


function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CalendarMonthIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export default CommercesSection