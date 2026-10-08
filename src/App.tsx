import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Cities from './pages/Cities';
import CityView from './pages/CityView';
import EntryDetail from './pages/EntryDetail';
import EntryEdit from './pages/EntryEdit';
import MapPage from './pages/MapPage';
import NotFound from './pages/NotFound';
import QuickLog from './pages/QuickLog';
import Search from './pages/Search';
import Settings from './pages/Settings';
import SharedList from './pages/SharedList';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<QuickLog />} />
        <Route path="entry/:id" element={<EntryDetail />} />
        <Route path="entry/:id/edit" element={<EntryEdit />} />
        <Route path="map" element={<MapPage />} />
        <Route path="cities" element={<Cities />} />
        <Route path="cities/:cityId" element={<CityView />} />
        <Route path="search" element={<Search />} />
        <Route path="l/:listId" element={<SharedList />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
