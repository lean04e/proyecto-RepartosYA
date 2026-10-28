import { useEffect, useState } from 'react'
import './CommercesSection.css'
import './OrdersSection.css'

const INITIAL_VISIBLE_COUNT = 20
const VISIBLE_COUNT_STEP = 20
const ALL_STATUSES = 'todos'

const STATUS_CONFIG = {
  registrado: { label: 'Registrado', order: 0 },
  asignado: { label: 'Asignado', order: 1 },
  'en-camino': { label: 'En Camino', order: 2 },
  entregado: { label: 'Entregado', order: 3 },
  cancelado: { label: 'Cancelado', order: 4 },
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
    case 'origin':
      return firstOrder.origin.localeCompare(secondOrder.origin, 'es')
    case 'destination':
      return firstOrder.destination.localeCompare(secondOrder.destination, 'es')
    case 'status':
      return STATUS_CONFIG[firstOrder.status].order - STATUS_CONFIG[secondOrder.status].order
    default:
      return 0
  }
}

// Devuelve el pedido con el nuevo estado y el cambio agregado a su historial.
function withStatusChange(order, nextStatus) {
  return {
    ...order,
    status: nextStatus,
    statusHistory: [
      ...order.statusHistory,
      { at: new Date().toISOString(), from: order.status, to: nextStatus },
    ],
  }
}

