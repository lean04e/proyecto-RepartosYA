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

  const sortedCommerces = [...commerceList].sort((firstCommerce, secondCommerce) => {
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

  return (
    <section className="commerces-section" aria-labelledby="commerces-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gestion de operaciones</p>
          <h1 id="commerces-title">Comercios</h1>
        </div>
        <div className="section-summary" aria-label="Resumen de comercios">
          <strong>{commerceList.length}</strong>
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
      aria-label={`Borrar ${commerce.name}`}
      title={`Borrar ${commerce.name}`}
    >
      <TrashIcon />
    </button>
  </div>
</td>
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

export default CommercesSection