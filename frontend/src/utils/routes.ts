import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { Dashboard } from '../components/Dashboard';
import { StockDetails } from '../components/StockDetails';
import { Settings } from '../components/Settings';
import { NotFound } from '../components/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'stock/:symbol', Component: StockDetails },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound },
    ],
  },
]);