function OrdersSection({ orders, commerces = [], onGoToCommerces }) {
  const [orderList, setOrderList] = useState(orders)
  const [cancelingOrder, setCancelingOrder] = useState(null)
  const [detailOrderId, setDetailOrderId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [formData, setFormData] = useState(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [addingOrder, setAddingOrder] = useState(false)
  const [newOrderData, setNewOrderData] = useState(null)
  const [newOrderErrors, setNewOrderErrors] = useState({})
  const [successToastMessage, setSuccessToastMessage] = useState('')
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // --- NUEVO: Estados para la Base de Datos ---
  const [dbRepartidores, setDbRepartidores] = useState([]);
  const [dbComercios, setDbComercios] = useState([]);
  const [editErrors, setEditErrors] = useState({})

useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resRep = await fetch('http://localhost:3001/api/repartidores');
        if (resRep.ok) setDbRepartidores(await resRep.json());

        const resCom = await fetch('http://localhost:3001/comercios');
        if (resCom.ok) setDbComercios(await resCom.json());

        // NUEVO: Traer Pedidos desde el backend
        const resPed = await fetch('http://localhost:3001/api/pedidos');
        if (resPed.ok) {
          const pedidosData = await resPed.json();
          // Adaptamos el formato de MongoDB al de React
          const pedidosMapeados = pedidosData.map(p => ({
            id: p.ID,
            origin: p.origen,
            destination: p.destino,
            driver: p.repartidor || null, 
            status: p.estado ? p.estado.toLowerCase().replace('_', '-') : 'registrado',
            createdAt: p.createdAt || new Date().toISOString(),
            statusHistory: []
          }));
          setOrderList(pedidosMapeados);
        }
      } catch (error) {
        console.error("Error al cargar datos de la BD:", error);
      }
    };
    cargarDatos();
  }, []);

  const normalizedSearchTerm = normalizeText(searchTerm.trim())
  const filteredOrders = orderList.filter((order) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      [order.id, order.driver ?? '', order.origin, order.destination].some((value) =>
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

  const showSuccessToast = (message) => {
    setSuccessToastMessage(message)
    setTimeout(() => setSuccessToastMessage(''), 3500)
  }

  const handleAdvanceStatus = (order, nextStatus, message) => {
    setOrderList((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? withStatusChange(currentOrder, nextStatus)
          : currentOrder,
      ),
    )
    showSuccessToast(message)
  }

  const handleConfirmCancel = async () => {
try {
      // Hacemos la petición PUT a tu nueva ruta del backend
      const response = await fetch(`http://localhost:3001/api/pedidos/cancelar/${cancelingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Si MongoDB lo actualiza bien, lo actualizamos visualmente en React
        setOrderList((currentOrders) =>
          currentOrders.map((order) =>
            order.id === cancelingOrder.id ? withStatusChange(order, 'cancelado') : order,
          ),
        )
        setCancelingOrder(null)
        showSuccessToast('El pedido ha sido cancelado exitosamente')
      } else {
        const errorData = await response.json();
        alert("Error al cancelar en BD: " + (errorData.error || errorData.detalle || "Ocurrió un error"));
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  }

  // Repartidores disponibles: hasta que exista la sección de repartidores, se toman de los pedidos.
  const driverOptions = dbRepartidores.map((rep) => `${rep.nombre} ${rep.apellido}`);
  const commerceOptions = dbComercios.map((comercio) => comercio.nombre);
  const detailOrder = orderList.find((order) => order.id === detailOrderId)
  const findCommerce = (name) => commerces.find((commerce) => commerce.name === name)

  const handleOpenEdit = (order) => {
    setEditingOrder(order)
    setFormData({
      driver: order.driver ?? '',
      origin: order.origin,
      destination: order.destination,
    })
  }

  const handleCloseEdit = () => {
    setEditingOrder(null)
    setFormData(null)
    setConfirmationOpen(false)
    setEditErrors({}) // Escenario 3: Limpiamos los errores si cancela
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
    // Limpiamos el error visual si el usuario vuelve a escribir
    if (editErrors && editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleApplyEdit = (event) => {
    event.preventDefault()

    // Escenario 2: Validación de campos vacíos
    const camposRequeridos = ['origin', 'destination'];
    const errores = {};
    for (const campo of camposRequeridos) {
      if (!formData[campo] || formData[campo].trim() === '') {
        errores[campo] = 'No se ha ingresado datos al campo.';
      }
    }

    if (Object.keys(errores).length > 0) {
      setEditErrors(errores);
      return; 
    }

    const hasChanges =
      formData.driver !== (editingOrder.driver ?? '') ||
      formData.origin !== editingOrder.origin ||
      formData.destination !== editingOrder.destination

    if (!hasChanges) {
      handleCloseEdit()
      return
    }

    setEditErrors({})
    setConfirmationOpen(true) // Lanza advertencia explícita (Escenario 1 y 3)
  }

    const handleConfirmEdit = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/pedidos/modificar/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: formData.origin,
          destino: formData.destination
        })
      });
    if (response.ok) {
        setOrderList((currentOrders) =>
          currentOrders.map((order) =>
            order.id === editingOrder.id
              ? { ...order, ...formData, driver: formData.driver || null }
              : order,
          ),
        )
        handleCloseEdit()
        showSuccessToast('El pedido ha sido modificado exitosamente')
      } else {
        const errorData = await response.json();
        alert("Error al modificar en BD: " + (errorData.error || errorData.detalle || "Revisa los datos"));
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  }

  const handleOpenAdd = () => {
    setNewOrderData({ id: 'Autogenerado' , driver: '', origin: '', destination: '' })
    setNewOrderErrors({})
    setAddingOrder(true)
  }

  const handleCloseAdd = () => {
    setAddingOrder(false)
    setNewOrderData(null)
    setNewOrderErrors({})
  }

  const handleNewOrderFieldChange = (event) => {
    const { name, value } = event.target
    setNewOrderData((currentData) => ({ ...currentData, [name]: value }))
    setNewOrderErrors((currentErrors) => ({ ...currentErrors, [name]: false }))
  }

const handleAddOrder = async (event) => {
    event.preventDefault();

    // Escenario 2: Validación estricta de campos vacíos
    const camposRequeridos = ['origin', 'destination'];
    const nextErrors = {};

    for (const campo of camposRequeridos) {
      if (!newOrderData[campo] || newOrderData[campo].trim() === '') {
        nextErrors[campo] = 'No se ha ingresado datos al campo.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setNewOrderErrors(nextErrors);
      return; // Frena la ejecución, se muestran los textos rojos y no se cierra la ventana
    }

    // Escenario 1: Creación de pedido exitoso
    try {
      const response = await fetch('http://localhost:3001/api/pedidos/cargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: newOrderData.origin,
          destino: newOrderData.destination,
          // Rellenamos los campos obligatorios del backend que aún no están en la UI
          destinatario: "Consumidor Final",
          contacto: "Sin especificar",
          email: "",
          repartidor: newOrderData.driver || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const createdAt = new Date().toISOString();
        const initialStatus = newOrderData.driver ? 'asignado' : 'registrado';
        
        // El nuevo pedido aparece inmediatamente en la lista con el UUID real
        setOrderList((currentOrders) => [
          ...currentOrders,
          {
            ...newOrderData,
            id: data.pedido.ID || newOrderData.id, 
            driver: newOrderData.driver || null,
            createdAt,
            status: initialStatus,
            statusHistory: [{ at: createdAt, from: null, to: initialStatus }],
          },
        ]);
        
        handleCloseAdd(); // Cierra la ventana tras éxito
        showSuccessToast('El pedido ha sido añadido exitosamente');
      } else {
        const errorData = await response.json();
        alert("Error al cargar: " + (errorData.error || errorData.detalle || "Revisa los datos"));
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  const handleRemoveOrder = (orderId) => {
    if (detailOrderId === orderId) setDetailOrderId(null)
    setOrderList((currentOrders) => currentOrders.filter((order) => order.id !== orderId))
  }

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
      <div className="orders-list-heading">
        <h2 id="orders-list-title" className="orders-list-title">Listado de pedidos</h2>
        <button type="button" className="new-order-button" onClick={handleOpenAdd}>
          <PackageIcon />
          <span className="btn-text">Nuevo Pedido</span>
        </button>
      </div>

      <div className="commerce-filters" aria-label="Filtros de pedidos">
        <label className="search-filter" htmlFor="order-search">
          <span className="sr-only">Buscar pedido por ID, repartidor, origen o destino</span>
          <div className="filter-input-wrapper">
            <SearchIcon />
            <input
              id="order-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar por ID, repartidor, origen o destino"
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
                <SortableHeader column="origin" label="Origen" sort={sort} onSort={handleSort} />
                <SortableHeader column="destination" label="Destino" sort={sort} onSort={handleSort} />
                <SortableHeader column="status" label="Estado" sort={sort} onSort={handleSort} />
                <th scope="col" className="actions-column">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  className="commerce-row"
                  onClick={() => setDetailOrderId(order.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver detalle del pedido ${order.id}`}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      setDetailOrderId(order.id)
                    }
                  }}
                >
                  <td data-label="Fecha y hora" className="order-date-cell">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <th scope="row" data-label="ID">
                    <span className="commerce-name">{order.id}</span>
                  </th>
                  <td data-label="Repartidor">
                    {order.driver ?? <span className="unassigned-driver">Sin asignar</span>}
                  </td>
                  <td data-label="Origen">{order.origin}</td>
                  <td data-label="Destino">{order.destination}</td>
                  <td data-label="Estado">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td
                    className="actions-cell"
                    data-label="Acciones"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="row-actions">
                      <button
                        className="action-button"
                        type="button"
                        onClick={() => handleOpenEdit(order)}
                        aria-label={`Modificar pedido ${order.id}`}
                        title={`Modificar pedido ${order.id}`}
                      >
                        <EditIcon />
                      </button>
                      {order.status === 'asignado' && (
                        <button
                          className="action-button"
                          type="button"
                          onClick={() =>
                            handleAdvanceStatus(
                              order,
                              'en-camino',
                              'El pedido ha pasado a estado En Camino',
                            )
                          }
                          aria-label={`Marcar pedido ${order.id} como En Camino`}
                          title="Marcar como En Camino"
                        >
                          <TruckIcon />
                        </button>
                      )}
                      {order.status === 'en-camino' && (
                        <button
                          className="action-button"
                          type="button"
                          onClick={() =>
                            handleAdvanceStatus(
                              order,
                              'entregado',
                              'El pedido ha pasado a estado Entregado',
                            )
                          }
                          aria-label={`Marcar pedido ${order.id} como Entregado`}
                          title="Marcar como Entregado"
                        >
                          <CheckIcon />
                        </button>
                      )}
                      {order.status === 'cancelado' || order.status === 'entregado' ? (
                        <button
                          className="action-button action-button-danger"
                          type="button"
                          onClick={() => handleRemoveOrder(order.id)}
                          aria-label={`Quitar pedido ${order.id} de la lista`}
                          title={`Quitar pedido ${order.id} de la lista`}
                        >
                          <TrashIcon />
                        </button>
                      ) : (
                        <button
                          className="action-button action-button-danger"
                          type="button"
                          onClick={() => setCancelingOrder(order)}
                          aria-label={`Cancelar pedido ${order.id}`}
                          title={`Cancelar pedido ${order.id}`}
                        >
                          <CancelIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Escenario 1: No hay pedidos cargados */}
              {orderList.length === 0 && (
                <tr className="empty-results-row">
                  <td colSpan="7">No hay pedidos cargados</td>
                </tr>
              )}
              {/* Escenario 4: Hay pedidos pero la búsqueda/filtros no encontró nada */}
              {orderList.length > 0 && visibleOrders.length === 0 && (
                <tr className="empty-results-row">
                  <td colSpan="7">No se encontraron pedidos con esos filtros.</td>
                </tr>
              )}
              {canShowMore && (
                <tr className="show-more-row">
                  <td colSpan="7">
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
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          origin={findCommerce(detailOrder.origin)}
          destination={findCommerce(detailOrder.destination)}
          onClose={() => setDetailOrderId(null)}
        />
      )}
      {editingOrder &&
        (confirmationOpen ? (
          <ConfirmEditOrderModal
            orderId={editingOrder.id}
            onCancel={handleCloseEdit}
            onConfirm={handleConfirmEdit}
          />
        ) : (
          <EditOrderModal
            orderId={editingOrder.id}
            formData={formData}
            formErrors={editErrors}
            driverOptions={driverOptions}
            commerceOptions={commerceOptions}
            onChange={handleFieldChange}
            onClose={handleCloseEdit}
            onSubmit={handleApplyEdit}
            onGoToCommerces={onGoToCommerces}
          />
        ))}
      {addingOrder && (
        <AddOrderModal
          formData={newOrderData}
          formErrors={newOrderErrors}
          driverOptions={driverOptions}
          commerceOptions={commerceOptions}
          onChange={handleNewOrderFieldChange}
          onClose={handleCloseAdd}
          onSubmit={handleAddOrder}
          onGoToCommerces={onGoToCommerces}
        />
      )}
      {cancelingOrder && (
        <CancelOrderModal
          orderId={cancelingOrder.id}
          onCancel={() => setCancelingOrder(null)}
          onConfirm={handleConfirmCancel}
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

function OrderDetailModal({ order, origin, destination, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const history = [...order.statusHistory].reverse()

  return (
    <div className="modal-backdrop detail-backdrop" role="presentation" onClick={onClose}>
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2 id="order-detail-title">Pedido {order.id}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de pedido"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="detail-modal-body">
          <div className="detail-summary-grid">
            <div className="detail-card">
              <span className="detail-card-label">
                <PackageIcon />
                <span>ID</span>
              </span>
              <span className="detail-card-value">{order.id}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <DriverIcon />
                <span>Repartidor</span>
              </span>
              <span className="detail-card-value">
                {order.driver ?? <span className="unassigned-driver">Sin asignar</span>}
              </span>
            </div>

            <OrderPartyCard title="Origen" name={order.origin} commerce={origin} />
            <OrderPartyCard title="Destino" name={order.destination} commerce={destination} />
          </div>

          <div className="detail-orders-section">
            <h3 className="detail-orders-title">Historial de estados</h3>

            <div className="detail-orders-frame">
              <table className="detail-orders-table">
                <caption className="sr-only">Cambios de estado del pedido</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Estado anterior</th>
                    <th scope="col">Estado nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((change) => (
                      <tr key={change.at + change.to}>
                        <td className="order-date-cell">{formatDateTime(change.at)}</td>
                        <td className="order-status-cell">
                          {change.from && <OrderStatusBadge status={change.from} />}
                        </td>
                        <td className="order-status-cell">
                          <OrderStatusBadge status={change.to} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="detail-orders-empty">
                        Este pedido no tiene movimientos registrados.
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

function OrderPartyCard({ title, name, commerce }) {
  return (
    <div className="detail-card detail-card-highlight">
      <span className="detail-card-label">
        <LocationIcon />
        <span>{title}</span>
      </span>
      <span className="detail-card-value">{name}</span>
      <span className="detail-party-line">
        <span className="detail-party-label">Dirección</span>
        {commerce?.address || 'No especificada'}
      </span>
      <span className="detail-party-line">
        <span className="detail-party-label">Teléfono</span>
        {commerce?.phone || 'No especificado'}
      </span>
    </div>
  )
}

function EditOrderModal({
  orderId,
  formData,
  formErrors= {},
  driverOptions,
  commerceOptions,
  onChange,
  onClose,
  onSubmit,
  onGoToCommerces,
}) {
  // Si el valor actual ya no figura en la lista, se conserva como opción para no perderlo.
  const withCurrent = (options, current) =>
    current && !options.includes(current) ? [current, ...options] : options

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-order-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Editar registro</p>
            <h2 id="edit-order-title">Modificar pedido {orderId}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modificacion de pedido"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            <div className="form-field">
              <label htmlFor="order-driver">Repartidor</label>
              <div className="select-with-action">
                <select
                  id="order-driver"
                  name="driver"
                  value={formData.driver}
                  onChange={onChange}
                >
                  <option value="">Sin asignar</option>
                  {withCurrent(driverOptions, formData.driver).map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
                {/* Sin funcionalidad hasta que se implemente la sección de repartidores. */}
                <button
                  className="field-link-button"
                  type="button"
                  aria-label="Ir a repartidores"
                  title="Ir a repartidores"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
            </div>

<div className="form-field">
              <label htmlFor="order-origin">Origen</label>
              <div className="select-with-action">
                <select
                  id="order-origin"
                  name="origin"
                  value={formData.origin}
                  onChange={onChange}
                  className={formErrors.origin ? 'has-error' : ''}
                >
                  <option value="" disabled hidden />
                  {withCurrent(commerceOptions, formData.origin).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className="field-link-button"
                  type="button"
                  onClick={onGoToCommerces}
                  aria-label="Ir a comercios y cargar un comercio"
                  title="Ir a comercios y cargar un comercio"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
              {/* ACÁ AGREGAMOS EL MENSAJE DE ERROR */}
              {formErrors.origin && (
                <small className="field-error" style={{ color: '#d32f2f', display: 'block', marginTop: '4px' }} role="alert">
                  {formErrors.origin}
                </small>
              )}
            </div>

<div className="form-field">
              <label htmlFor="order-destination">Destino</label>
              <div className="select-with-action">
                <select
                  id="order-destination"
                  name="destination"
                  value={formData.destination}
                  onChange={onChange}
                  className={formErrors.destination ? 'has-error' : ''}
                >
                  <option value="" disabled hidden />
                  {withCurrent(commerceOptions, formData.destination).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className="field-link-button"
                  type="button"
                  onClick={onGoToCommerces}
                  aria-label="Ir a comercios y cargar un comercio"
                  title="Ir a comercios y cargar un comercio"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
              
              {/* ACÁ AGREGAMOS EL MENSAJE DE ERROR DE DESTINO */}
              {formErrors.destination && (
                <small className="field-error" style={{ color: '#d32f2f', display: 'block', marginTop: '4px' }} role="alert">
                  {formErrors.destination}
                </small>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="modal-apply" type="submit">
              Aceptar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddOrderModal({
  formData,
  formErrors,
  driverOptions,
  commerceOptions,
  onChange,
  onClose,
  onSubmit,
  onGoToCommerces,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-order-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Nuevo registro</p>
            <h2 id="add-order-title">Cargar pedido</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar carga de pedido"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            <div className="form-field">
              <label htmlFor="new-order-id">ID</label>
              <input id="new-order-id" name="id" type="text" value={formData.id} readOnly />
            </div>

            <div className="form-field">
              <label htmlFor="new-order-driver">Repartidor</label>
              <div className="select-with-action">
                <select
                  id="new-order-driver"
                  name="driver"
                  value={formData.driver}
                  onChange={onChange}
                >
                  <option value="">Sin asignar</option>
                  {driverOptions.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
                {/* Sin funcionalidad hasta que se implemente la sección de repartidores. */}
                <button
                  className="field-link-button"
                  type="button"
                  aria-label="Ir a repartidores"
                  title="Ir a repartidores"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="new-order-origin">Origen</label>
              <div className="select-with-action">
                <select
                  id="new-order-origin"
                  name="origin"
                  value={formData.origin}
                  onChange={onChange}
                  className={formErrors.origin ? 'has-error' : ''}
                  aria-invalid={formErrors.origin || undefined}
                >
                  <option value="" disabled hidden />
                  {commerceOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className="field-link-button"
                  type="button"
                  onClick={onGoToCommerces}
                  aria-label="Ir a comercios y cargar un comercio"
                  title="Ir a comercios y cargar un comercio"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
                {formErrors.origin && (
                <small className="field-error" style={{ color: '#d32f2f', display: 'block', marginTop: '4px' }} role="alert">
                  {formErrors.origin}
                </small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="new-order-destination">Destino</label>
              <div className="select-with-action">
                <select
                  id="new-order-destination"
                  name="destination"
                  value={formData.destination}
                  onChange={onChange}
                  className={formErrors.destination ? 'has-error' : ''}
                  aria-invalid={formErrors.destination || undefined}
                >
                  <option value="" disabled hidden />
                  {commerceOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className="field-link-button"
                  type="button"
                  onClick={onGoToCommerces}
                  aria-label="Ir a comercios y cargar un comercio"
                  title="Ir a comercios y cargar un comercio"
                >
                  <ExternalLinkIcon />
                </button>
              </div>
                {formErrors.destination && (
                <small className="field-error" style={{ color: '#d32f2f', display: 'block', marginTop: '4px' }} role="alert">
                  {formErrors.destination}
                </small>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="modal-apply" type="submit">
              Aceptar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmEditOrderModal({ orderId, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-edit-order-title"
      >
        <h2 id="confirm-edit-order-title">¿Aplicar cambios?</h2>
        <p className="confirmation-copy">
          Se actualizarán los datos del pedido <strong>{orderId}</strong> en la lista de pedidos.
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

function CancelOrderModal({ orderId, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal delete-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
      >
        <h2 id="cancel-order-title">¿Confirmas cancelar el pedido?</h2>
        <p className="confirmation-copy">
          Se cancelará el pedido <strong>{orderId}</strong>. Seguirá visible en la lista con el
          estado Cancelado.
        </p>
        <div className="confirmation-actions">
          <button className="modal-cancel" type="button" onClick={onCancel}>
            Volver
          </button>
          <button className="modal-delete" type="button" onClick={onConfirm}>
            Cancelar pedido
          </button>
        </div>
      </div>
    </div>
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

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function DriverIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.4 2.4 4.6-4.9" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" />
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

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
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
