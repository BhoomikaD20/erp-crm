import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: string;
  address?: string;
  status: string;
  followUpDate?: string;
  notes?: string;
}

interface CustomerForm {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: string;
  address: string;
  status: string;
  followUpDate: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  customerType: 'RETAIL',
  address: '',
  status: 'LEAD',
  followUpDate: '',
  notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const res = await api.get<{ data: Customer[] }>(
        `/customers?search=${encodeURIComponent(search)}`
      );

      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateField(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id);

    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      businessName: customer.businessName || '',
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType || 'RETAIL',
      address: customer.address || '',
      status: customer.status || 'LEAD',
      followUpDate: customer.followUpDate
        ? customer.followUpDate.substring(0, 10)
        : '',
      notes: customer.notes || '',
    });

    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setFormError('');
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        businessName: form.businessName || undefined,
        gstNumber: form.gstNumber || undefined,
        customerType: form.customerType,
        address: form.address || undefined,
        status: form.status,
        followUpDate: form.followUpDate || undefined,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      closeForm();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save customer'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Manage customer relationships, business contacts and follow-ups.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddForm}
        >
          + Add Customer
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-label">
            Total Customers
          </div>
          <div className="stat-value">
            {customers.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Active Customers
          </div>
          <div className="stat-value">
            {
              customers.filter(
                (customer) => customer.status === 'ACTIVE'
              ).length
            }
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Leads
          </div>
          <div className="stat-value">
            {
              customers.filter(
                (customer) => customer.status === 'LEAD'
              ).length
            }
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Inactive
          </div>
          <div className="stat-value">
            {
              customers.filter(
                (customer) => customer.status === 'INACTIVE'
              ).length
            }
          </div>
        </div>

      </div>

      {/* ADD / EDIT CUSTOMER FORM */}
      {showForm && (
        <div className="form-card">

          <div className="form-card-header">
            <div>
              <h2>
                {editingId
                  ? 'Edit Customer'
                  : 'Add New Customer'}
              </h2>

              <p>
                Enter complete customer and follow-up information.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>

            {/* BASIC INFORMATION */}
            <div className="form-section">

              <h3>Basic Information</h3>

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Customer Name *
                  </label>

                  <input
                    required
                    value={form.name}
                    placeholder="Enter customer name"
                    onChange={(e) =>
                      updateField('name', e.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label>
                    Mobile Number *
                  </label>

                  <input
                    required
                    value={form.mobile}
                    placeholder="Enter mobile number"
                    onChange={(e) =>
                      updateField('mobile', e.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    placeholder="customer@email.com"
                    onChange={(e) =>
                      updateField('email', e.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label>
                    Business Name
                  </label>

                  <input
                    value={form.businessName}
                    placeholder="Enter business name"
                    onChange={(e) =>
                      updateField(
                        'businessName',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>
                    GST Number
                    <span className="optional">
                      Optional
                    </span>
                  </label>

                  <input
                    value={form.gstNumber}
                    placeholder="Enter GST number"
                    onChange={(e) =>
                      updateField(
                        'gstNumber',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>
                    Customer Type
                  </label>

                  <select
                    value={form.customerType}
                    onChange={(e) =>
                      updateField(
                        'customerType',
                        e.target.value
                      )
                    }
                  >
                    <option value="RETAIL">
                      Retail
                    </option>

                    <option value="WHOLESALE">
                      Wholesale
                    </option>

                    <option value="DISTRIBUTOR">
                      Distributor
                    </option>
                  </select>
                </div>

              </div>
            </div>

            {/* ADDRESS */}
            <div className="form-section">

              <h3>Address</h3>

              <div className="form-field">

                <label>
                  Customer Address
                </label>

                <textarea
                  rows={3}
                  value={form.address}
                  placeholder="Enter complete customer address"
                  onChange={(e) =>
                    updateField(
                      'address',
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            {/* FOLLOW-UP */}
            <div className="form-section">

              <h3>Follow-up & Status</h3>

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField(
                        'status',
                        e.target.value
                      )
                    }
                  >
                    <option value="LEAD">
                      Lead
                    </option>

                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="INACTIVE">
                      Inactive
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Follow-up Date
                  </label>

                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) =>
                      updateField(
                        'followUpDate',
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

            </div>

            {/* NOTES */}
            <div className="form-section">

              <h3>Notes</h3>

              <div className="form-field">

                <label>
                  Customer Notes
                </label>

                <textarea
                  rows={4}
                  value={form.notes}
                  placeholder="Add customer requirements, discussions, follow-up notes..."
                  onChange={(e) =>
                    updateField(
                      'notes',
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            {formError && (
              <div className="error-banner">
                {formError}
              </div>
            )}

            <div className="form-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Customer'
                    : 'Save Customer'}
              </button>

            </div>

          </form>
        </div>
      )}

      {/* SEARCH */}
      <div className="search-section">

        <div className="search-wrapper">

          <span className="search-icon">
            🔎
          </span>

          <input
            className="search-box"
            placeholder="Search customers by name, mobile, email or business..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <span className="result-count">
          {customers.length} customers
        </span>

      </div>

      {/* CUSTOMER TABLE */}
      <div className="table-card">

        {loading ? (
          <div className="empty-state">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              👥
            </div>

            <h3>
              No customers found
            </h3>

            <p>
              Start by adding your first customer.
            </p>

            <button
              className="primary-btn"
              onClick={openAddForm}
            >
              + Add Customer
            </button>

          </div>

        ) : (

          <div className="table-scroll">

            <table>

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {customers.map((customer) => (

                  <tr key={customer.id}>

                    <td>
                      <div className="customer-name">
                        <strong>
                          {customer.name}
                        </strong>

                        {customer.email && (
                          <small>
                            {customer.email}
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      {customer.mobile}
                    </td>

                    <td>
                      {customer.businessName || '-'}
                    </td>

                    <td>
                      <span className="badge badge-type">
                        {customer.customerType}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge badge-${customer.status.toLowerCase()}`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td>
                      {customer.followUpDate
                        ? new Date(
                            customer.followUpDate
                          ).toLocaleDateString()
                        : '-'}
                    </td>

                    <td>

                      <div className="table-actions">

                        <Link
                          className="action-link"
                          to={`/customers/${customer.id}`}
                        >
                          View
                        </Link>

                        <button
                          className="action-button"
                          onClick={() =>
                            openEditForm(customer)
                          }
                        >
                          Edit
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}