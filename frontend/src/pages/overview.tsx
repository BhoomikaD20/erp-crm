import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  customerType: string;
  status: string;
  followUpDate?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string;
  currentStock: number;
  minStockAlertQty: number;
  location?: string;
}

interface ChallanCustomer {
  id: string;
  name: string;
}

interface ChallanItem {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  customer: ChallanCustomer;
  items: ChallanItem[];
}

export default function Overview() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const [
        customerRes,
        productRes,
        challanRes,
      ] = await Promise.all([
        api.get<{ data: Customer[] }>(
          '/customers?limit=1000'
        ),
        api.get<{ data: Product[] }>(
          '/products?limit=1000'
        ),
        api.get<{ data: Challan[] }>(
          '/challans'
        ),
      ]);

      setCustomers(customerRes.data || []);
      setProducts(productRes.data || []);
      setChallans(challanRes.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const customerStats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter(
        (c) =>
          c.status.toUpperCase() === 'ACTIVE'
      ).length,
      leads: customers.filter(
        (c) =>
          c.status.toUpperCase() === 'LEAD'
      ).length,
      inactive: customers.filter(
        (c) =>
          c.status.toUpperCase() === 'INACTIVE'
      ).length,
    };
  }, [customers]);

  const productStats = useMemo(() => {
    const totalStock = products.reduce(
      (sum, product) =>
        sum + Number(product.currentStock || 0),
      0
    );

    const lowStockProducts =
      products.filter(
        (product) =>
          Number(product.currentStock || 0) <=
          Number(product.minStockAlertQty || 0)
      );

    return {
      total: products.length,
      totalStock,
      lowStock: lowStockProducts.length,
      lowStockProducts,
    };
  }, [products]);

  const challanStats = useMemo(() => {
    return {
      total: challans.length,

      draft: challans.filter(
        (c) =>
          c.status.toUpperCase() === 'DRAFT'
      ).length,

      confirmed: challans.filter(
        (c) =>
          c.status.toUpperCase() === 'CONFIRMED'
      ).length,

      cancelled: challans.filter(
        (c) =>
          c.status.toUpperCase() === 'CANCELLED'
      ).length,
    };
  }, [challans]);

  const recentCustomers =
    [...customers].reverse().slice(0, 5);

  const recentProducts =
    [...products].reverse().slice(0, 5);

  const recentChallans =
    [...challans].reverse().slice(0, 5);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <h2>Loading dashboard...</h2>

          <p>
            Fetching customers, products and
            sales information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <header className="dashboard-header">

        <div>
          <span className="dashboard-eyebrow">
            BUSINESS OVERVIEW
          </span>

          <h1>Dashboard</h1>

          <p>
            A clear overview of your customers,
            inventory and sales activity.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadDashboard}
        >
          ↻ Refresh
        </button>

      </header>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* QUICK OVERVIEW */}
      <section className="dashboard-section">

        <div className="dashboard-section-header">
          <div>
            <span className="dashboard-section-label">
              QUICK OVERVIEW
            </span>

            <h2>Business at a glance</h2>

            <p>
              Important numbers from your ERP / CRM.
            </p>
          </div>
        </div>

        <div className="dashboard-stats-grid four">

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">
              👥
            </div>

            <div className="dashboard-stat-content">
              <span>Total Customers</span>
              <strong>{customerStats.total}</strong>
              <small>
                All customer records
              </small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">
              ✓
            </div>

            <div className="dashboard-stat-content">
              <span>Active Customers</span>
              <strong>{customerStats.active}</strong>
              <small>
                Currently active
              </small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon yellow">
              ★
            </div>

            <div className="dashboard-stat-content">
              <span>Customer Leads</span>
              <strong>{customerStats.leads}</strong>
              <small>
                Potential customers
              </small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon red">
              !
            </div>

            <div className="dashboard-stat-content">
              <span>Low Stock Items</span>
              <strong>{productStats.lowStock}</strong>
              <small>
                Need attention
              </small>
            </div>
          </div>

        </div>

      </section>

      {/* CUSTOMERS */}
      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <span className="dashboard-section-label">
              CUSTOMERS
            </span>

            <h2>Customer Overview</h2>

            <p>
              Monitor your customer base,
              active accounts and leads.
            </p>
          </div>

          <Link
            to="/customers"
            className="dashboard-section-link"
          >
            View Customers →
          </Link>

        </div>

        <div className="dashboard-stats-grid four">

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">
              👥
            </div>

            <div className="dashboard-stat-content">
              <span>Total Customers</span>
              <strong>{customerStats.total}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">
              ✓
            </div>

            <div className="dashboard-stat-content">
              <span>Active</span>
              <strong>{customerStats.active}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon yellow">
              ★
            </div>

            <div className="dashboard-stat-content">
              <span>Leads</span>
              <strong>{customerStats.leads}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon red">
              ×
            </div>

            <div className="dashboard-stat-content">
              <span>Inactive</span>
              <strong>{customerStats.inactive}</strong>
            </div>
          </div>

        </div>

      </section>

      {/* INVENTORY */}
      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <span className="dashboard-section-label">
              INVENTORY
            </span>

            <h2>Products & Stock</h2>

            <p>
              Keep track of products, available
              stock and low-stock items.
            </p>
          </div>

          <Link
            to="/products"
            className="dashboard-section-link"
          >
            Manage Products →
          </Link>

        </div>

        <div className="dashboard-stats-grid three">

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">
              ◆
            </div>

            <div className="dashboard-stat-content">
              <span>Total Products</span>
              <strong>{productStats.total}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">
              ▣
            </div>

            <div className="dashboard-stat-content">
              <span>Total Stock Units</span>
              <strong>{productStats.totalStock}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card warning">
            <div className="dashboard-stat-icon red">
              !
            </div>

            <div className="dashboard-stat-content">
              <span>Low Stock Items</span>
              <strong>{productStats.lowStock}</strong>
            </div>
          </div>

        </div>

        {productStats.lowStockProducts.length >
          0 && (
          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>
                <h3>Low Stock Alert</h3>

                <p>
                  Products that need attention
                </p>
              </div>

              <Link to="/products">
                View Inventory →
              </Link>

            </div>

            <div className="dashboard-list">

              {productStats.lowStockProducts
                .slice(0, 5)
                .map((product) => (
                  <div
                    className="dashboard-list-row"
                    key={product.id}
                  >

                    <div className="dashboard-record-icon product">
                      ◆
                    </div>

                    <div className="dashboard-record-main">
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        {product.sku}
                      </span>
                    </div>

                    <div className="dashboard-stock-warning">
                      {product.currentStock} left
                    </div>

                  </div>
                ))}

            </div>

          </div>
        )}

      </section>

      {/* SALES */}
      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <span className="dashboard-section-label">
              SALES
            </span>

            <h2>Sales Challans</h2>

            <p>
              Track draft, confirmed and
              cancelled sales challans.
            </p>
          </div>

          <Link
            to="/challans"
            className="dashboard-section-link"
          >
            View Challans →
          </Link>

        </div>

        <div className="dashboard-stats-grid four">

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">
              ▤
            </div>

            <div className="dashboard-stat-content">
              <span>Total Challans</span>
              <strong>{challanStats.total}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon yellow">
              ◷
            </div>

            <div className="dashboard-stat-content">
              <span>Draft</span>
              <strong>{challanStats.draft}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">
              ✓
            </div>

            <div className="dashboard-stat-content">
              <span>Confirmed</span>
              <strong>{challanStats.confirmed}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon red">
              ×
            </div>

            <div className="dashboard-stat-content">
              <span>Cancelled</span>
              <strong>{challanStats.cancelled}</strong>
            </div>
          </div>

        </div>

      </section>

      {/* RECENT ACTIVITY */}
      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <span className="dashboard-section-label">
              RECENT ACTIVITY
            </span>

            <h2>Latest Records</h2>

            <p>
              A quick look at your most recent
              business activity.
            </p>
          </div>

        </div>

        <div className="dashboard-recent-grid">

          {/* CUSTOMERS */}
          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>
                <h3>Recent Customers</h3>
                <p>Latest customer records</p>
              </div>

              <Link to="/customers">
                View all
              </Link>

            </div>

            {recentCustomers.length === 0 ? (
              <div className="dashboard-empty">
                No customers yet.
              </div>
            ) : (
              <div className="dashboard-list">

                {recentCustomers.map(
                  (customer) => (
                    <Link
                      to={`/customers/${customer.id}`}
                      className="dashboard-list-row clickable"
                      key={customer.id}
                    >

                      <div className="dashboard-record-avatar">
                        {customer.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="dashboard-record-main">

                        <strong>
                          {customer.name}
                        </strong>

                        <span>
                          {customer.businessName ||
                            customer.mobile ||
                            'Customer'}
                        </span>

                      </div>

                      <span
                        className={`dashboard-badge ${customer.status.toLowerCase()}`}
                      >
                        {customer.status}
                      </span>

                    </Link>
                  )
                )}

              </div>
            )}

          </div>

          {/* PRODUCTS */}
          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>
                <h3>Recent Products</h3>
                <p>Latest inventory records</p>
              </div>

              <Link to="/products">
                View all
              </Link>

            </div>

            {recentProducts.length === 0 ? (
              <div className="dashboard-empty">
                No products yet.
              </div>
            ) : (
              <div className="dashboard-list">

                {recentProducts.map(
                  (product) => (
                    <div
                      className="dashboard-list-row"
                      key={product.id}
                    >

                      <div className="dashboard-record-icon product">
                        ◆
                      </div>

                      <div className="dashboard-record-main">

                        <strong>
                          {product.name}
                        </strong>

                        <span>
                          {product.sku}

                          {product.category
                            ? ` • ${product.category}`
                            : ''}
                        </span>

                      </div>

                      <div className="dashboard-record-value">

                        {product.currentStock}

                        <small>
                          stock
                        </small>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </div>

        {/* CHALLANS */}
        <div className="dashboard-panel dashboard-challan-panel">

          <div className="dashboard-panel-header">

            <div>
              <h3>Recent Sales Challans</h3>
              <p>Latest sales activity</p>
            </div>

            <Link to="/challans">
              View all
            </Link>

          </div>

          {recentChallans.length === 0 ? (
            <div className="dashboard-empty">
              No sales challans yet.
            </div>
          ) : (
            <div className="dashboard-list">

              {recentChallans.map(
                (challan) => (
                  <div
                    className="dashboard-list-row"
                    key={challan.id}
                  >

                    <div className="dashboard-record-icon challan">
                      #
                    </div>

                    <div className="dashboard-record-main">

                      <strong>
                        {challan.challanNumber}
                      </strong>

                      <span>
                        {challan.customer?.name ||
                          'Unknown customer'}
                      </span>

                    </div>

                    <div className="dashboard-record-value">

                      {challan.totalQuantity}

                      <small>
                        items
                      </small>

                    </div>

                    <span
                      className={`dashboard-badge ${challan.status.toLowerCase()}`}
                    >
                      {challan.status}
                    </span>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </section>

    </div>
  );
}