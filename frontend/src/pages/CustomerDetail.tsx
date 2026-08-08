import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  async function loadCustomer() {
    try {
      setLoading(true);
      setError('');

      const res = await api.get<{ data: Customer }>(
        `/customers/${id}`
      );

      setCustomer(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load customer'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addFollowUpNote() {
    if (!followUpNote.trim()) return;

    try {
      setSavingNote(true);
      setError('');

      const existingNotes = customer?.notes || '';

      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n${new Date().toLocaleDateString()} - ${followUpNote}`
        : `${new Date().toLocaleDateString()} - ${followUpNote}`;

      await api.put(`/customers/${id}`, {
        notes: updatedNotes,
      });

      setFollowUpNote('');
      await loadCustomer();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add follow-up note'
      );
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="customer-detail-page">
        <div className="loading-card">
          <div className="loading-spinner" />
          <h2>Loading customer...</h2>
          <p>
            Please wait while we load the customer information.
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="customer-detail-page">
        <div className="error-card">
          <div className="error-icon">!</div>

          <h2>Customer Not Found</h2>

          <p>
            {error ||
              'The requested customer could not be found.'}
          </p>

          <Link
            to="/customers"
            className="primary-btn"
          >
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const followUpDate = customer.followUpDate
    ? new Date(customer.followUpDate).toLocaleDateString(
        undefined,
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      )
    : 'Not scheduled';

  return (
    <div className="customer-detail-page">

      {/* HEADER */}
      <header className="customer-detail-header">

        <div className="customer-header-left">

          <Link
            to="/customers"
            className="back-link"
          >
            ← Back to Customers
          </Link>

          <div className="customer-title-row">

            <div className="customer-avatar">
              {customer.name.charAt(0).toUpperCase()}
            </div>

            <div className="customer-title-content">

              <span className="customer-eyebrow">
                CUSTOMER PROFILE
              </span>

              <h1>{customer.name}</h1>

              <p>
                Customer profile, business information
                and follow-up details
              </p>

            </div>

          </div>

        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate('/customers')}
        >
          ← Customers
        </button>

      </header>

      {/* ERROR */}
      {error && (
        <div className="error-banner">
          <span className="error-banner-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}
      <section className="customer-summary-card">

        <div className="summary-item">
          <span className="summary-label">
            Customer Type
          </span>

          <span className="badge badge-type">
            {customer.customerType}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">
            Status
          </span>

          <span
            className={`badge badge-${customer.status.toLowerCase()}`}
          >
            {customer.status}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">
            Mobile
          </span>

          <strong className="summary-value">
            {customer.mobile}
          </strong>
        </div>

        <div className="summary-item">
          <span className="summary-label">
            Next Follow-up
          </span>

          <strong className="summary-value">
            {followUpDate}
          </strong>
        </div>

      </section>

      {/* INFORMATION */}
      <div className="customer-information-grid">

        {/* CUSTOMER INFORMATION */}
        <section className="detail-card">

          <div className="detail-card-header">

            <div className="section-icon">
              👤
            </div>

            <div>
              <h2>Customer Information</h2>

              <p>
                Contact and business details
              </p>
            </div>

          </div>

          <div className="details-list">

            <div className="detail-row">
              <span className="detail-label">
                Customer Name
              </span>

              <span className="detail-value">
                {customer.name}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Mobile Number
              </span>

              <span className="detail-value">
                {customer.mobile}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Email
              </span>

              <span className="detail-value">
                {customer.email || 'Not provided'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Business Name
              </span>

              <span className="detail-value">
                {customer.businessName || 'Not provided'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                GST Number
              </span>

              <span className="detail-value">
                {customer.gstNumber || 'Not provided'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Customer Type
              </span>

              <span className="detail-value">
                <span className="badge badge-type">
                  {customer.customerType}
                </span>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Status
              </span>

              <span className="detail-value">
                <span
                  className={`badge badge-${customer.status.toLowerCase()}`}
                >
                  {customer.status}
                </span>
              </span>
            </div>

          </div>

        </section>

        {/* ADDRESS */}
        <section className="detail-card">

          <div className="detail-card-header">

            <div className="section-icon">
              📍
            </div>

            <div>
              <h2>Address & Follow-up</h2>

              <p>
                Location and upcoming activity
              </p>
            </div>

          </div>

          <div className="address-section">

            <h3>Customer Address</h3>

            <div className="address-box">
              {customer.address ? (
                <span>{customer.address}</span>
              ) : (
                <span className="muted">
                  No address added.
                </span>
              )}
            </div>

          </div>

          <div className="follow-up-box">

            <div className="follow-up-icon">
              📅
            </div>

            <div>
              <span className="follow-up-label">
                Next Follow-up
              </span>

              <strong>
                {followUpDate}
              </strong>
            </div>

          </div>

        </section>

      </div>

      {/* NOTES */}
      <section className="detail-card notes-card">

        <div className="detail-card-header notes-header">

          <div className="section-icon">
            📝
          </div>

          <div>
            <h2>Follow-up Notes</h2>

            <p>
              Keep track of customer discussions,
              requirements and important follow-ups.
            </p>
          </div>

        </div>

        <div className="notes-content">

          {customer.notes ? (
            <div className="notes-display">
              {customer.notes}
            </div>
          ) : (
            <div className="empty-notes">

              <div className="empty-notes-icon">
                📝
              </div>

              <div>
                <strong>
                  No follow-up notes yet
                </strong>

                <p>
                  Add a note below to keep track
                  of your customer conversations.
                </p>
              </div>

            </div>
          )}

        </div>

        <div className="add-note">

          <label htmlFor="followUpNote">
            Add Follow-up Note
          </label>

          <textarea
            id="followUpNote"
            rows={5}
            placeholder="Write customer requirements, discussions, follow-up details..."
            value={followUpNote}
            onChange={(e) =>
              setFollowUpNote(e.target.value)
            }
          />

          <div className="note-actions">

            <span className="note-hint">
              Keep important customer information here.
            </span>

            <button
              className="primary-btn"
              onClick={addFollowUpNote}
              disabled={
                savingNote ||
                !followUpNote.trim()
              }
            >
              {savingNote
                ? 'Saving...'
                : '+ Add Follow-up Note'}
            </button>

          </div>

        </div>

      </section>

    </div>
  );
}