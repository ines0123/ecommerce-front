import React, { useState, useEffect, createContext, useContext } from 'react';

// ============================================
// API SERVICE
// ============================================
const API_BASE_URL = 'http://localhost:9090';

const api = {
  async getProducts() {
    const response = await fetch(`${API_BASE_URL}/esb/api/products`);
    const data = await response.json();
    return data.data || [];
  },
  
  // async getProduct(id) {
  //   const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
  //   const data = await response.json();
  //   return data.data;
  // },

  async createOrder(orderData) {
    const response = await fetch(
        `${API_BASE_URL}/camunda/engine-rest/process-definition/key/order_delivery/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variables: {
              items: {
                value: JSON.stringify(orderData.items)
              },
              customer: {
                value: JSON.stringify(orderData.customer)
              }
            }
          })
        }
    );


    console.log("response", response)
    const data = await response.json();
    if (!response.ok) {
      throw new Error("Failed to start process");
    }
    return {
      processInstanceId: data.id
    };
  },
  
  // async getOrder(id) {
  //   const response = await fetch(`${API_BASE_URL}/api/orders/${id}`);
  //   const data = await response.json();
  //   return data.data;
  // },

  async getAllOrders() {
  const response = await fetch(`${API_BASE_URL}/esb/api/oms/orders`);
  const data = await response.json();
  console.log("response", data);
  return data || [];
 }
}


// ============================================
// CART CONTEXT
// ============================================
const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };
  
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };
  
  const clearCart = () => setCart([]);
  
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// ============================================
// ROUTER (Simple hash-based routing)
// ============================================
const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');
  
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  return React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { currentPath });
    }
    return child;
  });
};

const Route = ({ path, component: Component, currentPath }) => {
  const pathPattern = new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`);
  const match = currentPath.match(pathPattern);
  
  if (!match) return null;
  
  const params = {};
  const paramNames = (path.match(/:\w+/g) || []).map(p => p.slice(1));
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  
  return <Component params={params} />;
};

const Link = ({ to, children, className = '' }) => (
  <a href={`#${to}`} className={className}>
    {children}
  </a>
);

// ============================================
// COMPONENTS
// ============================================

// Navigation
const Navigation = () => {
  const { cartCount } = useCart();
  
  return (
    <nav className="bg-[#0891b287] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-black flex items-center gap-2 text-2xl font-bold">
            <img
              src="/assets/ShipOra_Logo_2.png"
              alt="ShipOra Logo"
              className="h-12 w-auto"
            />
            ShipOra
          </Link>
          <div className="flex gap-6 items-center">
            <Link to="/" className="text-black font-semibold hover:text-cyan-600">Products</Link>
            <Link to="/orders" className="text-black font-semibold hover:text-cyan-600">Orders</Link>
            <Link to="/cart" className="text-black font-semibold hover:text-cyan-600 relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Product Card
const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  
  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <div className="h-48 bg-gradient-to-br bg-[#0891b224] to-indigo-100 flex items-center justify-center">
        <span className="text-6xl">{product.image || '📦'}</span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-cyan-600">
            {product.price}
            <span className="ml-1 text-sm font-medium">د.ت</span>
          </span>
        </div>
        <button
            onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`w-full mt-4 py-2 rounded-lg font-semibold transition-colors ${
            added
              ? 'bg-green-500 text-white'
              : product.stock === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }`}
        >
          {added ? '✓ Added!' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// PAGES
// ============================================

// Home Page (Product List)
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading products...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Our Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

// Cart Page
const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  
  if (cart.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some products to get started!</p>
        <Link to="/" className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 inline-block">
          Browse Products
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded flex items-center justify-center text-3xl">
                {item.image || '📦'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-gray-600">
                  <span className="text-sm font-medium"> د.ت&nbsp;</span>
                  <span className="ml-1 font-semibold">{item.price}</span>
                  <span className="ml-1 text-sm">each</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                >
                  +
                </button>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{(item.price * item.quantity).toFixed(2)} د.ت &nbsp;</div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{cartTotal.toFixed(2)}&nbsp;د.ت </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{cartTotal.toFixed(2)}&nbsp;د.ت </span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="w-full bg-cyan-600 text-white py-3 rounded-lg hover:bg-cyan-700 font-semibold block text-center"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={clearCart}
              className="w-full mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Page
const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const [formData] = useState({
    name: 'Alice Smith',
    email: 'alice@example.com',
    address: '123 Main Street',
    phone: '+111111111'
  });
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        customer: formData
      };


      const result = await api.createOrder(orderData);
      console.log("Process started", result)
      setOrderId(result.processInstanceId);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      console.log('Order submission attempt finished');
      setLoading(false);
    }
  };
  
  if (cart.length === 0 && !orderId) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Link to="/" className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 inline-block">
          Browse Products
        </Link>
      </div>
    );
  }
  
  if (orderId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold mb-4">Order Placed Successfully!</h2>
        {/*<p className="text-gray-600 mb-2">Order ID: {orderId}</p>*/}
        <p className="text-gray-600 mb-6">We've sent a confirmation email to {formData.email}</p>
        <Link to="/" className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 inline-block">
          Continue Shopping
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Order Summary</h2>
        {cart.map(item => (
          <div key={item.id} className="flex justify-between py-2">
            <span>{item.name} x {item.quantity}</span>
            <span>{(item.price * item.quantity).toFixed(2)}&nbsp; د.ت </span>
          </div>
        ))}
        <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>{cartTotal.toFixed(2)}&nbsp; د.ت </span>
        </div>
      </div>
      
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Customer Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
        </div>
      </div> */}
      <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-cyan-600 text-white py-3 rounded-lg hover:bg-cyan-700 font-semibold disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Place Order'}
      </button>
    </div>
  );
};

// Orders Page
const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    api.getAllOrders()
      .then(setOrders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading orders...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
        <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
        <Link to="/" className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 inline-block">
          Browse Products
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {[...orders]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Order #{order.id}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  order.status.toLowerCase() === 'fulfillment_requested' ? 'bg-yellow-100 text-yellow-800' :
                  order.status.toLowerCase() === 'confirmed' ? 'bg-cyan-100 text-cyan-800' :
                  order.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status.toLowerCase().charAt(0).toUpperCase() +
                      order.status.toLowerCase().slice(1)}
                </span>
              </div>
            </div>
            
            {/* <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Customer</h4>
              <p className="text-sm text-gray-600">{order.customer.name}</p>
              <p className="text-sm text-gray-600">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-sm text-gray-600">{order.customer.phone}</p>
              )}
            </div> */}
            
            <div className="border-t mt-4 pt-4">
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-semibold">{(Number(item.unit_price) * item.quantity).toFixed(2)} د.ت </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t mt-4 pt-4 flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-2xl text-cyan-600">
                {order.total_amount} {order.currency} د.ت
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
const App = () => {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Router>
            <Route path="/" component={HomePage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={CheckoutPage} />
            <Route path="/orders" component={OrdersPage} />
          </Router>
        </main>
      </div>
    </CartProvider>
  );
};

export default App;
