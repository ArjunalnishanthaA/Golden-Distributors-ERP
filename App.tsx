import React, { useState } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  User, 
  Fuel, 
  Camera, 
  Smartphone, 
  BellRing, 
  Wallet, 
  CreditCard 
} from 'lucide-react';

interface WholesaleOrder {
  id: string;
  shopName: string;
  category: 'Supermarket' | 'Wholesale';
  totalAmount: number;
  discountPercentage: number;
  netAmount: number;
  date: string;
  status: 'Pending Approval' | 'Dispatched';
}

interface FuelLog {
  id: string;
  vehicleNo: string;
  date: string;
  odometer: number;
  liters: number;
  amount: number;
}

export default function App() {
  const [role, setRole] = useState<'owner' | 'sales' | 'inventory'>('owner');
  const [orders, setOrders] = useState<WholesaleOrder[]>([
    {
      id: 'ORD-001',
      shopName: 'Anuradhapura Super Stores',
      category: 'Supermarket',
      totalAmount: 150000,
      discountPercentage: 26,
      netAmount: 111000,
      date: '2026-03-30',
      status: 'Pending Approval'
    }
  ]);
  
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [newShop, setNewShop] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newDiscount, setNewDiscount] = useState('');

  // Handle Order Submission & SMS Trigger for >= 25% discount
  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop || !newTotal || !newDiscount) return;

    const total = parseFloat(newTotal);
    const disc = parseFloat(newDiscount);
    const net = total - (total * disc) / 100;

    const order: WholesaleOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      shopName: newShop,
      category: disc >= 25 ? 'Supermarket' : 'Wholesale',
      totalAmount: total,
      discountPercentage: disc,
      netAmount: net,
      date: new Date().toISOString().split('T')[0],
      status: disc >= 25 ? 'Pending Approval' : 'Dispatched'
    };

    setOrders([order, ...orders]);

    // Simulated SMS Alert to Owner (+94781980085) for high discounts
    if (disc >= 25) {
      alert(`🚨 SMS Alert sent to Owner (+94781980085): High Discount Alert! ${newShop} requested ${disc}% discount. Total Net: LKR ${net.toLocaleString()}`);
    }

    setNewShop('');
    setNewTotal('');
    setNewDiscount('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-4 md:p-6 mb-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-amber-400 tracking-wide flex items-center gap-2">
            🟡 GOLDEN DISTRIBUTORS ERP
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Anuradhapura & Mihintale 12-Route Distribution Management System
          </p>
        </div>
        
        {/* Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400 px-2 font-medium">Role:</span>
          {(['owner', 'sales', 'inventory'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                role === r 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quick Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-semibold">Active Routes</h3>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full font-bold">12 Routes</span>
          </div>
          <p className="text-2xl font-bold mt-2">Anuradhapura & Mihintale</p>
          <p className="text-xs text-slate-500 mt-1">Supplier: Freelan Enterprises</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-semibold">Owner SMS Alerts</h3>
            <BellRing className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xl font-bold mt-2">+94 78 198 0085</p>
          <p className="text-xs text-emerald-400 mt-1">● Active (Discounts ≥ 25%)</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-semibold">System Status</h3>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-400">Live on Vercel</p>
          <p className="text-xs text-slate-500 mt-1">Hobby Free Tier</p>
        </div>

        {/* Order Entry & Approval Section */}
        <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Wholesale Orders & Discount Approval
          </h2>

          <form onSubmit={handleAddOrder} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <input
              type="text"
              placeholder="Shop Name"
              value={newShop}
              onChange={(e) => setNewShop(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <input
              type="number"
              placeholder="Total Amount (LKR)"
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <input
              type="number"
              placeholder="Discount %"
              value={newDiscount}
              onChange={(e) => setNewDiscount(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="sm:col-span-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-all shadow-md"
            >
              Submit Order & Check SMS Trigger
            </button>
          </form>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-700">
                <tr>
                  <p className="p-3">Order ID</p>
                  <th className="p-3">Shop Name</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Net Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/30">
                    <td className="p-3 font-mono text-xs text-amber-400">{ord.id}</td>
                    <td className="p-3 font-medium">{ord.shopName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        ord.discountPercentage >= 25 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {ord.discountPercentage}%
                      </span>
                    </td>
                    <td className="p-3 font-semibold">LKR {ord.netAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        ord.status === 'Pending Approval' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Fuel className="w-5 h-5" /> Fleet & Operations
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Manage fuel logs for distribution routes, van C22 maintenance, and credit aging tracking.
            </p>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-4">
              <p className="text-xs text-slate-400">Business Owner</p>
              <p className="text-sm font-bold text-white mt-0.5">Egodagedara Arjunal Nishantha Kumara</p>
              <p className="text-xs text-amber-400 mt-2">Golden Distributors (Anuradhapura)</p>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-center">
            <p className="text-xs text-slate-400">Need to modify features?</p>
            <p className="text-xs text-amber-400 font-semibold mt-1">Ask me anytime to add new modules!</p>
          </div>
        </div>

      </main>
    </div>
  );
}
