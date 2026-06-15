import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Investment from "@/pages/Investment";
import Promotion from "@/pages/Promotion";
import Dashboard from "@/pages/Dashboard";
import CompetitionMap from "@/pages/CompetitionMap";
import SupplierBoard from "@/pages/SupplierBoard";

export default function App() {
  return (
    <Router basename="/my-store">
      <Layout>
        <Routes>
          <Route path="/" element={<Investment />} />
          <Route path="/promotion" element={<Promotion />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/competition" element={<CompetitionMap />} />
          <Route path="/supplier" element={<SupplierBoard />} />
        </Routes>
      </Layout>
    </Router>
  );
}
