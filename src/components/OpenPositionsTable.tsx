import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  Edit2,
  Layers,
} from 'lucide-react';

interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  strategyId?: string;
  strategyName?: string;
  leverage: number;
  isolatedMargin: number;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unRealizedProfit: number;
  roePercent: number;
  takeProfit?: number;
  stopLoss?: number;
}

interface OpenPositionsTableProps {
  positions: Position[];
  onClosePosition?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  onEditPosition?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  mode?: 'live' | 'simulation';
}

export const OpenPositionsTable: React.FC<OpenPositionsTableProps> = ({
  positions,
  onClosePosition,
  onEditPosition,
  mode = 'live',
}) => {
  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-neutral-900/40">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/60">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers size={16} className="text-amber-500" />
            Posiciones Abiertas
          </h3>
          <span className="text-[10px] font-mono text-neutral-500">
            {mode === 'simulation' ? 'SIMULACIÓ¡N' : 'BINANCE FUTURES'}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700">
              <Shield size={24} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-300">## Sin posiciones activas en Binance Futures</p>
              <p className="text-xs text-neutral-500 mt-1">Tus órdenes de futuros se ejecutan con margen estrictamente ISOLATED 1x-5x</p>
              {mode === 'simulation' && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle size={12} className="text-amber-400" />
                  <span className="text-[10px] font-mono text-amber-300">MODO SIMULACIÓ¡N ACTIVO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/60">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers size={16} className="text-amber-500" />
          Posiciones Abiertas
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
          <span>{positions.length} {positions.length === 1 ? 'POSICIÓ¡N' : 'POSICIONES'}</span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">ISOLATED 1x-5x</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900 border-b border-neutral-800">
            <tr>
              <th className="text-left px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Par</th>
              <th className="text-left px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Estrategia</th>
              <th className="text-center px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Leverage</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Margen</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Tamañ¡±¢o</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Entrada</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Marcado</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Liq.</th>
              <th className="text-right px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">PnL</th>
              <th className="text-center px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">TP / SL</th>
              <th className="text-center px-3 py-2 font-bold text-neutral-400 uppercase text-[10px]">Acció¡±¢n</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {positions.map((pos, idx) => {
              const isLong = pos.side === 'LONG';
              const isProfit = pos.unRealizedProfit >= 0;
              const safeLeverage = Math.min(5, Math.max(1, pos.leverage));
              const baseAsset = pos.symbol.replace('USDT', '');
              return (
                <tr key={`${pos.symbol}-${pos.side}-${idx}`} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-white">{pos.symbol}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {pos.strategyId ? (
                      <div className="flex items-center gap-1.5">
                        <Target size={12} className="text-amber-500" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-amber-300">{pos.strategyId}</span>
                          {pos.strategyName && <span className="text-[9px] text-neutral-400">{pos.strategyName}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-500 italic">Sin estrategia</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] font-mono font-bold">{safeLeverage}x</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-mono text-neutral-300">${(pos.isolatedMargin || 0).toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-500 ml-1">USDT</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-mono font-bold text-white">{Math.abs(pos.positionAmt || 0).toFixed(3)}</span>
                    <span className="text-[9px] text-neutral-500 ml-1">{baseAsset}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-mono text-neutral-300">${(pos.entryPrice || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-mono text-white">${(pos.markPrice || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-mono text-amber-400">${(pos.liquidationPrice || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-xs font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${(pos.unRealizedProfit || 0).toFixed(2)}
                      </span>
                      <span className={`text-[9px] font-mono ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                        {isProfit ? '+' : ''}{(pos.roePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {pos.takeProfit ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                          <Target size={10} className="text-emerald-400" />
                          <span className="text-[9px] font-mono text-emerald-300">${pos.takeProfit}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-neutral-600">TP: -</span>
                      )}
                      {pos.stopLoss ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                          <Shield size={10} className="text-rose-400" />
                          <span className="text-[9px] font-mono text-rose-300">${pos.stopLoss}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-neutral-600">SL: -</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onEditPosition && (
                        <button onClick={(e) => { e.stopPropagation(); onEditPosition(pos.symbol, pos.side); }} className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors" title="Editar">
                          <Edit2 size={12} />
                        </button>
                      )}
                      {onClosePosition && (
                        <button onClick={(e) => { e.stopPropagation(); onClosePosition(pos.symbol, pos.side); }} className="p-1.5 rounded hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors" title="Cerrar">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          <Shield size={12} className="text-amber-500" />
          <span>Margen ISOLATED 1x-5x estricto</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
          <span>Total PnL:</span>
          <span className={`font-bold ${positions.reduce((sum, p) => sum + p.unRealizedProfit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${positions.reduce((sum, p) => sum + p.unRealizedProfit, 0).toFixed(2)} USDT
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpenPositionsTable;
