import { useEffect, useMemo, useState } from 'react';
import writeExcelFile from 'write-excel-file/browser';
import { getPedidosEntregados, getUploadUrl, rechazarEntrega } from '../services/api';
import './CommercesSection.css';
import './OrdersSection.css';
import './ReportsSection.css';

const REFRESH_INTERVAL = 60_000;

const TOP_LIMIT = 5;
const INITIAL_VISIBLE_COUNT = 20;
const VISIBLE_COUNT_STEP = 20;

const MAX_COLUMN_WIDTH = 60;
const DELIVERY_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'dateTime', label: 'Fecha y hora' },
    { key: 'origin', label: 'Origen' },
    { key: 'destination', label: 'Destino' },
    { key: 'driver', label: 'Repartidor' },
    { key: 'status', label: 'Estado' },
    { key: 'paymentMethod', label: 'Método de pago' },
    { key: 'price', label: 'Precio' },
];

const numberFormat = new Intl.NumberFormat('es-AR');
const currencyFormat = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
});
const dateTimeFormat = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});
const timeFormat = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});
const compactCurrencyFormat = new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

// Los pedidos viejos no tienen createdAt: la fecha de creacion esta en los primeros 4 bytes del _id de Mongo
function getCreationDate(order) {
    if (order.createdAt) {
        return new Date(order.createdAt);
    }
    if (order._id) {
        return new Date(parseInt(String(order._id).substring(0, 8), 16) * 1000);
    }
    return null;
}

function getDeliveredDate(order) {
    const deliveredEntry = [...(order.historialEstados ?? [])]
        .reverse()
        .find((change) => change.estadoNuevo === 'ENTREGADO')
        ?? [...(order.historialEstados ?? [])]
            .reverse()
            .find((change) => change.estadoNuevo === 'FALLIDO');
    const date = deliveredEntry?.fecha ? new Date(deliveredEntry.fecha) : getCreationDate(order);
    return date && !Number.isNaN(date.getTime()) ? date : null;
}

// El precio y el metodo de pago los carga el repartidor al entregar, desde la factura
function getRevenue(order) {
    return typeof order.comprobante?.precio === 'number' ? order.comprobante.precio : 0;
}

// Una fila por entrega, la mas reciente primero
function buildDeliveryRows(orders) {
    return orders
        .map((order) => {
            const date = getDeliveredDate(order);
            return {
                id: order.ID ?? '',
                date,
                dateTime: date ? dateTimeFormat.format(date).replace(',', '') : '',
                origin: order.comercioOrigen ?? '',
                destination: order.comercioDestino ?? '',
                driver: order.repartidorNombre ?? '',
                status: order.estado === 'FALLIDO' ? 'Fallido' : 'Entregado',
                paymentMethod: order.comprobante?.metodoPago || '-',
                price: typeof order.comprobante?.precio === 'number' ? currencyFormat.format(order.comprobante.precio) : '-',
                receiptUrl: order.comprobante?.imagen ? getUploadUrl(order.comprobante.imagen) : '',
            };
        })
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

// El ancho de cada columna sale del texto mas largo de su encabezado o sus celdas
function getColumnWidth(column, rows) {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[column.key]).length), column.label.length);
    return Math.min(longest + 3, MAX_COLUMN_WIDTH);
}

