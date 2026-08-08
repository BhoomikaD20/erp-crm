import {
  Fragment,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { api } from '../api/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string | number;
  currentStock: number;
  minStockAlertQty: number;
  location?: string | null;
  imageUrl?: string | null;
}

interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;

  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  };

  createdAt: string;
}

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlertQty: string;
  location: string;
}

interface MovementForm {
  quantity: string;
  movementType: 'IN' | 'OUT';
  reason: string;
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '0',
  minStockAlertQty: '0',
  location: '',
};

const emptyMovement: MovementForm = {
  quantity: '',
  movementType: 'IN',
  reason: '',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [editingProductId, setEditingProductId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<ProductForm>(emptyForm);

  const [movementFor, setMovementFor] =
    useState<string | null>(null);

  const [movementHistoryFor, setMovementHistoryFor] =
    useState<string | null>(null);

  const [movementHistory, setMovementHistory] =
    useState<StockMovement[]>([]);

  const [movementLoading, setMovementLoading] =
    useState(false);

  const [movement, setMovement] =
    useState<MovementForm>(emptyMovement);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  /**
   * LOAD PRODUCTS
   */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get<{
        data: Product[];
      }>(
        `/products?search=${encodeURIComponent(
          search
        )}`
      );

      setProducts(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products'
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  /**
   * Search with a small debounce.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  /**
   * RESET PRODUCT FORM
   */
  function resetForm() {
    setForm({ ...emptyForm });
    setEditingProductId(null);
    setShowForm(false);
  }

  /**
   * START EDIT
   */
  function startEdit(product: Product) {
    setEditingProductId(product.id);

    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      unitPrice: String(product.unitPrice),
      currentStock: String(product.currentStock),
      minStockAlertQty: String(
        product.minStockAlertQty
      ),
      location: product.location || '',
    });

    setShowForm(true);

    setError('');
    setSuccess('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /**
   * SUBMIT PRODUCT
   */
  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError('');
    setSuccess('');

    const unitPrice = Number(form.unitPrice);

    const currentStock = Number(
      form.currentStock
    );

    const minStockAlertQty = Number(
      form.minStockAlertQty
    );

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!form.sku.trim()) {
      setError('SKU is required.');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setError(
        'Unit price must be greater than zero.'
      );
      return;
    }

    if (
      !editingProductId &&
      (!Number.isInteger(currentStock) ||
        currentStock < 0)
    ) {
      setError(
        'Current stock must be a non-negative integer.'
      );
      return;
    }

    if (
      !Number.isInteger(minStockAlertQty) ||
      minStockAlertQty < 0
    ) {
      setError(
        'Minimum stock alert quantity must be a non-negative integer.'
      );
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        unitPrice,
        minStockAlertQty,
        location: form.location.trim(),
      };

      if (editingProductId) {
        /**
         * Do not send currentStock while editing.
         * Stock must be changed through Stock Movement.
         */
        await api.put(
          `/products/${editingProductId}`,
          payload
        );

        setSuccess(
          'Product updated successfully.'
        );
      } else {
        await api.post('/products', {
          ...payload,
          currentStock,
        });

        setSuccess(
          'Product added successfully.'
        );
      }

      resetForm();

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingProductId
          ? 'Failed to update product'
          : 'Failed to create product'
      );
    }
  }

  /**
   * IMAGE UPLOAD
   */
  async function handleImageUpload(
    productId: string,
    file: File
  ) {
    setError('');
    setSuccess('');

    if (!file.type.startsWith('image/')) {
      setError(
        'Please select a valid image file.'
      );
      return;
    }

    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        throw new Error(
          'Authentication token not found.'
        );
      }

      const base =
        'http://localhost:4000';

      const formData = new FormData();

      formData.append('image', file);

      const response = await fetch(
        `${base}/products/${productId}/image`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            'Image upload failed'
        );
      }

      setSuccess(
        'Product image uploaded successfully.'
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Image upload failed'
      );
    }
  }

  /**
   * STOCK MOVEMENT
   */
  async function handleMovement(
    e: FormEvent<HTMLFormElement>,
    productId: string
  ) {
    e.preventDefault();

    setError('');
    setSuccess('');

    const quantity = Number(
      movement.quantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        'Quantity must be a positive integer.'
      );
      return;
    }

    if (!movement.reason.trim()) {
      setError('Reason is required.');
      return;
    }

    try {
      await api.post(
        `/products/${productId}/stock-movement`,
        {
          quantity,
          movementType:
            movement.movementType,
          reason: movement.reason.trim(),
        }
      );

      setMovementFor(null);

      setMovement({
        ...emptyMovement,
      });

      setSuccess(
        'Stock movement recorded successfully.'
      );

      await load();

      if (
        movementHistoryFor === productId
      ) {
        await loadMovementHistory(
          productId
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to record stock movement'
      );
    }
  }

  /**
   * LOAD MOVEMENT HISTORY
   */
  async function loadMovementHistory(
    productId: string
  ) {
    try {
      setMovementLoading(true);
      setError('');

      const res =
        await api.get<{
          data: StockMovement[];
        }>(
          `/products/${productId}/stock-movements`
        );

      setMovementHistory(res.data);

      setMovementHistoryFor(
        productId
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load stock movement history'
      );
    } finally {
      setMovementLoading(false);
    }
  }

  /**
   * TOGGLE MOVEMENT HISTORY
   */
  function toggleMovementHistory(
    productId: string
  ) {
    if (
      movementHistoryFor === productId
    ) {
      setMovementHistoryFor(null);
      setMovementHistory([]);
      return;
    }

    loadMovementHistory(productId);
  }

  /**
   * TOGGLE STOCK MOVEMENT FORM
   */
  function toggleMovement(
    productId: string
  ) {
    if (
      movementFor === productId
    ) {
      setMovementFor(null);

      setMovement({
        ...emptyMovement,
      });

      return;
    }

    setMovementFor(productId);

    setMovement({
      ...emptyMovement,
    });

    setError('');
    setSuccess('');
  }

  return (
    <div className="products-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>
            Products & Inventory
          </h1>

          <p>
            Manage products, pricing, stock
            levels and warehouse inventory.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingProductId(null);
              setForm({
                ...emptyForm,
              });
              setShowForm(true);
              setError('');
              setSuccess('');
            }
          }}
        >
          {showForm
            ? 'Cancel'
            : '+ Add Product'}
        </button>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="success-banner">
          {success}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* PRODUCT FORM */}
      {showForm && (
        <div className="form-card">

          <div className="form-card-header">
            <div>
              <h2>
                {editingProductId
                  ? 'Edit Product'
                  : 'Add New Product'}
              </h2>

              <p>
                Enter the product and inventory
                information below.
              </p>
            </div>
          </div>

          <form
            className="product-form"
            onSubmit={handleSubmit}
          >

            {/* PRODUCT NAME */}
            <div className="form-group">
              <label>
                Product Name *
              </label>

              <input
                type="text"
                placeholder="e.g. Premium Notebook"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>

            {/* SKU */}
            <div className="form-group">
              <label>
                SKU / Code *
              </label>

              <input
                type="text"
                placeholder="e.g. NB-001"
                required
                value={form.sku}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sku: e.target.value,
                  })
                }
              />
            </div>

            {/* CATEGORY */}
            <div className="form-group">
              <label>
                Category
              </label>

              <input
                type="text"
                placeholder="e.g. Stationery"
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              />
            </div>

            {/* PRICE */}
            <div className="form-group">
              <label>
                Unit Price *
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unitPrice:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* CURRENT STOCK */}
            <div className="form-group">
              <label>
                Current Stock
                {editingProductId && (
                  <span className="field-help">
                    {' '}
                    — use Stock Movement to
                    change stock
                  </span>
                )}
              </label>

              <input
                type="number"
                min="0"
                placeholder="0"
                disabled={
                  Boolean(editingProductId)
                }
                value={form.currentStock}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currentStock:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* MIN STOCK */}
            <div className="form-group">
              <label>
                Minimum Stock Alert Quantity
              </label>

              <input
                type="number"
                min="0"
                placeholder="10"
                value={
                  form.minStockAlertQty
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    minStockAlertQty:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* LOCATION */}
            <div className="form-group form-group-full">
              <label>
                Location / Warehouse
              </label>

              <input
                type="text"
                placeholder="e.g. Main Warehouse - Rack A3"
                value={form.location}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* BUTTONS */}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                {editingProductId
                  ? 'Update Product'
                  : 'Save Product'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* SEARCH */}
      <div className="toolbar-card">
        <div className="search-wrapper">
          <span className="search-icon">
            🔎
          </span>

          <input
            className="search-box"
            placeholder="Search products by name, SKU or category..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="product-count">
          {loading
            ? 'Loading...'
            : `${products.length} ${
                products.length === 1
                  ? 'product'
                  : 'products'
              }`}
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="table-card">

        <div className="table-responsive">

          <table className="data-table">

            <thead>
              <tr>
                <th>
                  Product
                </th>

                <th>
                  SKU / Code
                </th>

                <th>
                  Category
                </th>

                <th>
                  Unit Price
                </th>

                <th>
                  Current Stock
                </th>

                <th>
                  Alert Level
                </th>

                <th>
                  Location / Warehouse
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {products.map((p) => (
                <Fragment key={p.id}>

                  {/* PRODUCT ROW */}
                  <tr>

                    {/* IMAGE + NAME */}
                    <td>
                      <div className="product-cell">

                        <label className="product-image-wrapper">

                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="product-thumb"
                            />
                          ) : (
                            <div className="upload-label">
                              <span>
                                📷
                              </span>

                              <span>
                                Upload
                              </span>
                            </div>
                          )}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            hidden
                            onChange={(e) => {
                              const file =
                                e.target.files?.[0];

                              if (file) {
                                handleImageUpload(
                                  p.id,
                                  file
                                );
                              }

                              e.currentTarget.value =
                                '';
                            }}
                          />

                        </label>

                        <div>
                          <strong>
                            {p.name}
                          </strong>

                          <div className="product-subtext">
                            Product
                          </div>
                        </div>

                      </div>
                    </td>

                    {/* SKU */}
                    <td>
                      <span className="sku-text">
                        {p.sku}
                      </span>
                    </td>

                    {/* CATEGORY */}
                    <td>
                      {p.category ||
                        '—'}
                    </td>

                    {/* PRICE */}
                    <td>
                      <strong>
                        ₹
                        {Number(
                          p.unitPrice
                        ).toFixed(2)}
                      </strong>
                    </td>

                    {/* STOCK */}
                    <td>
                      <span
                        className={
                          p.currentStock <=
                          p.minStockAlertQty
                            ? 'stock-danger'
                            : 'stock-good'
                        }
                      >
                        {p.currentStock}
                      </span>
                    </td>

                    {/* ALERT */}
                    <td>
                      <span className="stock-alert">
                        {p.minStockAlertQty}
                      </span>

                      {p.currentStock <=
                        p.minStockAlertQty && (
                        <span className="low-stock-tag">
                          Low stock
                        </span>
                      )}
                    </td>

                    {/* LOCATION */}
                    <td>
                      <div className="location-cell">
                        <span>
                          📍
                        </span>

                        <span>
                          {p.location ||
                            'Not assigned'}
                        </span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="table-actions">

                        <button
                          type="button"
                          className="action-btn edit"
                          onClick={() =>
                            startEdit(p)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="action-btn movement"
                          onClick={() =>
                            toggleMovement(
                              p.id
                            )
                          }
                        >
                          {movementFor ===
                          p.id
                            ? 'Close Movement'
                            : 'Stock Movement'}
                        </button>

                        <button
                          type="button"
                          className="action-btn history"
                          onClick={() =>
                            toggleMovementHistory(
                              p.id
                            )
                          }
                        >
                          {movementHistoryFor ===
                          p.id
                            ? 'Hide History'
                            : 'View History'}
                        </button>

                      </div>
                    </td>

                  </tr>

                  {/* STOCK MOVEMENT FORM */}
                  {movementFor ===
                    p.id && (
                    <tr>
                      <td
                        colSpan={8}
                        className="expanded-row"
                      >
                        <div className="movement-panel">

                          <div>
                            <h3>
                              Record Stock Movement
                            </h3>

                            <p>
                              Current stock:{' '}
                              <strong>
                                {p.currentStock}
                              </strong>
                            </p>

                            <p>
                              Update inventory
                              quantity and record
                              the reason.
                            </p>
                          </div>

                          <form
                            className="movement-form"
                            onSubmit={(e) =>
                              handleMovement(
                                e,
                                p.id
                              )
                            }
                          >

                            {/* MOVEMENT TYPE */}
                            <div className="form-group">
                              <label>
                                Movement Type
                              </label>

                              <select
                                value={
                                  movement.movementType
                                }
                                onChange={(e) =>
                                  setMovement({
                                    ...movement,
                                    movementType:
                                      e.target
                                        .value as
                                        | 'IN'
                                        | 'OUT',
                                  })
                                }
                              >
                                <option value="IN">
                                  IN — Stock Added
                                </option>

                                <option value="OUT">
                                  OUT — Stock Removed
                                </option>
                              </select>
                            </div>

                            {/* QUANTITY */}
                            <div className="form-group">
                              <label>
                                Quantity *
                              </label>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                placeholder="Quantity"
                                value={
                                  movement.quantity
                                }
                                onChange={(e) =>
                                  setMovement({
                                    ...movement,
                                    quantity:
                                      e.target
                                        .value,
                                  })
                                }
                              />
                            </div>

                            {/* REASON */}
                            <div className="form-group movement-reason">
                              <label>
                                Reason *
                              </label>

                              <input
                                type="text"
                                required
                                placeholder="e.g. Purchase received, customer order, damaged stock..."
                                value={
                                  movement.reason
                                }
                                onChange={(e) =>
                                  setMovement({
                                    ...movement,
                                    reason:
                                      e.target
                                        .value,
                                  })
                                }
                              />
                            </div>

                            <button
                              type="submit"
                              className="primary-btn"
                            >
                              Record Movement
                            </button>

                          </form>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* MOVEMENT HISTORY */}
                  {movementHistoryFor ===
                    p.id && (
                    <tr>
                      <td
                        colSpan={8}
                        className="expanded-row"
                      >
                        <div className="history-panel">

                          <div className="history-header">

                            <div>
                              <h3>
                                Stock Movement
                                History
                              </h3>

                              <p>
                                {p.name} ·{' '}
                                {p.sku}
                              </p>
                            </div>

                            <div className="current-stock-display">
                              <span>
                                Current Stock:
                              </span>

                              <strong>
                                {p.currentStock}
                              </strong>
                            </div>

                          </div>

                          {movementLoading ? (
                            <div className="history-empty">
                              Loading movement
                              history...
                            </div>
                          ) : movementHistory.length ===
                            0 ? (
                            <div className="history-empty">
                              <strong>
                                No stock
                                movements yet
                              </strong>

                              <span>
                                Stock IN/OUT
                                activity will
                                appear here.
                              </span>
                            </div>
                          ) : (
                            <div className="history-table-wrapper">

                              <table className="movement-table">

                                <thead>
                                  <tr>
                                    <th>
                                      Product
                                    </th>

                                    <th>
                                      Quantity Changed
                                    </th>

                                    <th>
                                      Movement Type
                                    </th>

                                    <th>
                                      Reason
                                    </th>

                                    <th>
                                      Created By
                                    </th>

                                    <th>
                                      Timestamp
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>

                                  {movementHistory.map(
                                    (m) => (
                                      <tr
                                        key={
                                          m.id
                                        }
                                      >

                                        <td>
                                          {p.name}
                                        </td>

                                        <td>
                                          <strong
                                            className={
                                              m.movementType ===
                                              'IN'
                                                ? 'movement-in'
                                                : 'movement-out'
                                            }
                                          >
                                            {m.movementType ===
                                            'IN'
                                              ? '+'
                                              : '-'}
                                            {
                                              m.quantity
                                            }
                                          </strong>
                                        </td>

                                        <td>
                                          <span
                                            className={
                                              m.movementType ===
                                              'IN'
                                                ? 'movement-badge movement-in-badge'
                                                : 'movement-badge movement-out-badge'
                                            }
                                          >
                                            {m.movementType ===
                                            'IN'
                                              ? 'STOCK IN'
                                              : 'STOCK OUT'}
                                          </span>
                                        </td>

                                        <td>
                                          {m.reason}
                                        </td>

                                        <td>
                                          {m.createdBy
                                            ?.name ||
                                            m.createdBy
                                              ?.email ||
                                            'Unknown'}
                                        </td>

                                        <td>
                                          {new Date(
                                            m.createdAt
                                          ).toLocaleString()}
                                        </td>

                                      </tr>
                                    )
                                  )}

                                </tbody>

                              </table>

                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}

                </Fragment>
              ))}

              {/* LOADING */}
              {loading &&
                products.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="empty-table-cell"
                    >
                      <div className="empty-state">
                        <div className="empty-icon">
                          ⏳
                        </div>

                        <h3>
                          Loading products...
                        </h3>
                      </div>
                    </td>
                  </tr>
                )}

              {/* EMPTY STATE */}
              {!loading &&
                products.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="empty-table-cell"
                    >
                      <div className="empty-state">

                        <div className="empty-icon">
                          📦
                        </div>

                        <h3>
                          No products found
                        </h3>

                        <p>
                          {search
                            ? 'Try a different search term.'
                            : 'Add your first product to start managing inventory.'}
                        </p>

                        {!search && (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {
                              setShowForm(
                                true
                              );

                              setEditingProductId(
                                null
                              );

                              setForm({
                                ...emptyForm,
                              });

                              window.scrollTo(
                                {
                                  top: 0,
                                  behavior:
                                    'smooth',
                                }
                              );
                            }}
                          >
                            + Add Product
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                )}

            </tbody>

          </table>

        </div>
      </div>
    </div>
  );
}