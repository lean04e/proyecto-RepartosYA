import { useState } from 'react'
import './CommercesSection.css'

const INITIAL_VISIBLE_COUNT = 6

function CommercesSection({ commerces }) {
  const [commerceList, setCommerceList] = useState(commerces)
  const [sort, setSort] = useState({ key: 'orders', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [editingCommerce, setEditingCommerce] = useState(null)
  const [formData, setFormData] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [deletingCommerce, setDeletingCommerce] = useState(null)
  const [addingCommerce, setAddingCommerce] = useState(false)
  const [newCommerceData, setNewCommerceData] = useState(null)
  const [newCommerceErrors, setNewCommerceErrors] = useState({})
  const [successToastVisible, setSuccessToastVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [minimumOrders, setMinimumOrders] = useState('')

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
    setCommerceList((currentCommerces) =>
      currentCommerces.map((commerce) =>
        commerce.id === editingCommerce.id
          ? { ...commerce, ...formData, orders: Number(formData.orders) }
          : commerce,
      ),
    )
    handleCloseEdit()
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
    handleCloseDelete()
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
    const commerceToAdd = {
      id: nextId,
      ...newCommerceData,
      orders: Number(newCommerceData.orders),
    }

    setCommerceList((currentCommerces) => [...currentCommerces, commerceToAdd])
    handleCloseAdd()
    setSuccessToastVisible(true)
    setTimeout(() => setSuccessToastVisible(false), 3500)
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
                <tr key={commerce.id}>
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
      onClick={() => handleOpenEdit(commerce)}
      aria-label={`Editar ${commerce.name}`}
      title={`Editar ${commerce.name}`}
    >
      <EditIcon />
    </button>
    <button
      className="action-button action-button-danger"
      type="button"
                        onClick={() => handleOpenDelete(commerce)}
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
      {successToastVisible && (
        <div className="success-toast" role="status">
          El comercio ha sido añadido exitosamente
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

export default CommercesSection