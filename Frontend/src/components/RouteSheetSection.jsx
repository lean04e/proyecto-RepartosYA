import { useEffect, useMemo, useState } from 'react'
import { getAll, getPedidos } from '../services/api'
import './RouteSheetSection.css'

const UNASSIGNED_TAB = 'unassigned'
const ASSIGNED_TAB = 'assigned'

const shortId = (pedido) => String(pedido.ID || pedido._id).slice(0, 8)

const isDriverAvailable = (driver) => {
  const status = String(driver.status || '').trim().toLowerCase()
  return !status.includes('inactiv') && !status.includes('finalizado')
}

const API_PEDIDOS = 'http://localhost:3001/api/pedidos'

const toDriver = (repartidor) => ({
  id: repartidor._id || repartidor.id,
  name: `${repartidor.nombre || ''} ${repartidor.apellido || ''}`.trim(),
  status: repartidor.status || repartidor.estado || 'Activo',
})

// La asignacion se guarda en el pedido (repartidor + estado ASIGNADO); la lista se arma desde el backend.
function RouteSheetSection() {
  const [drivers, setDrivers] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [actionError, setActionError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(UNASSIGNED_TAB)
  const [selectedByOrigin, setSelectedByOrigin] = useState({})
  const [driverByOrigin, setDriverByOrigin] = useState({})
  const [driverErrors, setDriverErrors] = useState({})

  useEffect(() => {
    let isMounted = true

    Promise.all([getPedidos(), getAll('repartidores')])
      .then(([pedidosData, repartidoresData]) => {
        if (!isMounted) return
        if (!Array.isArray(pedidosData)) {
          throw new Error('La respuesta de pedidos no tiene un formato válido.')
        }
        setPedidos(
          pedidosData.filter(
            (pedido) => pedido.estado === 'REGISTRADO' || pedido.estado === 'ASIGNADO',
          ),
        )
        setDrivers(Array.isArray(repartidoresData) ? repartidoresData.map(toDriver) : [])
        setLoadError('')
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
  }, [])

  const availableDrivers = useMemo(() => drivers.filter(isDriverAvailable), [drivers])

  const assignedCountByDriver = useMemo(() => {
    const counts = {}
    pedidos.forEach((pedido) => {
      if (pedido.estado === 'ASIGNADO' && pedido.repartidor) {
        counts[pedido.repartidor] = (counts[pedido.repartidor] || 0) + 1
      }
    })
    return counts
  }, [pedidos])

  const unassignedGroups = useMemo(() => {
    const groups = new Map()
    pedidos
      .filter((pedido) => pedido.estado === 'REGISTRADO')
      .forEach((pedido) => {
        if (!groups.has(pedido.origen)) groups.set(pedido.origen, [])
        groups.get(pedido.origen).push(pedido)
      })
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [pedidos])

  const assignedGroups = useMemo(() => {
    const groups = new Map()
    pedidos
      .filter((pedido) => pedido.estado === 'ASIGNADO')
      .forEach((pedido) => {
        const driverName = pedido.repartidor || 'Repartidor desconocido'
        if (!groups.has(driverName)) groups.set(driverName, [])
        groups.get(driverName).push(pedido)
      })
    return [...groups.entries()].map(([driverName, list]) => [
      driverName,
      [...list].sort((a, b) => a.origen.localeCompare(b.origen, 'es')),
    ])
  }, [pedidos])

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
    const driver = drivers.find((candidate) => String(candidate.id) === String(driverId))
    if (!driver) {
      setDriverErrors((current) => ({ ...current, [origin]: true }))
      return
    }

    const selectedIds = selectedByOrigin[origin] || []
    const toAssign = selectedIds.length > 0
      ? groupPedidos.filter((pedido) => selectedIds.includes(pedido._id))
      : groupPedidos

    try {
      const response = await fetch(`${API_PEDIDOS}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: toAssign.map((pedido) => pedido.ID), repartidor: driver.name }),
      })
      if (!response.ok) throw new Error('No se pudieron asignar los pedidos.')

      const assignedIds = new Set(toAssign.map((pedido) => pedido._id))
      setPedidos((current) =>
        current.map((pedido) =>
          assignedIds.has(pedido._id)
            ? { ...pedido, estado: 'ASIGNADO', repartidor: driver.name }
            : pedido,
        ),
      )
      setSelectedByOrigin((current) => ({ ...current, [origin]: [] }))
      setActionError('')
    } catch (error) {
      setActionError(error.message)
    }
  }

  const handleUnassign = async (pedido) => {
    try {
      const response = await fetch(`${API_PEDIDOS}/desasignar/${pedido.ID}`, { method: 'PUT' })
      if (!response.ok) throw new Error('No se pudo quitar la asignación del pedido.')

      setPedidos((current) =>
        current.map((candidate) =>
          candidate._id === pedido._id
            ? { ...candidate, estado: 'REGISTRADO', repartidor: null }
            : candidate,
        ),
      )
      setActionError('')
    } catch (error) {
      setActionError(error.message)
    }
  }

  return (
    <section className="route-sheet-section" aria-labelledby="route-sheet-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gestion de operaciones</p>
          <h1 id="route-sheet-title">Hoja de Ruta</h1>
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

      {actionError && (
        <p className="route-message route-message-error" role="alert">
          {actionError}
        </p>
      )}
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
                      {availableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} ({assignedCountByDriver[driver.name] || 0} asignados)
                        </option>
                      ))}
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
                    {groupPedidos.map((pedido) => (
                      <tr key={pedido._id}>
                        <td className="route-check-col">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(pedido._id)}
                            onChange={() => togglePedido(origin, pedido._id)}
                            aria-label={`Seleccionar pedido ${shortId(pedido)}`}
                          />
                        </td>
                        <td><code>{shortId(pedido)}</code></td>
                        <td>{pedido.origen}</td>
                        <td>{pedido.destino}</td>
                      </tr>
                    ))}
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
          assignedGroups.map(([driverName, groupPedidos]) => (
            <article className="route-group" key={driverName}>
              <header className="route-group-header">
                <div>
                  <h2 className="route-group-title">{driverName}</h2>
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
                  {groupPedidos.map((pedido) => (
                    <tr key={pedido._id}>
                      <td><code>{shortId(pedido)}</code></td>
                      <td>{pedido.origen}</td>
                      <td>{pedido.destino}</td>
                      <td className="route-action-col">
                        <button
                          className="modal-cancel"
                          type="button"
                          onClick={() => handleUnassign(pedido)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
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
