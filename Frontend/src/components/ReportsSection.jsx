import { useEffect, useMemo, useState } from 'react';
import writeExcelFile from 'write-excel-file/browser';
import { getPedidosEntregados, getUploadUrl } from '../services/api';
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
        .find((change) => change.estadoNuevo === 'ENTREGADO');
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
                paymentMethod: order.comprobante?.metodoPago ?? '',
                price: typeof order.comprobante?.precio === 'number' ? currencyFormat.format(order.comprobante.precio) : '',
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

function formatMonth(key) {
    const [year, month] = key.split('-').map(Number);
    const label = new Intl.DateTimeFormat('es-AR', { month: 'short' })
        .format(new Date(year, month - 1, 1))
        .replace('.', '');
    return { label, year };
}

// Un grupo por mes, desde la primera entrega hasta hoy, con los meses sin entregas en cero
function buildTimeline(orders) {
    const dated = orders
        .map((order) => ({ date: getDeliveredDate(order), revenue: getRevenue(order) }))
        .filter((entry) => entry.date);

    if (dated.length === 0) {
        return [];
    }

    const first = dated.reduce((min, entry) => (entry.date < min ? entry.date : min), dated[0].date);
    const buckets = new Map();
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date();
    while (cursor <= end) {
        buckets.set(getMonthKey(cursor), { count: 0, revenue: 0 });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    dated.forEach(({ date, revenue }) => {
        const bucket = buckets.get(getMonthKey(date));
        if (bucket) {
            bucket.count += 1;
            bucket.revenue += revenue;
        }
    });

    return [...buckets].map(([key, value]) => ({ key, ...formatMonth(key), ...value }));
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

function ReceiptModal({ row, onClose }) {
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
            </div>
        </div>
    );
}

function DeliveriesList({ rows }) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [receiptRow, setReceiptRow] = useState(null);
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
                                            <span className="report-receipt-none">Sin comprobante</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr className="empty-results-row">
                                    <td colSpan={DELIVERY_COLUMNS.length + 1}>No hay pedidos entregados</td>
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

            {receiptRow && <ReceiptModal row={receiptRow} onClose={() => setReceiptRow(null)} />}
        </section>
    );
}

function ReportsSection() {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);
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
                    setOrders(data.filter((order) => order.estado === 'ENTREGADO'));
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
        return {
            timeline: buildTimeline(orders),
            deliveries: buildDeliveryRows(orders),
            totalRevenue: orders.reduce((sum, order) => sum + getRevenue(order), 0),
            drivers: rankBy(orders, (order) => order.repartidorNombre || 'Sin repartidor'),
            commerces: rankBy(orders, (order) => order.comercioDestino || 'Comercio no especificado'),
        };
    }, [orders]);

    return (
        <section className="reports-section" aria-labelledby="reports-title">
            <div className="admin-header-title-row">
                <div>
                    <h1 className="main-title" id="reports-title">Reportes</h1>
                    <p className="subtitle-date">
                        Incluye pedidos ya eliminados del listado
                        {updatedAt && ` · Actualizado a las ${timeFormat.format(updatedAt)}`}
                    </p>
                </div>

                {/* Cuando exista el filtrado por fecha, este rango pasa a ser un selector (diario, mensual, histórico) */}
                <p className="report-scope">Histórico</p>
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
            ) : orders.length === 0 ? (
                <p className="report-state" role="status">
                    Todavía no hay pedidos entregados. Los gráficos aparecen con la primera entrega.
                </p>
            ) : (
                <>
                    <div className="report-main-grid">
                        <Chart
                            title="Pedidos entregados"
                            note="Entregas por mes"
                            total={`${numberFormat.format(orders.length)} en total`}
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
                            subtitle={`Top ${TOP_LIMIT} del historial`}
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

                    <DeliveriesList rows={report.deliveries} />
                </>
            )}
        </section>
    );
}

export default ReportsSection;
