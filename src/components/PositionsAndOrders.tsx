import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { OpenOrder, PositionRisk, TradeHistoryItem, VolatilityAlert } from '../types/binance';
import { alertsSheetService, OFFICIAL_ALERTS_SHEET_NAME, OFFICIAL_WORKBOOK_NAME } from '../services/alertsSheetService';
import { SheetAlertRow } from '../types/strategy';
import { StrategyCreator } from './StrategyCreator';
import { DiarioEstrategias } from './DiarioEstrategias';

export const PositionsAndOrders: React.FC = () => {
  const [tab, setTab] = useState<'positions' | 'orders' | 'history' | 'alerts' | 'strategy_journal'>('positions');
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
  const [orders, setOrders] = useState<OpenOrder[]>(binanceWs.getOpenOrders());
  const [history, setHistory] = useState<TradeHistoryItem[]>(binanceWs.getTradeHistory());
  const [alerts, setAlerts] = useState<VolatilityAlert[]>(binanceWs.getAlerts());
  const [sheetAlerts, setSheetAlerts] = useState<SheetAlertRow[]>(() => alertsSheetService.getAlerts());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [isSyncing, setIsSyncing] = useState<boolean>(binanceWs.getIsSyncingData());
  const [lastSyncTime, setLastSyncTime] = useState<number>(binanceWs.getLastDataSyncTime());
  const [lastSyncError, setLastSyncError] = useState<string | null>(binanceWs.getLastDataSyncError());
  const mode = binanceWs.getMode();

  // Modal for editing TP/SL on active position
  const [editingPos, setEditingPos] = useState<PositionRisk | null>(null);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');

  // Form for new Volatility Alert
  const [newAlertSymbol, setNewAlertSymbol] = useState<string>(() => binanceWs.getTicker().symbol || 'ZECUSDT');
  const [newAlertSwing, setNewAlertSwing] = useState<number>(1.0);
  const [newAlertPrice, setNewAlertPrice] = useState<string>('');
  const [newAlertCond, setNewAlertCond] = useState<'SWING' | 'ABOVE' | 'BELOW'>('SWING');

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setPositions(binanceWs.getPositions());
      setOrders(binanceWs.getOpenOrders());
      setHistory(binanceWs.getTradeHistory());
      setAlerts(binanceWs.getAlerts());
      setTicker(binanceWs.getTicker());
      setIsSyncing(binanceWs.getIsSyncingData());
      setLastSyncTime(binanceWs.getLastDataSyncTime());
      setLastSyncError(binanceWs.getLastDataSyncError());
    });

    const unsubAlertsSheet = alertsSheetService.subscribe(() => {
      setSheetAlerts([...alertsSheetService.getAlerts()]);
    });

    return () => {
      unsub();
      unsubAlertsSheet();
    };
  }, []);

  const handleManualSync = async () => {
    await binanceWs.syncAllAccountData();
  };

  const openEditModal = (pos: PositionRisk) => {
    setEditingPos(pos);
    setEditTp(pos.takeProfit ? pos.takeProfit.toString() : '');
    setEditSl(pos.stopLoss ? pos.stopLoss.toString() : '');
  };

  const handleSaveTPSL = () => {
    if (!editingPos) return;
    const tp = editTp ? parseFloat(editTp) : undefined;
    const sl = editSl ? parseFloat(editSl) : undefined;
    binanceWs.updatePositionTPSL(editingPos.symbol, tp, sl);
    setEditingPos(null);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    binanceWs.addVolatilityAlert({
      symbol: newAlertSymbol,
      condition: newAlertCond,
      changePercentThreshold: newAlertSwing,
      targetPrice: newAlertPrice ? parseFloat(newAlertPrice) : undefined,
    });
    setNewAlertPrice('');
  };

  const handleDownloadAlertsCsv = () => {
    const csv = alertsSheetService.exportAlertsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `libro_hoja_alertas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl overflow-hidden flex flex-col">
      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/60 px-3 pt-2">
        <div className="flex items-center gap-1">
          <button
            id="tab-positions-btn"
            onClick={() => setTab('positions')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'positions'
                ? 'border-amber-400 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Posiciones Activas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
              {positions.length}
            </span>
          </button>

          <button
            id="tab-orders-btn"
            onClick={() => setTab('orders')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'orders'
                ? 'border-amber-400 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Órdenes Abiertas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
              {orders.length}
            </span>
          </button>

          <button
            id="tab-history-btn"
            onClick={() => setTab('history')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'history'
                ? 'border-amber-400 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Historial Trades</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
              {history.length}
            </span>
          </button>

          <button
            id="tab-alerts-btn"
            onClick={() => setTab('alerts')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'alerts'
                ? 'border-amber-400 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Alertas Volatilidad</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
              {alerts.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          {tab === 'orders' && orders.length > 0 && (
            <button
              onClick={() => binanceWs.cancelAllOrders()}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/40 border border-rose-900 flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar Todas
            </button>
          )}

          <button
            id="sync-account-data-btn"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="text-[11px] font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title={lastSyncTime > 0 ? `Última sincronización: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sincronizar cuenta Binance'}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            {lastSyncTime > 0 && (
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sync Warning Banner if error */}
      {lastSyncError && (
        <div className="bg-rose-950/30 border-b border-rose-900/60 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Aviso de sincronización Binance: {lastSyncError}</span>
          </div>
          <button
            onClick={handleManualSync}
            className="text-[11px] text-rose-300 hover:underline font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tab 1: Posiciones Activas */}
      {tab === 'positions' && (
        <div className="overflow-x-auto min-h-[220px]">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-neutral-400 text-xs">
              <Shield className="w-10 h-10 text-neutral-600 mb-3" />
              <p className="font-semibold text-neutral-200 text-sm">No tienes posiciones activas en Binance</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-md">
                Las posiciones se muestran en tiempo real al ejecutarse órdenes. Margen estrictamente ISOLATED y apalancamiento seguro 1-5x.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar con Binance
                </button>
                <button
                  onClick={() => setTab('strategy_creator')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Abrir Creador de Estrategia
                </button>
                {mode === 'simulation' && (
                  <button
                    onClick={() => binanceWs.loadSimulationDemoData()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    Cargar Posición Demo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Símbolo / Límite</th>
                  <th className="py-2.5 px-3">Tamaño</th>
                  <th className="py-2.5 px-3">Precio Entrada</th>
                  <th className="py-2.5 px-3">Precio Marca</th>
                  <th className="py-2.5 px-3">Precio Liq.</th>
                  <th className="py-2.5 px-3">Margen Isolated</th>
                  <th className="py-2.5 px-3">PnL (ROE %)</th>
                  <th className="py-2.5 px-3">TP / SL</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {positions.map(pos => {
                  const isLong = pos.positionAmt > 0;
                  const isProfit = pos.unRealizedProfit >= 0;
                  return (
                    <tr key={pos.symbol} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{pos.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isLong ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
                          </span>
                          <span className="text-[10px] text-blue-400 bg-blue-950/50 px-1 rounded border border-blue-900">
                            ISOLATED
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-200">
                        {Math.abs(pos.positionAmt).toFixed(3)} {pos.symbol.replace('USDT', '')}
                      </td>
                      <td className="py-3 px-3 text-neutral-300">${pos.entryPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-amber-400">${pos.markPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-rose-400 font-bold">${pos.liquidationPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-neutral-300">${pos.isolatedMargin.toFixed(2)} USDT</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-bold">
                          <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                            {isProfit ? '+' : ''}${pos.unRealizedProfit.toFixed(2)}
                          </span>
                          <span className={`text-[11px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({isProfit ? '+' : ''}{pos.roePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-400">
                            TP: {pos.takeProfit ? `$${pos.takeProfit}` : '-'} | SL:{' '}
                            {pos.stopLoss ? `$${pos.stopLoss}` : '-'}
                          </span>
                          <button
                            onClick={() => openEditModal(pos)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                            title="Editar TP/SL"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => binanceWs.closePosition(pos.symbol)}
                          className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition-colors"
                        >
                          Cerrar Mercado
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Órdenes Abiertas */}
      {tab === 'orders' && (
        <div className="overflow-x-auto min-h-[220px]">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-neutral-400 text-xs">
              <Layers className="w-10 h-10 text-neutral-600 mb-3" />
              <p className="font-semibold text-neutral-200 text-sm">No hay órdenes abiertas en Binance</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-md">
                Crea órdenes Límite, Escalonadas o autoriza una estrategia desde el Creador de Google Sheets para despacharlas a Binance.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar Órdenes
                </button>
                <button
                  onClick={() => setTab('strategy_creator')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Crear Estrategia
                </button>
                {mode === 'simulation' && (
                  <button
                    onClick={() => binanceWs.loadSimulationDemoData()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    Cargar Órdenes Demo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">ID / Fecha</th>
                  <th className="py-2.5 px-3">Símbolo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Lado</th>
                  <th className="py-2.5 px-3">Precio</th>
                  <th className="py-2.5 px-3">Cantidad</th>
                  <th className="py-2.5 px-3">Apalancamiento / Margen</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {orders.map(ord => (
                  <tr key={ord.orderId} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 px-3 text-neutral-400">
                      <div>{ord.orderId.substring(0, 14)}...</div>
                      <div className="text-[10px] text-neutral-500">
                        {new Date(ord.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{ord.symbol}</td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300 font-semibold text-[10px]">
                        {ord.type === 'TRAILING_STOP_MARKET'
                          ? `TRAILING (${ord.callbackRate}%)`
                          : ord.parentScaledId
                          ? 'ESCALONADA'
                          : ord.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {ord.side === 'BUY' ? 'COMPRA' : 'VENTA'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-200">
                      {ord.price > 0 ? `$${ord.price.toFixed(2)}` : 'Mercado / Trigger'}
                    </td>
                    <td className="py-3 px-3 text-neutral-300">{ord.origQty}</td>
                    <td className="py-3 px-3">
                      <span className="text-amber-400 font-bold">{ord.leverage}x</span>
                      <span className="text-[10px] text-blue-400 ml-1">ISOLATED</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => binanceWs.cancelOrder(ord.orderId)}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-rose-950 hover:text-rose-300 text-neutral-400 text-xs transition-colors"
                        title="Cancelar Orden"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Diario de Estrategias */}
      {tab === 'strategy_journal' && (
        <div className="p-3">
          <DiarioEstrategias />
        </div>
      )}

      {/* Tab 3: Historial de Trades */}
      {tab === 'history' && (
        <div className="overflow-x-auto min-h-[220px]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-neutral-400 text-xs">
              <Clock className="w-10 h-10 text-neutral-600 mb-3" />
              <p className="font-semibold text-neutral-200 text-sm">Aún no hay ejecuciones registradas</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-md">
                Consulta los trades y ejecuciones recientes de tu cuenta de Binance haciendo clic en Sincronizar Historial.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar Historial con Binance
                </button>
                {mode === 'simulation' && (
                  <button
                    onClick={() => binanceWs.loadSimulationDemoData()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    Cargar Trades Demo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Símbolo</th>
                  <th className="py-2.5 px-3">Lado</th>
                  <th className="py-2.5 px-3">Precio Ejecución</th>
                  <th className="py-2.5 px-3">Cantidad</th>
                  <th className="py-2.5 px-3">Nocional</th>
                  <th className="py-2.5 px-3">PnL Realizado</th>
                  <th className="py-2.5 px-3">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {history.map(item => {
                  const isProfit = item.realizedPnl > 0;
                  return (
                    <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-400">
                        {new Date(item.time).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{item.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span className={item.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {item.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-200">${item.price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-neutral-400">${item.notional.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold">
                        {item.realizedPnl !== 0 ? (
                          <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                            {isProfit ? '+' : ''}${item.realizedPnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">${item.commission.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Alertas de Volatilidad Guardadas en Hoja de Sheets */}
      {tab === 'alerts' && (
        <div className="p-4 flex flex-col gap-4">
          {/* Official Google Sheet Connection Banner */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    Libro de Sheets: Diario de Estrategias Cripto
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Hoja: &ldquo;{OFFICIAL_ALERTS_SHEET_NAME}&rdquo; Activa
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Las alertas se guardan automáticamente en la hoja <strong>alertas</strong> del libro con cálculo en vivo de <strong>% Distancia vs Entrada 1 y Entrada 2</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="download-alerts-csv-btn"
                onClick={handleDownloadAlertsCsv}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Descargar la hoja de alertas como CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar CSV (alertas)</span>
              </button>

              <button
                onClick={() => setTab('strategy_creator')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                title="Ver hoja completa de alertas en el Creador de Estrategias"
              >
                <span>Ver Hoja en Libro</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Formulario de Creación de Alerta para la Hoja */}
          <form
            onSubmit={handleCreateAlert}
            className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Par Cripto</label>
              <select
                value={newAlertSymbol}
                onChange={e => setNewAlertSymbol(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white"
              >
                <option value="ZECUSDT">ZECUSDT (STRAT-ZEC-001)</option>
                <option value="TAOUSDT">TAOUSDT (STRAT-TAO-001)</option>
                <option value="AAVEUSDT">AAVEUSDT (STRAT-AAVE-001)</option>
                <option value="SOLUSDT">SOLUSDT (STRAT-SOL-001)</option>
                <option value="XRPUSDT">XRPUSDT (STRAT-XRP-001)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Condición</label>
              <select
                value={newAlertCond}
                onChange={e => setNewAlertCond(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="SWING">Oscilación de Volatilidad (% Rápida)</option>
                <option value="ABOVE">Precio Supera Objetivo</option>
                <option value="BELOW">Precio Cae Bajo Objetivo</option>
              </select>
            </div>

            {newAlertCond === 'SWING' ? (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  Umbral de Movimiento (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  value={newAlertSwing}
                  onChange={e => setNewAlertSwing(parseFloat(e.target.value))}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white w-32"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">Precio Objetivo (USDT)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newAlertPrice}
                  onChange={e => setNewAlertPrice(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white w-36"
                  placeholder={ticker.lastPrice.toFixed(2)}
                />
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar en Hoja alertas</span>
            </button>
          </form>

          {/* Lista de Alertas de la Hoja con Distancias en Vivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sheetAlerts.length === 0 ? (
              <p className="text-xs text-neutral-500 col-span-2 py-6 text-center">
                No hay alertas configuradas en la hoja &ldquo;alertas&rdquo;.
              </p>
            ) : (
              sheetAlerts.map(alt => (
                <div
                  key={alt.id}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                    alt.status === 'DISPARADA'
                      ? 'bg-rose-950/20 border-rose-800/60'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-md ${
                          alt.status === 'DISPARADA'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-white text-xs">{alt.symbol}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                            {alt.noEstrategia}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              alt.status === 'DISPARADA'
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                            }`}
                          >
                            {alt.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                          ID: <span className="text-neutral-300 font-bold">{alt.id}</span> • Registrada: {alt.timestamp}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => alertsSheetService.removeAlert(alt.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                      title="Eliminar de la hoja alertas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Precios y % Distancia en Vivo vs Entradas */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 font-mono text-xs">
                    {/* Precio en Vivo */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400">Precio en Vivo</span>
                      <span className="font-extrabold text-amber-300">
                        ${alt.livePrice.toFixed(alt.livePrice >= 10 ? 2 : 4)}
                      </span>
                    </div>

                    {/* Entrada 1 y % Distancia */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400 truncate">
                        E1: ${alt.entry1Price > 0 ? alt.entry1Price.toFixed(2) : '-'}
                      </span>
                      <span
                        className={`font-bold text-[11px] flex items-center gap-0.5 ${
                          Math.abs(alt.distPctEntry1) <= 0.5
                            ? 'text-emerald-400'
                            : alt.distPctEntry1 > 0
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                        }`}
                        title="% Distancia entre el precio en vivo vs Entrada 1"
                      >
                        {alt.distPctEntry1 > 0 ? '+' : ''}
                        {alt.distPctEntry1.toFixed(2)}%
                        {Math.abs(alt.distPctEntry1) <= 0.5 && ' 🎯'}
                      </span>
                    </div>

                    {/* Entrada 2 y % Distancia */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400 truncate">
                        E2: ${alt.entry2Price > 0 ? alt.entry2Price.toFixed(2) : '-'}
                      </span>
                      <span
                        className={`font-bold text-[11px] flex items-center gap-0.5 ${
                          Math.abs(alt.distPctEntry2) <= 0.5
                            ? 'text-emerald-400'
                            : alt.distPctEntry2 > 0
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                        }`}
                        title="% Distancia entre el precio en vivo vs Entrada 2"
                      >
                        {alt.distPctEntry2 > 0 ? '+' : ''}
                        {alt.distPctEntry2.toFixed(2)}%
                        {Math.abs(alt.distPctEntry2) <= 0.5 && ' 🎯'}
                      </span>
                    </div>
                  </div>

                  {/* Condición y Mensaje */}
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="text-neutral-300 flex items-center gap-1.5">
                      <span className="text-neutral-500 text-[11px]">Condición:</span>
                      <span className="font-semibold text-white">{alt.thresholdOrTarget}</span>
                    </div>
                    {alt.message && (
                      <p className={`text-[11px] font-mono ${alt.status === 'DISPARADA' ? 'text-rose-400' : 'text-neutral-400'}`}>
                        {alt.message}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit TP/SL Modal */}
      {editingPos && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Editar TP / SL Dinámicos</h3>
              <button
                onClick={() => setEditingPos(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-400">
              Posición: <strong className="text-white">{editingPos.symbol}</strong> Entrada: $
              {editingPos.entryPrice.toFixed(2)} | Marca: ${editingPos.markPrice.toFixed(2)}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-emerald-400 block mb-1 font-semibold">
                  Take Profit (USDT)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editTp}
                  onChange={e => setEditTp(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-emerald-300"
                  placeholder="Ej: 92000"
                />
              </div>

              <div>
                <label className="text-xs text-rose-400 block mb-1 font-semibold">
                  Stop Loss (USDT)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editSl}
                  onChange={e => setEditSl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-rose-300"
                  placeholder="Ej: 85000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPos(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTPSL}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
