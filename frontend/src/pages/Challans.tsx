import { useEffect, useState, FormEvent } from 'react';
import { api } from '../api/client';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
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
  customer: Customer;
  items: ChallanItem[];
}

interface ChallanLine {
  productId: string;
  quantity: string;
}

export default function Challans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState('');

  const [lines, setLines] = useState<ChallanLine[]>([
    {
      productId: '',
      quantity: '1',
    },
  ]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    try {
      const [c, cu, p] = await Promise.all([
        api.get<{ data: Challan[] }>('/challans'),
        api.get<{ data: Customer[] }>('/customers?limit=100'),
        api.get<{ data: Product[] }>('/products?limit=100'),
      ]);

      setChallans(c.data);
      setCustomers(cu.data);
      setProducts(p.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load challan data'
      );
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function updateLine(
    index: number,
    field: 'productId' | 'quantity',
    value: string
  ) {
    setLines((previous) =>
      previous.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  }

  function addProductLine() {
    setLines((previous) => [
      ...previous,
      {
        productId: '',
        quantity: '1',
      },
    ]);
  }

  function removeProductLine(index: number) {
    setLines((previous) => {
      if (previous.length === 1) {
        return previous;
      }

      return previous.filter((_, i) => i !== index);
    });
  }

  function calculateTotalQuantity() {
    return lines.reduce((total, line) => {
      const quantity = parseInt(line.quantity, 10);

      return total + (Number.isNaN(quantity) ? 0 : quantity);
    }, 0);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    setError('');

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    const validLines = lines.filter(
      (line) => line.productId && parseInt(line.quantity, 10) > 0
    );

    if (validLines.length === 0) {
      setError('Please add at least one product.');
      return;
    }

    setSaving(true);

    try {
      await api.post('/challans', {
        customerId,
        items: validLines.map((line) => ({
          productId: line.productId,
          quantity: parseInt(line.quantity, 10),
        })),
      });

      setShowForm(false);
      setCustomerId('');

      setLines([
        {
          productId: '',
          quantity: '1',
        },
      ]);

      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create challan'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(id: string) {
    setError('');

    try {
      await api.post(`/challans/${id}/confirm`);
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to confirm challan'
      );
    }
  }

  async function handleCancel(id: string) {
    setError('');

    try {
      await api.post(`/challans/${id}/cancel`);
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to cancel challan'
      );
    }
  }

  async function handleDownloadInvoice(
    id: string,
    challanNumber: string
  ) {
    setError('');

    try {
      const token = localStorage.getItem('token');

      const base =
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:4000';

      const response = await fetch(
        `${base}/challans/${id}/invoice`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = `invoice-${challanNumber}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to download invoice'
      );
    }
  }

  return (
    <div className="challans-page">

      {/* PAGE HEADER */}
      <div className="page-header challan-page-header">

        <div>
          <div className="page-eyebrow">
            SALES MANAGEMENT
          </div>

          <h1>Sales Challans</h1>

          <p>
            Create, manage and confirm sales challans for your customers.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setShowForm((value) => !value);
            setError('');
          }}
        >
          {showForm ? '× Close' : '+ New Challan'}
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="error-banner challan-error">
          <strong>Something went wrong</strong>
          <span>{error}</span>
        </div>
      )}

      {/* CREATE CHALLAN */}
      {showForm && (
        <form
          className="challan-create-layout"
          onSubmit={handleCreate}
        >

          {/* LEFT SIDE */}
          <div className="challan-main-column">

            {/* CUSTOMER CARD */}
            <section className="challan-card">

              <div className="card-heading">

                <div className="step-number">
                  01
                </div>

                <div>
                  <h2>Customer Details</h2>

                  <p>
                    Select the customer for this sales challan.
                  </p>
                </div>

              </div>

              <div className="field-group">

                <label htmlFor="customer">
                  Customer
                </label>

                <select
                  id="customer"
                  className="large-select"
                  required
                  value={customerId}
                  onChange={(e) =>
                    setCustomerId(e.target.value)
                  }
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>

              </div>

            </section>

            {/* PRODUCTS CARD */}
            <section className="challan-card">

              <div className="card-heading product-heading">

                <div className="step-number">
                  02
                </div>

                <div>
                  <h2>Products</h2>

                  <p>
                    Add one or more products and specify quantities.
                  </p>
                </div>

              </div>

              <div className="products-list">

                {lines.map((line, index) => (
                  <div
                    className="challan-product-row"
                    key={index}
                  >

                    <div className="product-index">
                      {index + 1}
                    </div>

                    <div className="product-field">

                      <label>
                        Product
                      </label>

                      <select
                        required
                        value={line.productId}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'productId',
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Select product
                        </option>

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name} · {product.sku}
                          </option>
                        ))}
                      </select>

                    </div>

                    <div className="quantity-field">

                      <label>
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'quantity',
                            e.target.value
                          )
                        }
                      />

                    </div>

                    <button
                      type="button"
                      className="remove-product-btn"
                      onClick={() =>
                        removeProductLine(index)
                      }
                      disabled={lines.length === 1}
                      title="Remove product"
                    >
                      ×
                    </button>

                  </div>
                ))}

              </div>

              <div className="product-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={addProductLine}
                >
                  + Add another product
                </button>

                <span className="product-count">
                  {lines.length}{' '}
                  {lines.length === 1
                    ? 'product'
                    : 'products'}
                </span>

              </div>

            </section>

          </div>

          {/* RIGHT SIDE SUMMARY */}
          <aside className="challan-summary">

            <div className="summary-header">
              <span>CHALLAN SUMMARY</span>
            </div>

            <div className="summary-number">
              <span>Document</span>
              <strong>New Challan</strong>
            </div>

            <div className="summary-divider" />

            <div className="summary-row">

              <span>Customer</span>

              <strong>
                {customerId
                  ? customers.find(
                      (customer) =>
                        customer.id === customerId
                    )?.name || 'Selected'
                  : 'Not selected'}
              </strong>

            </div>

            <div className="summary-row">

              <span>Products</span>

              <strong>
                {lines.filter(
                  (line) => line.productId
                ).length}
              </strong>

            </div>

            <div className="summary-row">

              <span>Total quantity</span>

              <strong>
                {calculateTotalQuantity()}
              </strong>

            </div>

            <div className="summary-divider" />

            <div className="summary-status">

              <span>Status</span>

              <span className="status-pill draft">
                DRAFT
              </span>

            </div>

            <button
              type="submit"
              className="save-challan-btn"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save as Draft'}
            </button>

            <button
              type="button"
              className="cancel-challan-btn"
              onClick={() => {
                setShowForm(false);
                setError('');
              }}
            >
              Cancel
            </button>

          </aside>

        </form>
      )}

      {/* EXISTING CHALLANS */}
      <section className="challan-list-section">

        <div className="section-header">

          <div>
            <h2>Recent Challans</h2>

            <p>
              View and manage your sales challans.
            </p>
          </div>

          <span className="record-count">
            {challans.length} records
          </span>

        </div>

        {challans.length === 0 ? (
          <div className="empty-state challan-empty">

            <div className="empty-icon">
              ⟡
            </div>

            <h3>No challans yet</h3>

            <p>
              Create your first sales challan to get started.
            </p>

            <button
              className="primary-btn"
              onClick={() => setShowForm(true)}
            >
              + Create New Challan
            </button>

          </div>
        ) : (
          <div className="table-container">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Products</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th className="actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {challans.map((challan) => (
                  <tr key={challan.id}>

                    <td>
                      <strong>
                        {challan.challanNumber}
                      </strong>
                    </td>

                    <td>
                      {challan.customer.name}
                    </td>

                    <td>
                      <div className="challan-products-preview">

                        {challan.items.map(
                          (item) => (
                            <span
                              key={item.id}
                              className="product-chip"
                            >
                              {item.productNameSnapshot}
                              {' × '}
                              {item.quantity}
                            </span>
                          )
                        )}

                      </div>
                    </td>

                    <td>
                      <strong>
                        {challan.totalQuantity}
                      </strong>
                    </td>

                    <td>

                      <span
                        className={`status-pill ${challan.status.toLowerCase()}`}
                      >
                        {challan.status}
                      </span>

                    </td>

                    <td>

                      <div className="table-actions">

                        {challan.status === 'DRAFT' && (
                          <>
                            <button
                              className="action-btn confirm"
                              onClick={() =>
                                handleConfirm(
                                  challan.id
                                )
                              }
                            >
                              Confirm
                            </button>

                            <button
                              className="action-btn danger"
                              onClick={() =>
                                handleCancel(
                                  challan.id
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {challan.status ===
                          'CONFIRMED' && (
                          <>
                            <button
                              className="action-btn invoice"
                              onClick={() =>
                                handleDownloadInvoice(
                                  challan.id,
                                  challan.challanNumber
                                )
                              }
                            >
                              Invoice PDF
                            </button>

                            <button
                              className="action-btn danger"
                              onClick={() =>
                                handleCancel(
                                  challan.id
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        )}

                      </div>

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}