function downloadDeliveriesExcel(rows) {
    const sheetData = [
        DELIVERY_COLUMNS.map((column) => ({ value: column.label, fontWeight: 'bold' })),
        ...rows.map((row) => DELIVERY_COLUMNS.map((column) => (
            row[column.key] === '' ? null : { type: String, value: String(row[column.key]) }
        ))),
    ];
    const columns = DELIVERY_COLUMNS.map((column) => ({ width: getColumnWidth(column, rows) }));

    return writeExcelFile(sheetData, { columns, sheet: 'Entregas' })
        .toFile(`entregas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDayKey(date) {
    return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonth(key) {
    const [year, month] = key.split('-').map(Number);
    const label = new Intl.DateTimeFormat('es-AR', { month: 'short' })
        .format(new Date(year, month - 1, 1))
        .replace('.', '');
    return { label, year };
}

// Rangos de tiempo de Reportes: filtran la lista de entregas, el Excel y los graficos
// El rango diario se agrupa por hora, los de hasta 30 dias por dia y los largos por mes
const RANGES = [
    { key: 'today', label: 'Diario', unit: 'hour', days: 1 },
    { key: 'week', label: '7 días', unit: 'day', days: 7 },
    { key: 'month', label: '30 días', unit: 'day', days: 30 },
    { key: 'half', label: '6 meses', unit: 'month', months: 6 },
    { key: 'all', label: 'Histórico', unit: 'month' },
];

function getRangeStart(range) {
    const now = new Date();
    if (range.days) {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range.days - 1));
    }
    if (range.months) {
        return new Date(now.getFullYear(), now.getMonth() - (range.months - 1), 1);
    }
    return null;
}

function filterByRange(orders, range) {
    const start = getRangeStart(range);
    if (!start) {
        return orders;
    }
    return orders.filter((order) => {
        const date = getDeliveredDate(order);
        return date && date >= start;
    });
}

// Un grupo por dia o mes del rango, con los periodos sin entregas en cero
function buildTimeline(orders, range) {
    const dated = orders
        .map((order) => ({ date: getDeliveredDate(order), revenue: getRevenue(order) }))
        .filter((entry) => entry.date);

    const unit = range.unit;
    let start = getRangeStart(range);
    if (!start) {
        if (dated.length === 0) {
            return [];
        }
        const first = dated.reduce((min, entry) => (entry.date < min ? entry.date : min), dated[0].date);
        start = new Date(first.getFullYear(), first.getMonth(), 1);
    }

    const buckets = new Map();
    const cursor = new Date(start);
    const end = new Date();
    const getKey = (date) => {
        if (unit === 'hour') {
            return `${getDayKey(date)}-${String(date.getHours()).padStart(2, '0')}`;
        }
        return unit === 'day' ? getDayKey(date) : getMonthKey(date);
    };
    while (cursor <= end) {
        const key = getKey(cursor);
        let meta;
        if (unit === 'hour') {
            // Bajo la primera hora se muestra la fecha en lugar del anio
            meta = { label: `${cursor.getHours()}h`, year: `${cursor.getDate()}/${cursor.getMonth() + 1}` };
        } else if (unit === 'day') {
            meta = { label: `${cursor.getDate()}/${cursor.getMonth() + 1}`, year: cursor.getFullYear() };
        } else {
            meta = formatMonth(key);
        }
        buckets.set(key, { ...meta, count: 0, revenue: 0 });
        if (unit === 'hour') {
            cursor.setHours(cursor.getHours() + 1);
        } else if (unit === 'day') {
            cursor.setDate(cursor.getDate() + 1);
        } else {
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }

    dated.forEach(({ date, revenue }) => {
        const bucket = buckets.get(getKey(date));
        if (bucket) {
            bucket.count += 1;
            bucket.revenue += revenue;
        }
    });

    return [...buckets].map(([key, value]) => ({ key, ...value }));
}

function rankBy(orders, getName) {
    const totals = new Map();
    orders.forEach((order) => {
        const name = getName(order);
        totals.set(name, (totals.get(name) ?? 0) + 1);
    });
    return [...totals]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, TOP_LIMIT);
}

// Maximo del eje "redondo" (1, 2, 2.5, 5 x 10^n) para que las lineas de guia queden en numeros limpios
function niceMax(value) {
    if (value <= 0) {
        return 4;
    }
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value);
    return step * magnitude;
}

const MAX_LABELED_MONTHS = 12;

function Chart({ title, total, note, badge, timeline, valueKey, formatValue, formatAxis, tone, children }) {
    const max = niceMax(Math.max(...timeline.map((item) => item[valueKey]), 0));
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => max * ratio);
    const showValues = timeline.length <= MAX_LABELED_MONTHS;
    // Con muchos meses solo se rotula uno de cada N para que las etiquetas no se pisen
    const labelStep = Math.ceil(timeline.length / MAX_LABELED_MONTHS);

    return (
        <article className={`report-card report-chart report-chart-${tone}`}>
            <header className="report-card-header">
                <div>
                    <h2 className="report-card-title">{title}</h2>
                    {note && <p className="report-card-note">{note}</p>}
                </div>
                <div className="report-card-figure">
                    <p className="report-card-total">{total}</p>
                    {badge && <span className="report-badge">{badge}</span>}
                </div>
            </header>

            <div className="report-plot">
                <div className="report-axis" aria-hidden="true">
                    {ticks.map((tick) => <span key={tick}>{formatAxis(tick)}</span>)}
                </div>
                <div className="report-canvas">
                    <div className="report-gridlines" aria-hidden="true">
                        {ticks.map((tick) => <span key={tick} />)}
                    </div>
                    {children({ max, showValues })}
                </div>
            </div>

            <ol className="report-months" style={{ '--columns': timeline.length }}>
                {timeline.map((item, index) => {
                    const isYearStart = index === 0 || item.year !== timeline[index - 1].year;
                    const showLabel = index % labelStep === 0 || isYearStart;
                    return (
                        <li key={item.key}>
                            {showLabel && <span>{item.label}</span>}
                            {showLabel && isYearStart && <small>{item.year}</small>}
                        </li>
                    );
                })}
            </ol>

            <span className="sr-only">
                {note ? `${note}. ` : ''}
                {timeline.map((item) => `${item.label} ${item.year}: ${formatValue(item[valueKey])}`).join('. ')}
            </span>
        </article>
    );
}

function RankingCard({ title, subtitle, items, unit, emptyText }) {
    const top = items[0]?.count ?? 0;

    return (
        <article className="report-card">
            <header className="report-card-header">
                <div>
                    <h2 className="report-card-title">{title}</h2>
                    <p className="report-card-note">{subtitle}</p>
                </div>
            </header>

            {items.length === 0 ? (
                <p className="report-state">{emptyText}</p>
            ) : (
                <ol className="report-ranking">
                    {items.map((item) => (
                        <li key={item.name}>
                            <div className="report-ranking-row">
                                <span className="report-ranking-name" title={item.name}>{item.name}</span>
                                <span className="report-ranking-count">
                                    {numberFormat.format(item.count)} <small>{item.count === 1 ? unit.singular : unit.plural}</small>
                                </span>
                            </div>
                            <div className="report-ranking-track" aria-hidden="true">
                                <span style={{ width: `${(item.count / top) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </article>
    );
}

function DownloadIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11" />
            <path d="m7 11 5 5 5-5" />
            <path d="M5 20h14" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
        </svg>
    );
}

