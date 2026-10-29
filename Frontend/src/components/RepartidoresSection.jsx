import { useEffect, useState } from 'react';
import './RepartidoresSection.css';

const INITIAL_VISIBLE_COUNT = 6;

function RepartidoresSection({ drivers = [], openAddOnMount = false, onDriversChange }) {
  const [driverList, setDriverList] = useState(drivers);
  // Criterio HU #16: Ordenada por estado por defecto
  const [sort, setSort] = useState({ key: 'status', direction: 'asc' });
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Estados de modales y operaciones
  const [detailDriver, setDetailDriver] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [deletingDriver, setDeletingDriver] = useState(null);
  const [addingDriver, setAddingDriver] = useState(openAddOnMount);

  // Los campos de alta son estrictamente: nombre, apellido, email, password, telefono
  const [newDriverData, setNewDriverData] = useState(
    openAddOnMount
      ? {
          nombre: '',
          apellido: '',
          email: '',
          password: '',
          telefono: '',
        }
      : null
  );
  const [newDriverErrors, setNewDriverErrors] = useState({});
  const [successToastMessage, setSuccessToastMessage] = useState('');

  // Filtros (HU #16 Escenario 3)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minimumOrders, setMinimumOrders] = useState('');

useEffect(() => {
    const obtenerRepartidores = async () => {
      try {
        // Hacemos las dos peticiones al mismo tiempo
        const [resRepartidores, resPedidos] = await Promise.all([
          fetch('http://localhost:3001/api/repartidores'),
          fetch('http://localhost:3001/api/pedidos')
        ]);

        if (resRepartidores.ok && resPedidos.ok) {
          const dataRepartidores = await resRepartidores.json();
          const dataPedidos = await resPedidos.json();

          // Calculamos las métricas para cada repartidor
          const repartidoresConMetricas = dataRepartidores.map(driver => {
            const displayName = driver.name || `${driver.nombre || ''} ${driver.apellido || ''}`.trim();

            const misPedidos = dataPedidos.filter(p => {
              const nombreRep = String(p.repartidor || '').trim().toLowerCase();
              return nombreRep === displayName.toLowerCase() || nombreRep === String(driver.nombre).trim().toLowerCase();
            });

            const pendientes = misPedidos.filter(p => p.estado === 'EN_CAMINO' || p.estado === 'en-camino');
            const entregados = misPedidos.filter(p => p.estado === 'ENTREGADO' || p.estado === 'entregado');

            return {
              ...driver,
              pendingOrders: pendientes.length,
              deliveredOrders: entregados.length,
              destination: pendientes.length > 0 ? pendientes[0].destino : 'En base'
            };
          });

          // Guardamos la lista ya procesada en tu tabla visual
          setDriverList(repartidoresConMetricas);
          if (onDriversChange) onDriversChange(repartidoresConMetricas);
        }
      } catch (error) {
        console.error("Error al cargar repartidores y pedidos:", error);
      }
    };

    obtenerRepartidores();
  }, [onDriversChange]);


  const showSuccessToast = (message) => {
    setSuccessToastMessage(message);
    setTimeout(() => setSuccessToastMessage(''), 3500);
  };

  // Filtrado
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('es');
  const filteredDrivers = driverList.filter((driver) => {
    const fullName = driver.name || `${driver.nombre || driver.firstName || ''} ${driver.apellido || driver.lastName || ''}`.trim();
    const matchesSearch =
      !normalizedSearchTerm || fullName.toLocaleLowerCase('es').includes(normalizedSearchTerm);

    const matchesStatus =
      !statusFilter || (driver.status && driver.status.toLowerCase() === statusFilter.toLowerCase());

    const driverDeliveredOrders = Number(driver.deliveredOrders ?? driver.orders ?? 0);
    const matchesMinimumOrders =
      minimumOrders === '' || driverDeliveredOrders >= Number(minimumOrders);

    return matchesSearch && matchesStatus && matchesMinimumOrders;
  });

  // Ordenamiento
  const sortedDrivers = [...filteredDrivers].sort((firstDriver, secondDriver) => {
    let firstValue = firstDriver[sort.key] ?? '';
    let secondValue = secondDriver[sort.key] ?? '';

    if (sort.key === 'orders' || sort.key === 'deliveredOrders') {
      firstValue = Number(firstDriver.deliveredOrders ?? firstDriver.orders ?? 0);
      secondValue = Number(secondDriver.deliveredOrders ?? secondDriver.orders ?? 0);
    } else if (sort.key === 'pendingOrders') {
      firstValue = Number(firstDriver.pendingOrders ?? 0);
      secondValue = Number(secondDriver.pendingOrders ?? 0);
    }

    const comparison =
      typeof firstValue === 'string'
        ? String(firstValue).localeCompare(String(secondValue), 'es')
        : Number(firstValue) - Number(secondValue);

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  const visibleDrivers = sortedDrivers.slice(0, visibleCount);
  const canShowMore = visibleCount < sortedDrivers.length;

  const handleSort = (key) => {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // HU #24: Ver detalle
// HU #24: Ver detalle y calcular métricas reales
  const handleOpenDetail = async (driver) => {
    const displayName = driver.name || `${driver.nombre || ''} ${driver.apellido || ''}`.trim();

    try {
      // Traemos todos los pedidos del sistema para contar pendientes y entregados
      const response = await fetch(`http://localhost:3001/api/pedidos`);
      
      if (response.ok) {
        const todosLosPedidos = await response.json();

        // Filtramos los que le pertenecen a este repartidor (ignorando mayúsculas)
        const misPedidos = todosLosPedidos.filter(p => {
          const nombreRep = String(p.repartidor || '').trim().toLowerCase();
          return nombreRep === displayName.toLowerCase() || nombreRep === String(driver.nombre).trim().toLowerCase();
        });

        // Separamos los que están en viaje (pendientes) y los ya finalizados
        const pendientes = misPedidos.filter(p => p.estado === 'EN_CAMINO' || p.estado === 'en-camino');
        const entregados = misPedidos.filter(p => p.estado === 'ENTREGADO' || p.estado === 'entregado');

        // Adaptamos los entregados para la tabla del modal
        const pedidosAdaptados = entregados.map(p => ({
            id: p.ID || p._id,
            date: p.createdAt ? new Intl.DateTimeFormat('es-AR').format(new Date(p.createdAt)) : 'Reciente',
            origin: p.origen,
            destination: p.destino,
            status: 'entregado'
        })).reverse(); // Invertimos para que los más recientes queden arriba

        // Abrimos el modal inyectándole las métricas calculadas
        setDetailDriver({
            ...driver,
            pendingOrders: pendientes.length,
            deliveredOrders: entregados.length,
            historicalOrders: entregados.length > 0 ? entregados.length * 4 : 0, // Estimación visual
            recentOrders: pedidosAdaptados,
            destination: pendientes.length > 0 ? pendientes[0].destino : 'En base' // Si está en viaje, mostramos a dónde va
        });
      } else {
        setDetailDriver(driver); // Si falla, abre igual pero sin métricas
      }
    } catch (error) {
      console.error("Error al buscar pedidos del repartidor:", error);
      setDetailDriver(driver);
    }
  };

  const handleCloseDetail = () => {
    setDetailDriver(null);
  };

  // HU #5: Cargar Repartidor (Campos del backend: nombre, apellido, email, password, telefono)
  const handleOpenAdd = () => {
    setNewDriverData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      telefono: '',
    });
    setNewDriverErrors({});
    setAddingDriver(true);
  };

  const handleCloseAdd = () => {
    setAddingDriver(false);
    setNewDriverData(null);
    setNewDriverErrors({});
  };

  const handleNewDriverFieldChange = (event) => {
    const { name, value } = event.target;
    setNewDriverData((curr) => ({ ...curr, [name]: value }));
    setNewDriverErrors((curr) => ({ ...curr, [name]: false }));
  };

  const handleAddDriver = async (event) => {
    event.preventDefault();

    // Regla HU #5: Todos los campos de datos deben ser completados
    const requiredFields = ['nombre', 'apellido', 'email', 'password', 'telefono'];
    const errors = {};
    for (const field of requiredFields) {
      if (!newDriverData[field] || String(newDriverData[field]).trim() === '') {
        errors[field] = true;
      }
    }

    // Escenario 1: Bloquea la carga y resalta los campos faltantes
    if (Object.keys(errors).length > 0) {
      setNewDriverErrors(errors);
      return;
    }

    // Escenario 2: Enviar a la base de datos real
    try {
      const response = await fetch('http://localhost:3001/api/repartidores/cargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newDriverData.nombre.trim(),
          apellido: newDriverData.apellido.trim(),
          email: newDriverData.email.trim(),
          password: newDriverData.password,
          telefono: newDriverData.telefono.trim()
        })
      });

      if (response.ok) {
        // Si MongoDB lo guardó con éxito, volvemos a pedir la lista completa actualizada
        const refreshResponse = await fetch('http://localhost:3001/api/repartidores');
        const dataActualizada = await refreshResponse.json();
        
        setDriverList(dataActualizada);
        if (onDriversChange) {
          onDriversChange(dataActualizada);
        }
        
        handleCloseAdd();
        showSuccessToast(`¡Repartidor ${newDriverData.nombre} cargado y disponible en el sistema!`);
      } else {
        const dataError = await response.json();
        console.error("Error al guardar:", dataError);
        alert("El backend rechazó la carga: " + (dataError.error || "Datos inválidos"));
      }
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
      alert("Error de conexión con el servidor. Revisá que la terminal de Node esté corriendo.");
    }
  };

  // HU #20: Modificar Repartidor
  const handleOpenEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      nombre: driver.nombre || driver.firstName || driver.name?.split(' ')[0] || '',
      apellido: driver.apellido || driver.lastName || driver.name?.split(' ').slice(1).join(' ') || '',
      email: driver.email || '',
      password:'',
      telefono: driver.telefono || driver.phone || '',
      status: driver.status || 'Activo',
    });
    setFormErrors({});
  };

  const handleCloseEdit = () => {
    setEditingDriver(null);
    setFormData(null);
    setFormErrors({});
    setConfirmationOpen(false);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((curr) => ({ ...curr, [name]: value }));
    setFormErrors((curr) => ({ ...curr, [name]: false }));
  };

  const handleApplyEdit = (event) => {
    event.preventDefault();

    // Regla HU #20: Deben completarse todos los campos de datos requeridos
    const requiredFields = ['nombre', 'apellido', 'email', 'telefono', 'status'];
    const errors = {};
    for (const field of requiredFields) {
      if (!formData[field] || String(formData[field]).trim() === '') {
        errors[field] = true;
      }
    }

    // Escenario 2: Se deja un campo vacío, se bloquea y se remarcan los faltantes
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Escenario 1: Se presiona aceptar, se despliega advertencia pidiendo confirmación explícita
    setConfirmationOpen(true);
  };

 const handleConfirmEdit = async () => {
    // MongoDB devuelve los IDs bajo la propiedad _id
    const idRepartidor = editingDriver._id || editingDriver.id;
    const newStatus = formData.status || editingDriver.status || 'Activo';

    try {
      // Escenario 1: Se confirma explícitamente y se cambian los datos en el backend
      const response = await fetch(`http://localhost:3001/api/repartidores/${idRepartidor}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          status: newStatus,
          password: formData.password // Se envía solo si escribieron una nueva
        })
      });

      if (response.ok) {
        // Pedimos la lista fresca a la BD
        const refreshResponse = await fetch('http://localhost:3001/api/repartidores');
        const dataActualizada = await refreshResponse.json();

        setDriverList(dataActualizada);
        if (onDriversChange) {
          onDriversChange(dataActualizada);
        }

        // Si el detalle del repartidor modificado estaba abierto, lo actualizamos
        if (detailDriver && (detailDriver._id === idRepartidor || detailDriver.id === idRepartidor)) {
          const updatedDriver = dataActualizada.find(d => d._id === idRepartidor || d.id === idRepartidor);
          setDetailDriver(updatedDriver);
        }

        handleCloseEdit();
        showSuccessToast('Datos del repartidor modificados exitosamente');
      } else {
        const errorData = await response.json();
        alert("Error al modificar: " + (errorData.error || "Datos inválidos"));
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión al intentar modificar el repartidor.");
    }
  };

  // HU #6: Borrar Repartidor
  const handleOpenDelete = (driver) => {
    // Escenario 1: Se despliega advertencia pidiendo confirmación explícita
    setDeletingDriver(driver);
  };

  const handleCloseDelete = () => {
    // Escenario 2: Se cancela y se vuelve al menú de repartidores sin eliminar nada
    setDeletingDriver(null);
  };

const handleConfirmDelete = async () => {
    const idRepartidor = deletingDriver._id || deletingDriver.id;

    try {
      // Escenario 1: Petición DELETE al backend
      const response = await fetch(`http://localhost:3001/api/repartidores/${idRepartidor}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Filtramos el repartidor eliminado de la lista actual sin necesidad de recargar todo
        const updatedList = driverList.filter((d) => (d._id || d.id) !== idRepartidor);
        
        setDriverList(updatedList);
        if (onDriversChange) {
          onDriversChange(updatedList);
        }
        
        if (detailDriver && (detailDriver._id || detailDriver.id) === idRepartidor) {
          setDetailDriver(null);
        }
        
        handleCloseDelete();
        showSuccessToast('Repartidor eliminado del sistema correctamente');
      } else {
        const errorData = await response.json();
        alert("Error al eliminar: " + (errorData.error || "No se pudo borrar"));
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión al intentar borrar el repartidor.");
    }
  };

  return (
    <section className="repartidores-section" aria-labelledby="drivers-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gestion de operaciones</p>
          <h1 id="drivers-title">Repartidores</h1>
        </div>
        <button
          className="add-driver-button"
          type="button"
          onClick={handleOpenAdd}
          aria-label="Cargar Repartidor"
        >
          <DeliveryIcon />
          <span>Cargar repartidor</span>
        </button>
      </div>

      {/* HU #16 Escenario 3: Filtros aplicables */}
      <div className="driver-filters" aria-label="Filtros de repartidores">
        <label className="search-filter" htmlFor="driver-name-search">
          <span className="sr-only">Búsqueda parcial del nombre</span>
          <div className="filter-input-wrapper">
            <SearchIcon />
            <input
              id="driver-name-search"
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              placeholder="Buscar por nombre del repartidor"
            />
          </div>
        </label>

        <label className="status-filter" htmlFor="driver-status-filter">
          <span className="sr-only">Filtrar por estado del repartidor</span>
          <select
            id="driver-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Asignado">Asignado</option>
            <option value="Retirando pedido">Retirando pedido</option>
            <option value="En viaje">En viaje</option>
            <option value="Entregado">Entregado</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>

        <label className="minimum-orders-filter" htmlFor="driver-minimum-orders">
          <span className="sr-only">Min. Pedidos en el último mes</span>
          <input
            id="driver-minimum-orders"
            type="number"
            min="0"
            value={minimumOrders}
            onChange={(e) => {
              setMinimumOrders(e.target.value);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
            }}
            placeholder="Min. Pedidos"
            aria-label="Min. Pedidos"
          />
        </label>
      </div>

      <div className="table-frame">
        <div className="table-scroll">
          <table className="driver-table">
            <caption className="sr-only">Listado de repartidores registrados</caption>
            <thead>
              <tr>
                {/* HU #16: 1. Nombre del repartidor */}
                <SortableHeader
                  column="name"
                  label="Nombre del repartidor"
                  sort={sort}
                  onSort={handleSort}
                />
                {/* HU #16: 2. Número de pedidos pendientes */}
                <SortableHeader
                  column="pendingOrders"
                  label="Pedidos pendientes"
                  sort={sort}
                  onSort={handleSort}
                />
                {/* HU #16: 3. Número de pedidos entregados */}
                <SortableHeader
                  column="orders"
                  label="Pedidos entregados"
                  sort={sort}
                  onSort={handleSort}
                  className="orders-column"
                />
                {/* HU #16: 4. Dónde se dirige */}
                <SortableHeader
                  column="destination"
                  label="Dónde se dirige"
                  sort={sort}
                  onSort={handleSort}
                />
                {/* HU #16: 5. Estado del repartidor */}
                <SortableHeader
                  column="status"
                  label="Estado del repartidor"
                  sort={sort}
                  onSort={handleSort}
                />
                {/* HU #16: 6. Iconos para modificar y borrar */}
                <th scope="col" className="actions-column">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* HU #16 Escenario 2: Cuadro vacío con el mensaje "No hay repartidores cargados" */}
              {driverList.length === 0 ? (
                <tr className="empty-results-row">
                  <td colSpan="6">No hay repartidores cargados</td>
                </tr>
              ) : visibleDrivers.length === 0 ? (
                <tr className="empty-results-row">
                  <td colSpan="6">No se encontraron repartidores con esos filtros.</td>
                </tr>
              ) : (
                visibleDrivers.map((driver) => {
                  const displayName =
                    driver.name || `${driver.nombre || driver.firstName || ''} ${driver.apellido || driver.lastName || ''}`.trim();
                  const initials = (displayName || 'R')
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const pending = Number(driver.pendingOrders ?? 0);
                  const delivered = Number(driver.deliveredOrders ?? driver.orders ?? 0);
                  const destination = driver.destination || 'En base';

                  return (
                    <tr
                      key={driver.id}
                      className="driver-row"
                      onClick={() => handleOpenDetail(driver)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalle de ${displayName}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenDetail(driver);
                        }
                      }}
                    >
                      {/* 1. Nombre */}
                      <th scope="row" data-label="Nombre del repartidor">
                        <div className="driver-name-wrapper">
                          <span className="driver-avatar-circle" aria-hidden="true">
                            {initials}
                          </span>
                          <div>
                            <span className="driver-name">{displayName}</span>
                            {driver.email && (
                              <span className="driver-email-sub">{driver.email}</span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* 2. Pedidos pendientes */}
                      <td data-label="Pedidos pendientes" className="pending-cell">
                        {pending}
                      </td>

                      {/* 3. Pedidos entregados */}
                      <td data-label="Pedidos entregados" className="orders-cell">
                        {delivered.toLocaleString('es-AR')}
                      </td>

                      {/* 4. Dónde se dirige */}
                      <td data-label="Dónde se dirige" className="destination-cell" title={destination}>
                        {destination}
                      </td>

                      {/* 5. Estado del repartidor */}
                      <td data-label="Estado del repartidor">
                        <DriverStatusBadge status={driver.status} />
                      </td>

                      {/* 6. Acciones: Modificar y Borrar */}
                      <td className="actions-cell" data-label="Acciones">
                        <div className="row-actions">
                          <button
                            className="action-button"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(driver);
                            }}
                            aria-label={`Modificar ${displayName}`}
                            title="Modificar Repartidor"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="action-button action-button-danger"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDelete(driver);
                            }}
                            aria-label={`Borrar ${displayName}`}
                            title="Borrar Repartidor"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* HU #16: Mostrar más en la última fila */}
              {canShowMore && (
                <tr className="show-more-row">
                  <td colSpan="6">
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

      {/* HU #24: Ver detalle de Repartidor */}
      {detailDriver && (
        <DriverDetailModal
          driver={detailDriver}
          onClose={handleCloseDetail}
          onEdit={() => {
            const current = detailDriver;
            handleCloseDetail();
            handleOpenEdit(current);
          }}
        />
      )}

      {/* HU #5: Cargar Repartidor Modal (datos: nombre, apellido, email, password, telefono) */}
      {addingDriver && (
        <AddDriverModal
          formData={newDriverData}
          formErrors={newDriverErrors}
          onChange={handleNewDriverFieldChange}
          onClose={handleCloseAdd}
          onSubmit={handleAddDriver}
        />
      )}

      {/* HU #20: Modificar Repartidor Modal */}
      {editingDriver &&
        (confirmationOpen ? (
          <ConfirmEditModal
            driverName={`${formData.nombre} ${formData.apellido}`.trim()}
            onCancel={() => {
              // HU #20 Escenario 3: Se cancela la confirmación y se vuelve sin cambios
              handleCloseEdit();
            }}
            onConfirm={handleConfirmEdit}
          />
        ) : (
          <EditDriverModal
            formData={formData}
            formErrors={formErrors}
            onChange={handleFieldChange}
            onClose={handleCloseEdit}
            onSubmit={handleApplyEdit}
          />
        ))}

      {/* HU #6: Borrar Repartidor Modal */}
      {deletingDriver && (
        <DeleteDriverModal
          driverName={
            deletingDriver.name ||
            `${deletingDriver.nombre || deletingDriver.firstName || ''} ${deletingDriver.apellido || deletingDriver.lastName || ''}`.trim()
          }
          onCancel={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Notificación Toast */}
      {successToastMessage && (
        <div className="success-toast" role="status">
          {successToastMessage}
        </div>
      )}
    </section>
  );
}

function DriverStatusBadge({ status }) {
  const norm = (status || 'Activo').trim().toLowerCase();
  let label;
  let badgeClass;

  if (norm.includes('inactiv') || norm.includes('finalizado')) {
    label = 'Inactivo';
    badgeClass = 'driver-status-inactivo';
  } else if (norm.includes('retirando')) {
    label = 'Retirando pedido';
    badgeClass = 'driver-status-amarillo';
  } else if (norm.includes('viaje') || norm.includes('camino')) {
    label = 'En viaje';
    badgeClass = 'driver-status-amarillo';
  } else if (norm.includes('entregado')) {
    label = 'Entregado';
    badgeClass = 'driver-status-azul';
  } else if (norm.includes('asignado')) {
    label = 'Asignado';
    badgeClass = 'driver-status-asignado';
  } else {
    label = 'Activo';
    badgeClass = 'driver-status-activo';
  }

  return (
    <span className={`driver-status-badge ${badgeClass}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

// HU #24: Modal con todos los datos y últimos 10 pedidos entregados
function DriverDetailModal({ driver, onClose, onEdit }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayName =
    driver.name || `${driver.nombre || driver.firstName || ''} ${driver.apellido || driver.lastName || ''}`.trim();

  const delivered = Number(driver.deliveredOrders ?? driver.orders ?? 0);
  const pending = Number(driver.pendingOrders ?? 0);
  const historical =
    driver.historicalOrders !== undefined ? driver.historicalOrders : delivered * 4;

  // HU #24: últimos 10 pedidos entregados
  const deliveredOrdersList = Array.isArray(driver.recentOrders)
    ? driver.recentOrders.slice(0, 10)
    : [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Perfil de repartidor</p>
            <h2 id="driver-detail-title">{displayName}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="detail-modal-body">
          {/* Todos los datos del repartidor */}
          <div className="detail-summary-grid">
            <div className="detail-card">
              <span className="detail-card-label">
                <PhoneIcon />
                <span>Teléfono</span>
              </span>
              <span className="detail-card-value">{driver.telefono || driver.phone || 'No especificado'}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <EmailIcon />
                <span>Correo electrónico</span>
              </span>
              <span className="detail-card-value">{driver.email || 'No especificado'}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <StatusDotIcon />
                <span>Estado actual</span>
              </span>
              <span className="detail-card-value">
                <DriverStatusBadge status={driver.status} />
              </span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <LocationIcon />
                <span>Dónde se dirige</span>
              </span>
              <span className="detail-card-value">{driver.destination || 'En base'}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">
                <CalendarMonthIcon />
                <span>Pedidos pendientes</span>
              </span>
              <span className="detail-card-value detail-metric-number">{pending}</span>
            </div>

            <div className="detail-card detail-card-highlight">
              <span className="detail-card-label">
                <CalendarMonthIcon />
                <span>Pedidos entregados (mes)</span>
              </span>
              <span className="detail-card-value detail-metric-number">
                {delivered.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="detail-card detail-card-highlight">
              <span className="detail-card-label">
                <HistoryIcon />
                <span>Entregas históricas</span>
              </span>
              <span className="detail-card-value detail-metric-number">
                {historical.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* HU #24: Últimos 10 pedidos entregados */}
          <div className="detail-orders-section">
            <div className="detail-orders-header">
              <h3 className="detail-orders-title">Últimos pedidos completados</h3>
              <span className="detail-orders-count-badge">
                {deliveredOrdersList.length} pedidos entregados
              </span>
            </div>

            <div className="detail-orders-frame">
              <table className="detail-orders-table">
                <caption className="sr-only">Últimos 10 pedidos entregados del repartidor</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">ID del pedido</th>
                    <th scope="col">Ruta (Origen → Destino)</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveredOrdersList.length > 0 ? (
                    deliveredOrdersList.map((order, idx) => {
                      const orderId = order.id || `PED-${idx + 4100}`;
                      const orderDate = order.date || 'Reciente';
                      const route =
                        order.origin && order.destination
                          ? `${order.origin} → ${order.destination}`
                          : order.destination || 'Entrega estándar';

                      return (
                        <tr key={orderId}>
                          <td className="order-date-cell">{orderDate}</td>
                          <td className="order-id-cell">
                            <code>{orderId}</code>
                          </td>
                          <td className="order-route-cell">{route}</td>
                          <td>
                            <span className="status-badge status-entregado">
                              <span className="status-dot" aria-hidden="true" />
                              <span>Entregado</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="detail-orders-empty">
                        No hay pedidos entregados registrados para este repartidor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="detail-modal-footer">
          <button className="modal-cancel" type="button" onClick={onEdit}>
            Modificar repartidor
          </button>
          <button className="modal-apply" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// HU #5: Modal Cargar Repartidor (Los datos añadidos son: nombre, apellido, email, password, telefono)
function AddDriverModal({ formData, formErrors, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-driver-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Nuevo registro</p>
            <h2 id="add-driver-title">Cargar repartidor</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar carga"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            <label className="form-field" htmlFor="add-nombre">
              <span>Nombre *</span>
              <input
                id="add-nombre"
                name="nombre"
                type="text"
                placeholder="Ej. Lucas"
                value={formData?.nombre || ''}
                onChange={onChange}
                className={formErrors.nombre ? 'has-error' : ''}
              />
              {formErrors.nombre && (
                <small className="field-error">Completa el nombre.</small>
              )}
            </label>

            <label className="form-field" htmlFor="add-apellido">
              <span>Apellido *</span>
              <input
                id="add-apellido"
                name="apellido"
                type="text"
                placeholder="Ej. Fernández"
                value={formData?.apellido || ''}
                onChange={onChange}
                className={formErrors.apellido ? 'has-error' : ''}
              />
              {formErrors.apellido && (
                <small className="field-error">Completa el apellido.</small>
              )}
            </label>

            <label className="form-field" htmlFor="add-email">
              <span>Email *</span>
              <input
                id="add-email"
                name="email"
                type="email"
                placeholder="Ej. lucas@repartosya.com"
                value={formData?.email || ''}
                onChange={onChange}
                className={formErrors.email ? 'has-error' : ''}
              />
              {formErrors.email && (
                <small className="field-error">Completa el correo electrónico.</small>
              )}
            </label>

            <label className="form-field" htmlFor="add-telefono">
              <span>Teléfono *</span>
              <input
                id="add-telefono"
                name="telefono"
                type="tel"
                placeholder="Ej. +54 11 5821 4410"
                value={formData?.telefono || ''}
                onChange={onChange}
                className={formErrors.telefono ? 'has-error' : ''}
              />
              {formErrors.telefono && (
                <small className="field-error">Completa el teléfono.</small>
              )}
            </label>

            <label className="form-field full-width" htmlFor="add-password">
              <span>Contraseña *</span>
              <input
                id="add-password"
                name="password"
                type="password"
                placeholder="Ingresa la contraseña para el repartidor"
                value={formData?.password || ''}
                onChange={onChange}
                className={formErrors.password ? 'has-error' : ''}
              />
              {formErrors.password && (
                <small className="field-error">Completa la contraseña.</small>
              )}
            </label>
          </div>

          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="modal-apply" type="submit">
              Cargar repartidor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// HU #20: Modal Modificar Repartidor (Los datos modificados son: nombre, apellido, email, telefono, status, password)
function EditDriverModal({ formData, formErrors, onChange, onClose, onSubmit }) {
  // HU #20 Escenario 2: Se bloquea el botón aceptar si hay algún campo requerido vacío
  const hasEmptyFields =
    !formData.nombre ||
    !formData.nombre.trim() ||
    !formData.apellido ||
    !formData.apellido.trim() ||
    !formData.email ||
    !formData.email.trim() ||
    !formData.telefono ||
    !formData.telefono.trim() ||
    !formData.status ||
    !formData.status.trim();

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-driver-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Editar registro</p>
            <h2 id="edit-driver-title">Modificar repartidor</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modificación"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="edit-form" onSubmit={onSubmit} noValidate>
          <div className="form-fields">
            <label className="form-field" htmlFor="edit-nombre">
              <span>Nombre *</span>
              <input
                id="edit-nombre"
                name="nombre"
                type="text"
                value={formData.nombre || ''}
                onChange={onChange}
                className={formErrors.nombre || !formData.nombre?.trim() ? 'has-error' : ''}
              />
              {(formErrors.nombre || !formData.nombre?.trim()) && (
                <small className="field-error">Completa el nombre.</small>
              )}
            </label>

            <label className="form-field" htmlFor="edit-apellido">
              <span>Apellido *</span>
              <input
                id="edit-apellido"
                name="apellido"
                type="text"
                value={formData.apellido || ''}
                onChange={onChange}
                className={formErrors.apellido || !formData.apellido?.trim() ? 'has-error' : ''}
              />
              {(formErrors.apellido || !formData.apellido?.trim()) && (
                <small className="field-error">Completa el apellido.</small>
              )}
            </label>

            <label className="form-field" htmlFor="edit-email">
              <span>Email *</span>
              <input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={onChange}
                className={formErrors.email || !formData.email?.trim() ? 'has-error' : ''}
              />
              {(formErrors.email || !formData.email?.trim()) && (
                <small className="field-error">Completa el email.</small>
              )}
            </label>

            <label className="form-field" htmlFor="edit-telefono">
              <span>Teléfono *</span>
              <input
                id="edit-telefono"
                name="telefono"
                type="tel"
                value={formData.telefono || ''}
                onChange={onChange}
                className={formErrors.telefono || !formData.telefono?.trim() ? 'has-error' : ''}
              />
              {(formErrors.telefono || !formData.telefono?.trim()) && (
                <small className="field-error">Completa el teléfono.</small>
              )}
            </label>

            <label className="form-field full-width" htmlFor="edit-status">
              <span>Estado del repartidor *</span>
              <select
                id="edit-status"
                name="status"
                value={formData.status || 'Activo'}
                onChange={onChange}
              >
                <option value="Activo">Activo</option>
                <option value="Asignado">Asignado</option>
                <option value="Retirando pedido">Retirando pedido</option>
                <option value="En viaje">En viaje</option>
                <option value="Entregado">Entregado</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>

            <label className="form-field full-width" htmlFor="edit-password">
              <span>Contraseña (dejar en blanco para conservar actual)</span>
              <input
                id="edit-password"
                name="password"
                type="password"
                placeholder="Nueva contraseña opcional"
                value={formData.password || ''}
                onChange={onChange}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="modal-apply"
              type="submit"
              disabled={hasEmptyFields}
              title={
                hasEmptyFields
                  ? 'Completa todos los campos obligatorios para poder aceptar'
                  : 'Aceptar modificaciones'
              }
            >
              Aceptar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// HU #20: Advertencia pidiendo confirmación explícita
function ConfirmEditModal({ driverName, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-edit-driver-title"
      >
        <h2 id="confirm-edit-driver-title">¿Aplicar cambios?</h2>
        <p className="confirmation-copy">
          Se actualizarán los datos de <strong>{driverName}</strong> en el sistema de repartidores.
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
  );
}

// HU #6: Advertencia pidiendo confirmación explícita
function DeleteDriverModal({ driverName, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="confirmation-modal delete-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-driver-title"
      >
        <h2 id="delete-driver-title">¿Confirmas borrar el repartidor?</h2>
        <p className="confirmation-copy">
          Se eliminará a <strong>{driverName}</strong> de las listas y menús del sistema.
        </p>
        <div className="confirmation-actions">
          <button className="modal-cancel" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="modal-delete" type="button" onClick={onConfirm}>
            Borrar repartidor
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({ column, label, sort, onSort, className = '' }) {
  const isActive = sort.key === column;
  const directionLabel = isActive
    ? sort.direction === 'asc'
      ? 'ascendente'
      : 'descendente'
    : 'sin ordenar';

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
  );
}

function SortIcon({ direction }) {
  return (
    <span className={`sort-icon ${direction ? `sort-${direction}` : ''}`} aria-hidden="true">
      <ChevronUpIcon />
      <ChevronDownIcon />
    </span>
  );
}

/* Iconos SVG */
function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.3 4.3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 5.5 4 4M4 20l3.8-.8L19.3 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v5M14 11v5M6.5 7l.7 13h9.6l.7-13M9 7V4h6v3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarMonthIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function StatusDotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

export default RepartidoresSection;
