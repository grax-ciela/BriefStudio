import { Routes, Route } from 'react-router-dom'
import BriefListPage from './pages/BriefListPage'
import BriefFormPage from './pages/BriefFormPage'
import BriefDetailPage from './pages/BriefDetailPage'
import BatchListPage from './pages/BatchListPage'
import BatchFormPage from './pages/BatchFormPage'
import ImportPage from './pages/ImportPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BriefListPage />} />
      <Route path="/briefs/new" element={<BriefFormPage />} />
      <Route path="/briefs/:id" element={<BriefDetailPage />} />
      <Route path="/briefs/:id/edit" element={<BriefFormPage />} />
      <Route path="/batches" element={<BatchListPage />} />
      <Route path="/batches/new" element={<BatchFormPage />} />
      <Route path="/batches/:id/edit" element={<BatchFormPage />} />
      <Route path="/import" element={<ImportPage />} />
    </Routes>
  )
}