function ReceiptModal({ row, onClose, onReject }) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="edit-modal receipt-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="receipt-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-heading">
                    <div>
                        <h2 id="receipt-title">Pedido {row.id.split('-')[0]}</h2>
                        <p className="receipt-meta">
                            {[row.dateTime, row.paymentMethod, row.price].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar comprobante">
                        <CloseIcon />
                    </button>
                </div>
                <div className="receipt-body">
                    {imageFailed ? (
                        <p className="receipt-empty" role="alert">No se pudo cargar la imagen del comprobante.</p>
                    ) : (
                        <img
                            className="receipt-image"
                            src={row.receiptUrl}
                            alt={`Comprobante del pedido ${row.id}`}
                            onError={() => setImageFailed(true)}
                        />
                    )}
                </div>
                {row.status !== 'Fallido' && (
                    <div className="receipt-footer">
                        <button className="modal-delete" type="button" onClick={onReject}>
                            Rechazar entrega
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function RejectDeliveryModal({ row, busy, error, onCancel, onConfirm }) {
    return (
        <div className="modal-backdrop" role="presentation">
            <div
                className="confirmation-modal delete-confirmation-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reject-delivery-title"
            >
                <h2 id="reject-delivery-title">¿Confirmas rechazar la entrega?</h2>
                <p className="confirmation-copy">
                    Se rechazará la entrega del pedido <strong>{row.id.split('-')[0]}</strong>. El pedido pasará
                    al estado Fallido.
                </p>
                {error && <p className="report-export-error" role="alert">{error}</p>}
                <div className="confirmation-actions">
                    <button className="modal-cancel" type="button" onClick={onCancel} disabled={busy}>
                        Volver
                    </button>
                    <button className="modal-delete" type="button" onClick={onConfirm} disabled={busy} aria-busy={busy}>
                        {busy ? 'Rechazando...' : 'Rechazar entrega'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeliveriesList({ rows, onRejected }) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [receiptRow, setReceiptRow] = useState(null);
    const [rejectRow, setRejectRow] = useState(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectError, setRejectError] = useState('');
    const [toast, setToast] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportFailed, setExportFailed] = useState(false);
    const visibleRows = rows.slice(0, visibleCount);

    const handleExport = async () => {
        setIsExporting(true);
        setExportFailed(false);
        try {
            await downloadDeliveriesExcel(rows);
        } catch {
            setExportFailed(true);
        } finally {
            setIsExporting(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        setRejectError('');
        try {
            await rechazarEntrega(rejectRow.id);
            setRejectRow(null);
            setReceiptRow(null);
            setToast('La entrega fue rechazada y el pedido quedó como fallido');
            window.setTimeout(() => setToast(''), 3500);
            onRejected?.();
        } catch (error) {
            setRejectError(error.message || 'No se pudo rechazar la entrega');
        } finally {
            setRejecting(false);
        }
    };

    return (
        <section className="report-deliveries" aria-labelledby="deliveries-title">
            <div className="orders-list-heading">
                <h2 id="deliveries-title" className="orders-list-title">Listado de entregas</h2>
                <button
                    type="button"
                    className="report-export-button"
                    disabled={rows.length === 0 || isExporting}
                    aria-busy={isExporting}
                    onClick={handleExport}
                >
                    <DownloadIcon />
                    {isExporting ? 'Generando archivo...' : 'Descargar Excel'}
                </button>
            </div>

            {exportFailed && (
                <p className="report-export-error" role="alert">
                    No se pudo generar el archivo de Excel. Intentá de nuevo.
                </p>
            )}

            <div className="table-frame">
                <div className="table-scroll">
                    <table className="commerce-table deliveries-table">
                        <caption className="sr-only">Listado de pedidos entregados</caption>
                        <thead>
                            <tr>
                                {DELIVERY_COLUMNS.map((column) => (
                                    <th key={column.key} scope="col">{column.label}</th>
                                ))}
                                <th scope="col">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row, index) => (
                                <tr key={`${row.id}-${index}`}>
                                    <th scope="row" data-label="ID">
                                        <span className="commerce-name">{row.id}</span>
                                    </th>
                                    <td data-label="Fecha y hora" className="order-date-cell">{row.dateTime}</td>
                                    <td data-label="Origen">{row.origin}</td>
                                    <td data-label="Destino">{row.destination}</td>
                                    <td data-label="Repartidor">{row.driver}</td>
                                    <td data-label="Estado">
                                        <span className={`status-badge status-${row.status === 'Fallido' ? 'fallido' : 'entregado'}`}>
                                            <span className="status-dot" aria-hidden="true" />
                                            <span>{row.status}</span>
                                        </span>
                                    </td>
                                    <td data-label="Método de pago">{row.paymentMethod}</td>
                                    <td data-label="Precio" className="order-date-cell">{row.price}</td>
                                    <td data-label="Comprobante">
                                        {row.receiptUrl ? (
                                            <button
                                                type="button"
                                                className="report-receipt-button"
                                                onClick={() => setReceiptRow(row)}
                                                aria-label={`Ver comprobante del pedido ${row.id}`}
                                            >
                                                Ver comprobante
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="report-receipt-button"
                                                disabled
                                                aria-label={`El pedido ${row.id} no tiene comprobante`}
                                            >
                                                Ver comprobante
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr className="empty-results-row">
                                    <td colSpan={DELIVERY_COLUMNS.length + 1}>No hay entregas en el período seleccionado</td>
                                </tr>
                            )}
                            {rows.length > visibleCount && (
                                <tr className="show-more-row">
                                    <td colSpan={DELIVERY_COLUMNS.length + 1}>
                                        <button
                                            className="show-more-button"
                                            type="button"
                                            onClick={() => setVisibleCount((count) => count + VISIBLE_COUNT_STEP)}
                                        >
                                            Mostrar más
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {receiptRow && (
                <ReceiptModal
                    row={receiptRow}
                    onClose={() => setReceiptRow(null)}
                    onReject={() => {
                        setRejectError('');
                        setRejectRow(receiptRow);
                    }}
                />
            )}
            {rejectRow && (
                <RejectDeliveryModal
                    row={rejectRow}
                    busy={rejecting}
                    error={rejectError}
                    onCancel={() => setRejectRow(null)}
                    onConfirm={handleReject}
                />
            )}
            {toast && <div className="success-toast" role="status">{toast}</div>}
        </section>
    );
}

function ReportsSection() {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [tab, setTab] = useState('deliveries');
    const [rangeKey, setRangeKey] = useState('week');
    const range = RANGES.find((item) => item.key === rangeKey);
    // Reintentar vuelve a montar la carga y el refresco periodico
    const [reloadCount, setReloadCount] = useState(0);
    const retry = () => setReloadCount((count) => count + 1);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const data = await getPedidosEntregados();
                if (!Array.isArray(data)) {
                    throw new Error('La respuesta de pedidos no tiene un formato válido.');
                }
                if (isMounted) {
                    // La lista de entregas muestra los entregados y los fallidos; los cancelados no
                    setOrders(data.filter((order) => order.estado === 'ENTREGADO' || order.estado === 'FALLIDO'));
                    setUpdatedAt(new Date());
                    setError('');
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError.message || 'No se pudo cargar');
                }
            }
        };

        load();
        const interval = window.setInterval(load, REFRESH_INTERVAL);
        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [reloadCount]);

    const report = useMemo(() => {
        if (!orders) {
            return null;
        }
        // Los graficos cuentan solo las entregas vigentes: los fallidos quedan fuera
        const entregados = orders.filter((order) => order.estado === 'ENTREGADO');
        const rangeOrders = filterByRange(entregados, range);
        return {
            entregados,
            rangeOrders,
            timeline: buildTimeline(rangeOrders, range),
            deliveries: buildDeliveryRows(filterByRange(orders, range)),
            totalRevenue: rangeOrders.reduce((sum, order) => sum + getRevenue(order), 0),
            drivers: rankBy(rangeOrders, (order) => order.repartidorNombre || 'Sin repartidor'),
            commerces: rankBy(rangeOrders, (order) => order.comercioDestino || 'Comercio no especificado'),
        };
    }, [orders, range]);

    return (
        <section className="reports-section" aria-labelledby="reports-title">
            <div className="admin-header-title-row">
                <div>
                    <h1 className="main-title" id="reports-title">Reportes</h1>
                    {updatedAt && (
                        <p className="subtitle-date">Actualizado a las {timeFormat.format(updatedAt)}</p>
                    )}
                </div>

                <div className="report-range" role="group" aria-label="Rango de tiempo">
                    {RANGES.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`report-range-button${rangeKey === item.key ? ' is-active' : ''}`}
                            aria-pressed={rangeKey === item.key}
                            onClick={() => setRangeKey(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="report-tabs" role="tablist" aria-label="Secciones de reportes">
                {[['deliveries', 'Entregas'], ['charts', 'Gráficos']].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        id={`report-tab-${key}`}
                        aria-selected={tab === key}
                        aria-controls={`report-panel-${key}`}
                        className={`report-tab${tab === key ? ' is-active' : ''}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && orders && (
                <p className="report-stale" role="status">
                    No se pudo actualizar. Estás viendo los datos de las {timeFormat.format(updatedAt)}.
                    <button type="button" className="report-retry-button" onClick={retry}>Reintentar</button>
                </p>
            )}

            {error && !orders ? (
                <div className="report-state report-state-error" role="alert">
                    <p>No se pudieron cargar los reportes. Revisá la conexión e intentá de nuevo.</p>
                    <button type="button" className="report-retry-button" onClick={retry}>Reintentar</button>
                </div>
            ) : !report ? (
                <div className="report-main-grid" role="status" aria-label="Cargando reportes">
                    <div className="report-card report-skeleton" />
                    <div className="report-card report-skeleton" />
                </div>
            ) : tab === 'deliveries' ? (
                <div role="tabpanel" id="report-panel-deliveries" aria-labelledby="report-tab-deliveries">
                    <DeliveriesList rows={report.deliveries} onRejected={retry} />
                </div>
            ) : report.entregados.length === 0 ? (
                <p className="report-state" role="status">
                    Todavía no hay pedidos entregados. Los gráficos aparecen con la primera entrega.
                </p>
            ) : (
                <div className="report-charts-panel" role="tabpanel" id="report-panel-charts" aria-labelledby="report-tab-charts">
                    <div className="report-main-grid">
                        <Chart
                            title="Pedidos entregados"
                            note={{ hour: 'Entregas por hora', day: 'Entregas por día', month: 'Entregas por mes' }[range.unit]}
                            total={`${numberFormat.format(report.rangeOrders.length)} en el período`}
                            timeline={report.timeline}
                            valueKey="count"
                            formatValue={(value) => numberFormat.format(value)}
                            formatAxis={(value) => numberFormat.format(Math.round(value))}
                            tone="count"
                        >
                            {({ max, showValues }) => (
                                <ul className="report-bars" style={{ '--columns': report.timeline.length }}>
                                    {report.timeline.map((item) => (
                                        <li
                                            key={item.key}
                                            className="report-point"
                                            tabIndex={0}
                                            aria-label={`${item.label} ${item.year}: ${numberFormat.format(item.count)}`}
                                            data-tip={`${item.label} ${item.year}: ${numberFormat.format(item.count)}`}
                                        >
                                            <span className="report-bar" style={{ height: `${(item.count / max) * 100}%` }}>
                                                {showValues && item.count > 0 && <span className="report-bar-value">{numberFormat.format(item.count)}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Chart>

                        <Chart
                            title="Ingresos"
                            note="Suma de los precios cargados en los comprobantes de entrega"
                            total={currencyFormat.format(report.totalRevenue)}
                            timeline={report.timeline}
                            valueKey="revenue"
                            formatValue={(value) => currencyFormat.format(value)}
                            formatAxis={(value) => `$ ${compactCurrencyFormat.format(value)}`}
                            tone="revenue"
                        >
                            {({ max, showValues }) => {
                                const columns = report.timeline.length;
                                const points = report.timeline.map((item, index) => ({
                                    x: ((index + 0.5) / columns) * 100,
                                    y: 100 - (item.revenue / max) * 100,
                                    item,
                                }));
                                const line = points.map((point) => `${point.x},${point.y}`).join(' ');
                                const area = `${points[0].x},100 ${line} ${points[points.length - 1].x},100`;

                                return (
                                    <>
                                        <svg className="report-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                            <polygon className="report-line-area" points={area} />
                                            <polyline className="report-line-stroke" points={line} vectorEffect="non-scaling-stroke" />
                                        </svg>
                                        <ul className="report-dots">
                                            {points.map(({ x, y, item }) => (
                                                <li
                                                    key={item.key}
                                                    className="report-point"
                                                    style={{ left: `${x}%`, top: `${y}%` }}
                                                    tabIndex={0}
                                                    aria-label={`${item.label} ${item.year}: ${currencyFormat.format(item.revenue)} estimados`}
                                                    data-tip={`${item.label} ${item.year}: ${currencyFormat.format(item.revenue)}`}
                                                >
                                                    {showValues && item.revenue > 0 && (
                                                        <span className="report-dot-value">$ {compactCurrencyFormat.format(item.revenue)}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                );
                            }}
                        </Chart>
                    </div>

                    <div className="report-secondary-grid">
                        <RankingCard
                            title="Repartidores con más entregas"
                            subtitle={`Top ${TOP_LIMIT} del período`}
                            items={report.drivers}
                            unit={{ singular: 'entrega', plural: 'entregas' }}
                            emptyText="Todavía no hay entregas asignadas a repartidores."
                        />
                        <RankingCard
                            title="Comercios con mayor demanda"
                            subtitle={`Top ${TOP_LIMIT} por pedidos recibidos`}
                            items={report.commerces}
                            unit={{ singular: 'pedido', plural: 'pedidos' }}
                            emptyText="Todavía no hay pedidos entregados a comercios."
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

export default ReportsSection;
