import { useEffect, useMemo, useState } from 'react'
import { getPedidos } from '../services/api'
import './RouteSheetSection.css'

const UNASSIGNED_TAB = 'unassigned'
const ASSIGNED_TAB = 'assigned'

const shortId = (pedido) => String(pedido.ID || pedido._id).slice(0, 8)

const isDriverAvailable = (driver) => {
  const status = String(driver.status || 'Activo').trim().toLowerCase()
  return status === 'activo'
}

// assignments: { [pedido._id]: driverId }. Por ahora vive solo en el front;
// cuando el backend exponga la asignacion, handleAssign/handleUnassign deben llamarla.
function RouteSheetSection({ drivers = [], assignments, onAssignmentsChange }) {
  const [pedidos, setPedidos] = useState([])
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(UNASSIGNED_TAB)
  const [selectedByOrigin, setSelectedByOrigin] = useState({})
  const [driverByOrigin, setDriverByOrigin] = useState({})
  const [driverErrors, setDriverErrors] = useState({})
  const [localDrivers, setLocalDrivers] = useState(drivers || [])
 
useEffect(() => {
    let isMounted = true

    // Hacemos las dos peticiones a la BD en simultáneo
    Promise.all([
      getPedidos(),
      fetch('http://localhost:3001/api/repartidores').then(res => res.json())
    ])
      .then(([dataPedidos, dataRepartidores]) => {
        if (!isMounted) return

        // 1. Guardamos los repartidores reales
        if (Array.isArray(dataRepartidores)) {
          setLocalDrivers(dataRepartidores)
        }

        if (!Array.isArray(dataPedidos)) {
          throw new Error('La respuesta de pedidos no tiene un formato válido.')
        }
        
        // 2. Traemos los pedidos pendientes Y los que ya están en viaje
        const pedidosValidos = dataPedidos.filter((pedido) => 
          pedido.estado === 'REGISTRADO' || pedido.estado === 'EN_CAMINO'
        )
        setPedidos(pedidosValidos)
        setLoadError('')

// 3. Sincronizamos las asignaciones reales que vienen del backend
        const asignacionesBackend = {}
        pedidosValidos.forEach((p) => {
          if (p.repartidor && p.estado === 'EN_CAMINO') {
            
            const repartidorBd = String(p.repartidor).trim().toLowerCase();
            
            const driverMatch = dataRepartidores.find(d => {
              const fullName = String(d.name || `${d.nombre || ''} ${d.apellido || ''}`).trim().toLowerCase();
              const justName = String(d.nombre || '').trim().toLowerCase();
              
              // Coincide si es exactamente igual al nombre completo o aunque sea al primer nombre
              return fullName === repartidorBd || justName === repartidorBd;
            });

            if (driverMatch) {
              const pId = p.ID || p._id;
              const dId = driverMatch.id || driverMatch._id;
              asignacionesBackend[pId] = String(dId);
            }
          }
        })
        
        if (Object.keys(asignacionesBackend).length > 0) {
          onAssignmentsChange(current => ({ ...current, ...asignacionesBackend }))
        }
      })
      .catch((error) => {
        if (isMounted) setLoadError(error.message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [onAssignmentsChange])

  const availableDrivers = useMemo(() => localDrivers.filter(isDriverAvailable), [localDrivers])
  const driversById = useMemo(
    () => Object.fromEntries(localDrivers.map((driver) => [String(driver.id || driver._id || driver.ID), driver])),
    [localDrivers],
  )

  const assignedCountByDriver = useMemo(() => {
    const counts = {}
    Object.values(assignments).forEach((driverId) => {
      counts[driverId] = (counts[driverId] || 0) + 1
    })
    return counts
  }, [assignments])

const unassignedGroups = useMemo(() => {
    const groups = new Map()
    pedidos
      .filter((pedido) => !assignments[pedido.ID || pedido._id])
      .forEach((pedido) => {
        if (!groups.has(pedido.origen)) groups.set(pedido.origen, [])
        groups.get(pedido.origen).push(pedido)
      })
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [pedidos, assignments])

  const assignedGroups = useMemo(() => {
    const groups = new Map()
    pedidos
      .filter((pedido) => assignments[pedido.ID || pedido._id])
      .forEach((pedido) => {
        const driverId = assignments[pedido.ID || pedido._id]
        if (!groups.has(driverId)) groups.set(driverId, [])
        groups.get(driverId).push(pedido)
      })
    return [...groups.entries()].map(([driverId, list]) => [
      driverId,
      [...list].sort((a, b) => a.origen.localeCompare(b.origen, 'es')),
    ])
  }, [pedidos, assignments])

  const unassignedCount = unassignedGroups.reduce((total, [, list]) => total + list.length, 0)
  const assignedCount = assignedGroups.reduce((total, [, list]) => total + list.length, 0)

  const togglePedido = (origin, pedidoId) => {
    setSelectedByOrigin((current) => {
      const selected = new Set(current[origin] || [])
      if (selected.has(pedidoId)) selected.delete(pedidoId)
      else selected.add(pedidoId)
      return { ...current, [origin]: [...selected] }
    })
  }

  const handleDriverChange = (origin, driverId) => {
    setDriverByOrigin((current) => ({ ...current, [origin]: driverId }))
    setDriverErrors((current) => ({ ...current, [origin]: false }))
  }

const handleAssign = async (origin, groupPedidos) => {
    const driverId = driverByOrigin[origin]
    if (!driverId) {
      setDriverErrors((current) => ({ ...current, [origin]: true }))
      return
    }

    // ARREGLO: Buscamos el nombre completo (nombre + apellido) para mandarlo a la BD
    const d = driversById[driverId];
    const driverName = d?.name || `${d?.nombre || ''} ${d?.apellido || ''}`.trim() || driverId;

    const selectedIds = selectedByOrigin[origin] || []
    const toAssign = selectedIds.length > 0
      ? groupPedidos.filter((pedido) => selectedIds.includes(pedido.ID || pedido._id))
      : groupPedidos

    try {
      // Mandamos la orden al backend para cada pedido seleccionado
      await Promise.all(toAssign.map(async (pedido) => {
        const idPedido = pedido.ID || pedido._id;
        const response = await fetch(`http://localhost:3001/api/pedidos/asignar/${idPedido}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repartidor: driverName }) // Enviamos el nombre completo
        });
        
        if (!response.ok) {
          console.error(`Falló la asignación del pedido ${idPedido}`);
        }
      }));

      // Lo movemos visualmente a la pestaña "Asignados"
      onAssignmentsChange((current) => {
        const next = { ...current }
        toAssign.forEach((pedido) => {
          next[pedido.ID || pedido._id] = String(driverId)
        })
        return next
      })
      setSelectedByOrigin((current) => ({ ...current, [origin]: [] }))
      
    } catch (error) {
      console.error("Error al conectar con la base de datos:", error);
      alert("Ocurrió un error al asignar los pedidos.");
    }
  }

const handleUnassign = async (pedidoId) => {
    try {
      // Le avisamos a MongoDB que devuelva el pedido a estado REGISTRADO
      const response = await fetch(`http://localhost:3001/api/pedidos/desasignar/${pedidoId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        // Si sale bien, lo borramos de la pestaña "Asignados" en pantalla
        onAssignmentsChange((current) => {
          const next = { ...current }
          delete next[pedidoId]
          return next
        });
      } else {
        alert("Error al quitar el pedido en la base de datos.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión al intentar desasignar el pedido.");
    }
  }

  return (
    <section className="route-sheet-section" aria-labelledby="route-sheet-title">
      <div className="admin-header-title-row">  
        <div>
          <p className="eyebrow"><span className="green-dot" /> DESPACHO CENTRAL · TIEMPO REAL</p>
          <h1 className="main-title" id="route-sheet-title">Hoja de Ruta</h1>
          <p className="subtitle-date">Asignación de pedidos y trazabilidad de rutas</p>
        </div>
      </div>

      <div className="route-tabs" role="tablist" aria-label="Estado de asignación">
        <button
          className={`route-tab${activeTab === UNASSIGNED_TAB ? ' active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === UNASSIGNED_TAB}
          onClick={() => setActiveTab(UNASSIGNED_TAB)}
        >
          Por asignar <span className="route-tab-count">{unassignedCount}</span>
        </button>
        <button
          className={`route-tab${activeTab === ASSIGNED_TAB ? ' active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === ASSIGNED_TAB}
          onClick={() => setActiveTab(ASSIGNED_TAB)}
        >
          Asignados <span className="route-tab-count">{assignedCount}</span>
        </button>
      </div>

      {isLoading && <p className="route-message">Cargando pedidos...</p>}
      {loadError && (
        <p className="route-message route-message-error" role="alert">
          No se pudieron cargar los pedidos: {loadError}
        </p>
      )}

      {!isLoading && !loadError && activeTab === UNASSIGNED_TAB && (
        unassignedGroups.length === 0 ? (
          <p className="route-message">No hay pedidos registrados pendientes de asignar.</p>
        ) : (
          unassignedGroups.map(([origin, groupPedidos]) => {
            const selectedIds = selectedByOrigin[origin] || []
            const hasError = driverErrors[origin]

            return (
              <article className="route-group" key={origin}>
                <header className="route-group-header">
                  <div>
                    <h2 className="route-group-title">{origin}</h2>
                    <span className="route-group-count">
                      {groupPedidos.length} {groupPedidos.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>
                  <div className="route-group-actions">
                    <select
                      className={`route-driver-select${hasError ? ' has-error' : ''}`}
                      value={driverByOrigin[origin] || ''}
                      onChange={(event) => handleDriverChange(origin, event.target.value)}
                      aria-label={`Repartidor para los pedidos de ${origin}`}
                      aria-invalid={hasError ? 'true' : undefined}
                    >
                      <option value="">Seleccionar repartidor</option>
                        {availableDrivers.map((driver) => {
                        const driverId = String(driver.id || driver._id || driver.ID);
                        const driverName = driver.name || `${driver.nombre || ''} ${driver.apellido || ''}`.trim() || 'Repartidor';
                        return (
                          <option key={driverId} value={driverId}>
                            {driverName} ({assignedCountByDriver[driverId] || 0} asignados)
                          </option>
                        );
                      })}
                    </select>
                    <button
                      className="modal-apply"
                      type="button"
                      onClick={() => handleAssign(origin, groupPedidos)}
                    >
                      {selectedIds.length > 0
                        ? `Asignar seleccionados (${selectedIds.length})`
                        : 'Asignar todos'}
                    </button>
                  </div>
                </header>
                {hasError && (
                  <p className="route-field-error" role="alert">
                    Seleccioná un repartidor para asignar los pedidos.
                  </p>
                )}

                <table className="route-table">
                  <caption className="sr-only">Pedidos registrados con origen {origin}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="route-check-col">
                        <span className="sr-only">Seleccionar</span>
                      </th>
                      <th scope="col">ID del pedido</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Destino</th>
                    </tr>
                  </thead>
                    <tbody>
                    {groupPedidos.map((pedido) => {
                      const idReal = pedido.ID || pedido._id;
                      return (
                        <tr key={idReal}>
                          <td className="route-check-col">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(idReal)}
                              onChange={() => togglePedido(origin, idReal)}
                              aria-label={`Seleccionar pedido ${shortId(pedido)}`}
                            />
                          </td>
                          <td><code>{shortId(pedido)}</code></td>
                          <td>{pedido.origen}</td>
                          <td>{pedido.destino}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </article>
            )
          })
        )
      )}

      {!isLoading && !loadError && activeTab === ASSIGNED_TAB && (
        assignedGroups.length === 0 ? (
          <p className="route-message">Todavía no asignaste ningún pedido.</p>
        ) : (
          assignedGroups.map(([driverId, groupPedidos]) => (
            <article className="route-group" key={driverId}>
              <header className="route-group-header">
                <div>
                  <h2 className="route-group-title">
                    {driversById[driverId] 
                      ? (driversById[driverId].name || `${driversById[driverId].nombre || ''} ${driversById[driverId].apellido || ''}`.trim() || 'Repartidor')
                      : 'Repartidor desconocido'}
                  </h2>
                  <span className="route-group-count">
                    {groupPedidos.length} {groupPedidos.length === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
              </header>

              <table className="route-table">
                <caption className="sr-only">Pedidos asignados al repartidor</caption>
                <thead>
                  <tr>
                    <th scope="col">ID del pedido</th>
                    <th scope="col">Origen</th>
                    <th scope="col">Destino</th>
                    <th scope="col" className="route-action-col">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                    <tbody>
                    {groupPedidos.map((pedido) => {
                      const idReal = pedido.ID || pedido._id;
                      return (
                        <tr key={idReal}>
                          <td><code>{shortId(pedido)}</code></td>
                          <td>{pedido.origen}</td>
                          <td>{pedido.destino}</td>
                          <td className="route-action-col">
                            <button
                              className="modal-cancel"
                              type="button"
                              onClick={() => handleUnassign(idReal)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
              </table>
            </article>
          ))
        )
      )}
    </section>
  )
}

export default RouteSheetSection
