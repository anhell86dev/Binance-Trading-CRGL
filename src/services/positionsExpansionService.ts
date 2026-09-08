/**
 * Positions Expansion Service
 * State-managed expansion controller for active positions in Trade Management.
 * Synchronizes 'Expand All' / 'Collapse All' state across Trade Management view,
 * positions table, and tactical monitoring drawers.
 */

import { binanceWs } from './binanceWs';

class PositionsExpansionService {
  private expandedSymbols: Set<string> = new Set<string>();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Automatically prune symbols for positions that have closed
    binanceWs.subscribe(() => {
      const activePositions = binanceWs.getPositions();
      const activeSymbols = new Set(activePositions.map((p) => p.symbol));

      let hasChanged = false;
      this.expandedSymbols.forEach((sym) => {
        if (!activeSymbols.has(sym)) {
          this.expandedSymbols.delete(sym);
          hasChanged = true;
        }
      });

      if (hasChanged) {
        this.notify();
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in PositionsExpansionService listener:', err);
      }
    });
  }

  /**
   * Get all active symbols from binanceWs if not supplied
   */
  public getActiveSymbols(): string[] {
    return binanceWs.getPositions().map((p) => p.symbol);
  }

  /**
   * Return a copy of the current set of expanded symbols
   */
  public getExpandedSymbols(): Set<string> {
    return new Set(this.expandedSymbols);
  }

  /**
   * Check if a specific symbol is expanded
   */
  public isExpanded(symbol: string): boolean {
    return this.expandedSymbols.has(symbol);
  }

  /**
   * Toggle a specific symbol
   */
  public toggle(symbol: string): void {
    if (this.expandedSymbols.has(symbol)) {
      this.expandedSymbols.delete(symbol);
    } else {
      this.expandedSymbols.add(symbol);
    }
    this.notify();
  }

  /**
   * Set explicit expansion state for a symbol
   */
  public setExpanded(symbol: string, expanded: boolean): void {
    if (expanded) {
      this.expandedSymbols.add(symbol);
    } else {
      this.expandedSymbols.delete(symbol);
    }
    this.notify();
  }

  /**
   * Expand all active positions simultaneously
   */
  public expandAll(targetSymbols?: string[]): void {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    symbols.forEach((sym) => this.expandedSymbols.add(sym));
    this.notify();
  }

  /**
   * Collapse all active positions simultaneously
   */
  public collapseAll(): void {
    this.expandedSymbols.clear();
    this.notify();
  }

  /**
   * Toggle all: If all are expanded, collapses all; otherwise expands all.
   */
  public toggleAll(targetSymbols?: string[]): boolean {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    if (this.areAllExpanded(symbols)) {
      this.collapseAll();
      return false; // now collapsed
    } else {
      this.expandAll(symbols);
      return true; // now expanded
    }
  }

  /**
   * Check if all active positions are currently expanded
   */
  public areAllExpanded(targetSymbols?: string[]): boolean {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    if (symbols.length === 0) return false;
    return symbols.every((sym) => this.expandedSymbols.has(sym));
  }

  /**
   * Check if all active positions are collapsed
   */
  public areAllCollapsed(targetSymbols?: string[]): boolean {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    if (symbols.length === 0) return true;
    return symbols.every((sym) => !this.expandedSymbols.has(sym));
  }

  /**
   * Check if some (but not all) positions are expanded
   */
  public isPartiallyExpanded(targetSymbols?: string[]): boolean {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    if (symbols.length === 0) return false;
    const count = this.getExpandedCount(symbols);
    return count > 0 && count < symbols.length;
  }

  /**
   * Get the number of expanded positions
   */
  public getExpandedCount(targetSymbols?: string[]): number {
    const symbols = targetSymbols && targetSymbols.length > 0
      ? targetSymbols
      : this.getActiveSymbols();

    return symbols.filter((sym) => this.expandedSymbols.has(sym)).length;
  }
}

export const positionsExpansionService = new PositionsExpansionService();
