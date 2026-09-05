import { TerminalPage } from '../components/TerminalPage';
import { PairSidebar } from '../components/PairSidebar';
import { ChartSection } from '../components/ChartSection';
import { MarketView } from '../components/MarketView';
import { OrderForm } from '../components/OrderForm';
import { OpenPositionsTable } from '../components/OpenPositionsTable';

export function TerminalView() {
  return (
    <TerminalPage
      watchlist={<PairSidebar />}
      chart={<ChartSection />}
      marketInfo={<MarketView />}
      orderForm={<OrderForm />}
      positions={<OpenPositionsTable />}
    />
  );
}
