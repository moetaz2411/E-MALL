// Firebase configuration - replace with your actual values
const firebaseConfig = {
  apiKey: "AIzaSyCKlkOLxjDA-O2tBFS0T4tvlstur8ZCEHI",
  authDomain: "e-mall-eed3c.firebaseapp.com",
  databaseURL: "https://e-mall-eed3c-default-rtdb.firebaseio.com",
  projectId: "e-mall-eed3c",
  storageBucket: "e-mall-eed3c.appspot.com",
  messagingSenderId: "905828905581",
  appId: "1:905828905581:web:d0fe7b31caf8b959adc564"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
// Add auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in
    currentUser = user;
    // Load user data from database
    loadUserData(user.uid);
  } else {
    // No user is signed in - hide admin buttons
    currentUser = null;
    hideAdminButtons();
  }
});

// Helper function to hide admin buttons
// Helper function to show admin buttons
function showAdminButtons() {
  document.querySelectorAll('.navbar a').forEach(link => {
    if (link.textContent.includes('Shops') || link.textContent.includes('Deals')) {
      link.style.display = 'flex'; // Changed to flex to match navbar styling
    }
  });
}

// Helper function to hide admin buttons
function hideAdminButtons() {
  document.querySelectorAll('.navbar a').forEach(link => {
    if (link.textContent.includes('Shops') || link.textContent.includes('Deals')) {
      link.style.display = 'none';
    }
  });
}
async function loadUserData(uid) {
  try {
    const snapshot = await database.ref(`users/${uid}`).once('value');
    if (snapshot.exists()) {
      currentUser = { ...snapshot.val(), id: uid };

      // Check for admin status
      if (currentUser.email === 'moetazmrabti@gmail.com' || currentUser.isAdmin) {
        showAdminButtons();
      } else {
        hideAdminButtons();
      }

      // NEW: Update seller dashboard button
      updateSellerDashboardButton();

      cart = await getCart(uid);
      updateCartCount();
      updateSellerButton();
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}
document.addEventListener('DOMContentLoaded', function() {
    // Sample product data
    const initialProducts = [
        {
            id: 1,
            name: "Men's Casual T-Shirt",
            price: 24.99,
            category: "fashion",
            seller: "Fashion Haven",
            sellerId: "fashion-haven",
            rating: 4.5,
            images: [
  "https://files.catbox.moe/it64up.jpg",
  "https://files.catbox.moe/zmcolw.jpg"
]
            ,options: {
                "Size": ["S", "M", "L", "XL"],
                "Color": ["Black", "White", "Blue", "Gray"]
            },
            verifiedSeller: true
        },
        {
            id: 2,
            name: "Wireless Headphones",
            price: 89.99,
            category: "electronics",
            seller: "Tech Gadgets",
            sellerId: "tech-gadgets",
            rating: 4.8,
            images: ["https://files.catbox.moe/7prvp8.jpg"]
           , options: {
                "Color": ["Black", "White", "Blue"]
            },
            verifiedSeller: true
        },
        {
            id: 3,
            name: "Home Decor Vase",
            price: 35.50,
            category: "home",
            seller: "Home Essentials",
            sellerId: "home-essentials",
            rating: 4.2,
            images: [
                "https://placehold.co/300x300?text=Home+Vase"
            ],
            options: {
                "Color": ["White", "Blue", "Green"]
            },
            verifiedSeller: true
        },
        {
            id: 4,
            name: "Yoga Mat",
            price: 29.99,
            category: "sports",
            seller: "Active Life",
            sellerId: "active-life",
            rating: 4.7,
            images: [
                "https://files.catbox.moe/7prvp8.jpg"
            ],
            options: {
                "Color": ["Purple", "Blue", "Pink"]
            },
            verifiedSeller: true
        }
    ];

    // Load data from localStorage or initialize with sample data
   // Initialize with empty arrays, they'll be populated from Firebase
let users = [];
let cart = [];
let products = [];
let orders = [];
let shops = [];

    // Helper functions for localStorage
    // Firebase data functions
async function saveToFirebase(path, data) {
  try {
    await database.ref(path).set(data);
    console.log('Data saved successfully to', path);
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

async function loadFromFirebase(path, defaultValue = []) {
  try {
    const snapshot = await database.ref(path).once('value');
    return snapshot.exists() ? snapshot.val() : defaultValue;
  } catch (error) {
    console.error('Error loading data:', error);
    return defaultValue;
  }
}

// Specific data operations
async function getProducts() {
    const snapshot = await database.ref('products').once('value');
    const productsData = snapshot.val() || {};
    
    // Convert to array and ensure each product has required fields
    return Object.values(productsData).map(product => ({
        id: product.id || '',
        name: product.name || 'Unnamed Product',
        price: product.price || 0,
        category: product.category || 'uncategorized',
        seller: product.seller || 'Unknown Seller',
        sellerId: product.sellerId || '',
        rating: product.rating || 0,
        images: product.images && product.images.length ? product.images : ['https://placehold.co/300x300?text=Product+Image'],
        options: product.options || {},
        verifiedSeller: product.verifiedSeller || false
    }));
}

function sanitizeId(id) {
  return id.replace(/[.#$/[\]]/g, '-');
}

// Use it when saving products:
async function saveProduct(product) {
  const productRef = product.id 
    ? database.ref(`products/${product.id}`) 
    : database.ref('products').push();
  
  if (!product.id) product.id = productRef.key;
  
  // Always use seller's UID as sellerId
  if (currentUser) {
    product.sellerId = currentUser.id;
  }
  
  // Sanitize shop URL if it exists
  if (product.shopUrl) {
    product.shopUrl = sanitizeId(product.shopUrl);
  }
  
  await productRef.set(product);
  return product;
}
async function getUserByEmail(email) {
  const snapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
  const users = snapshot.val();
  return users ? Object.values(users)[0] : null;
}

async function saveUser(user) {
  const userRef = user.id 
    ? database.ref(`users/${user.id}`) 
    : database.ref('users').push();
  
  if (!user.id) user.id = userRef.key;
  
  await userRef.set(user);
  return user;
}

async function getCart(userId) {
  if (!userId) return [];
  const snapshot = await database.ref(`cart/${userId}`).once('value');
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
}

async function updateCart(userId, cartItems) {
  if (!userId) return;
  
  // Convert array to object for Firebase
  const cartObject = {};
  cartItems.forEach((item, index) => {
    cartObject[`item${index}`] = item;
  });
  
  await database.ref(`cart/${userId}`).set(cartObject);
}

    // Manual verification system
    const verifiedSellers = [
        { email: "seller2@example.com", verificationCode: "MALLHUB456" },
        { email: "seller3@example.com", verificationCode: "MALLHUB789" },
        { email: "moetazmrabti@gmail.com", verificationCode: "ADMIN2023" },
        { email: "aziz@gmail.com", verificationCode: "78" }
    ];

    // Email configuration (simulated)
    const adminEmail = "moetazmrabti@gmail.com";

    // DOM Elements
    const productGrid = document.getElementById('product-grid');
    const categoryFilter = document.getElementById('category-filter');
    const priceFilter = document.getElementById('price-filter');
    const cartCount = document.querySelector('.cart-count');
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const sellerModal = document.getElementById('seller-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const productOptionsModal = document.getElementById('product-options-modal');
    const successModal = document.getElementById('success-modal');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navbar = document.querySelector('.navbar');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar.querySelector('input');
    const searchButton = searchBar.querySelector('button');
    const cartBtn = document.getElementById('cart-btn');
    const becomeSellerBtn = document.querySelector('.hero-btns .btn-secondary');
    const checkoutForm = document.getElementById('checkout-form');
    const addProductForm = document.getElementById('add-product-form');
    const shopSettingsForm = document.getElementById('shop-settings-form');
    const shopPage = document.getElementById('shop-page');
    const shopHeader = document.getElementById('shop-header');
    const shopProductsGrid = document.getElementById('shop-products-grid');
    const backToHomeBtn = document.getElementById('back-to-home');
    // Admin verification codes
const adminCodes = ["ADMIN2023", "MALLHUBADMIN", "ADMIN123"];
let isAdmin = false;
    // Initialize the app
 async function init() {
  try {
    // Hide Shops and Deals buttons by default
    hideAdminButtons();

    // Rest of your initialization code...
    const productsSnapshot = await database.ref('products').once('value');
    products = productsSnapshot.val() ? Object.values(productsSnapshot.val()) : [];
    
    const usersSnapshot = await database.ref('users').once('value');
    users = usersSnapshot.val() ? Object.values(usersSnapshot.val()) : [];
    
    const shopsSnapshot = await database.ref('shops').once('value');
    shops = shopsSnapshot.val() ? Object.values(shopsSnapshot.val()) : [];
    
    // Load cart if user is logged in
    if (currentUser) {
      const cartSnapshot = await database.ref(`cart/${currentUser.id}`).once('value');
      cart = cartSnapshot.val() ? Object.values(cartSnapshot.val()) : [];
    }
    
    renderProducts(products);
    setupEventListeners();
    updateCartCount();
    updateSellerButton();
    initializeCountrySelect();
    initializePaymentMethods();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}
// Admin verification function
function verifyAdmin(code) {
    const adminCodes = ["ADMIN2023"];
    return adminCodes.includes(code);
}
// Show admin verification modal
function showAdminVerificationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal verification-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Admin Verification</h2>
            <p>Please enter admin code to access shops management:</p>
            <input type="password" id="admin-code" placeholder="Enter admin code">
            <button id="verify-admin-btn" class="btn btn-primary">Verify</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Handle verification
    modal.querySelector('#verify-admin-btn').addEventListener('click', function() {
        const code = document.getElementById('admin-code').value.trim();
        
        if (verifyAdmin(code)) {
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            document.body.removeChild(modal);
            toggleModal(document.getElementById('admin-shops-modal'));
            loadAdminShops();
        } else {
            showSuccessModal('Error', 'Invalid admin code');
        }
    });
}
// Load all shops for admin
// In website.js, modify the loadAdminShops function:

async function loadAdminShops(searchTerm = '') {
  const shopsList = document.getElementById('admin-shops-list');
  shopsList.innerHTML = '<p>Loading shops...</p>';
  
  try {
    const shopsSnapshot = await database.ref('shops').once('value');
    const allShops = shopsSnapshot.val() || {};
    
    // Convert to array and filter
    let shopArray = Object.values(allShops).filter(shop => 
      shop.owner && shop.ownerEmail // Only show shops with owner data
    );
    
    if (searchTerm) {
      shopArray = shopArray.filter(shop => 
        (shop.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        shop.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Clear and render shops
    shopsList.innerHTML = '';
    shopArray.forEach(shop => {
      const shopCard = `
        <div class="shop-card">
          <h3>${shop.name || 'Unnamed Shop'}</h3>
          <p>Owner: ${shop.ownerEmail || 'Unknown'}</p>
          <div class="shop-actions">
            <button class="btn view-shop-details" data-userid="${shop.owner}">
              View Details
            </button>
            <button class="btn btn-danger delete-shop" data-shopid="${shop.id}">
              Delete Shop
            </button>
          </div>
        </div>`;
      shopsList.innerHTML += shopCard;
    });
    
    // Add event listeners
    document.querySelectorAll('.view-shop-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-userid');
        showShopDetails(userId);
      });
    });
    
    document.querySelectorAll('.delete-shop').forEach(btn => {
      btn.addEventListener('click', async () => {
        const shopId = btn.getAttribute('data-shopid');
        if (confirm('Are you sure you want to delete this shop and all its products?')) {
          await deleteShop(shopId);
          loadAdminShops(searchTerm);
        }
      });
    });
    
  } catch (error) {
    console.error("Error loading shops:", error);
    shopsList.innerHTML = '<p>Error loading shops</p>';
  }
}
// In website.js, update these functions:

// 1. Fix the trackSale function to properly update shop stats
async function trackSale(order) {
  const commissionRate = 0.1; // 10% commission
  const updates = {};
  
  try {
    // Create a map to aggregate sales by seller
    const sellerSales = new Map();
    
    // Aggregate sales by seller
    for (const itemGroup of order.items) {
      if (!itemGroup.items) continue;
      
      for (const item of itemGroup.items) {
        if (!item.product || !item.product.sellerId) continue;
        
        const sellerId = item.product.sellerId;
        const itemTotal = item.product.price * item.quantity;
        const commission = itemTotal * commissionRate;
        
        if (!sellerSales.has(sellerId)) {
          sellerSales.set(sellerId, {
            sales: 0,
            revenue: 0,
            commission: 0
          });
        }
        
        const sellerData = sellerSales.get(sellerId);
        sellerData.sales += item.quantity;
        sellerData.revenue += itemTotal;
        sellerData.commission += commission;
      }
    }
    
    // Prepare updates for each seller
    for (const [sellerId, data] of sellerSales) {
      updates[`shops/${sellerId}/totalSales`] = 
        firebase.database.ServerValue.increment(data.sales);
      updates[`shops/${sellerId}/totalRevenue`] = 
        firebase.database.ServerValue.increment(data.revenue);
      updates[`shops/${sellerId}/totalCommission`] = 
        firebase.database.ServerValue.increment(data.commission);
      updates[`shops/${sellerId}/lastSale`] = new Date().toISOString();
    }
    
    // Apply all updates
    await database.ref().update(updates);
    
    return true;
  } catch (error) {
    console.error("Error tracking sale:", error);
    return false;
  }
}
function validateShopUrl(url) {
  return url
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 50); // Limit length
}
// In seller dashboard
async function loadShopData() {
  const shop = await getShopByUserId(currentUser.id);
  if (shop) {
    document.getElementById('shop-name').value = shop.name || '';
    document.getElementById('shop-description').value = shop.description || '';
    document.getElementById('shop-url').value = shop.url || '';
  }
}
async function deleteShop(shopId) {
  try {
    // First get all products from this shop
    const productsSnapshot = await database.ref('products')
      .orderByChild('sellerId')
      .equalTo(shopId)
      .once('value');
    
    // Delete all products
    const updates = {};
    if (productsSnapshot.exists()) {
      productsSnapshot.forEach(product => {
        updates[`products/${product.key}`] = null;
      });
    }
    
    // Delete the shop
    updates[`shops/${shopId}`] = null;
    
    // Keep sales records but mark shop as deleted
    updates[`salesRecords/${shopId}/deleted`] = true;
    updates[`salesRecords/${shopId}/deletedAt`] = new Date().toISOString();
    
    await database.ref().update(updates);
    showSuccessModal('Shop Deleted', 'The shop has been successfully removed.');
  } catch (error) {
    console.error("Error deleting shop:", error);
    showSuccessModal('Error', 'Failed to delete shop. Please try again.');
  }
}
// Show shop details
async function showShopDetails(userId) {
  const shop = await getShopByUserId(userId);
  if (!shop) {
    showSuccessModal('Error', 'Shop not found');
    return;
  }
  
  // Get shop products
  const productsSnapshot = await database.ref('products')
    .orderByChild('sellerId')
    .equalTo(userId)
    .once('value');
    
  const products = productsSnapshot.val() || {};
  
  // Update UI with shop data
  const modal = document.getElementById('admin-shop-details-modal');
  modal.querySelector('#admin-shop-details-title').textContent = shop.name || 'Unnamed Shop';
  
  const statsHTML = `
    <div class="shop-stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
        <div class="stat-content">
          <h3>Total Sales</h3>
          <p id="shop-total-sales">${shop.totalSales || 0}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
        <div class="stat-content">
          <h3>Total Revenue</h3>
          <p id="shop-total-revenue">$${(shop.totalRevenue || 0).toFixed(2)}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-percentage"></i></div>
        <div class="stat-content">
          <h3>Our Commission</h3>
          <p id="shop-commission">$${(shop.totalCommission || 0).toFixed(2)}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-box-open"></i></div>
        <div class="stat-content">
          <h3>Total Products</h3>
          <p id="shop-product-count">${Object.keys(products).length}</p>
        </div>
      </div>
    </div>
    
    <div class="shop-actions">
      <button id="reset-stats-btn" class="btn btn-warning">
        <i class="fas fa-sync-alt"></i> Reset Stats
      </button>
      <button id="view-shop-btn" class="btn btn-primary">
        <i class="fas fa-external-link-alt"></i> View Public Shop
      </button>
    </div>
  `;
  
  modal.querySelector('.shop-stats').innerHTML = statsHTML;
  
  // Render products
  const productsList = document.getElementById('admin-shop-products-list');
  productsList.innerHTML = '';
  
  if (Object.keys(products).length === 0) {
    productsList.innerHTML = '<p class="no-products">This shop has no products yet.</p>';
  } else {
    Object.values(products).forEach(product => {
      productsList.innerHTML += `
        <div class="shop-product-item">
          <img src="${product.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}" 
               alt="${product.name}" class="product-image">
          <div class="product-info">
            <h4>${product.name}</h4>
            <p>Price: $${product.price?.toFixed(2) || '0.00'}</p>
            <p>Category: ${product.category || 'Uncategorized'}</p>
          </div>
        </div>`;
    });
  }
  
  // Add event listeners
  document.getElementById('reset-stats-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all statistics for this shop?')) {
      resetShopStats(shop.id);
    }
  });
  
  document.getElementById('view-shop-btn')?.addEventListener('click', () => {
    window.open(`/shop/${shop.url || shop.id}`, '_blank');
  });
  
  toggleModal(modal);
}
async function resetShopStats(shopId) {
    try {
        // Create updates object
        const updates = {
            [`shops/${shopId}/totalSales`]: 0,
            [`shops/${shopId}/totalRevenue`]: 0,
            [`shops/${shopId}/totalCommission`]: 0
        };

        // Update in Firebase
        await database.ref().update(updates);
        
        // Refresh local data
        const shopsSnapshot = await database.ref('shops').once('value');
        shops = shopsSnapshot.val() ? Object.values(shopsSnapshot.val()) : [];
        
        showSuccessModal('Stats Reset', 'All statistics for this shop have been reset to zero.');
    } catch (error) {
        console.error("Error resetting shop stats:", error);
        showSuccessModal('Error', 'Failed to reset shop statistics. Please try again.');
    }
}

// Update the admin shops search functionality
document.getElementById('admin-shops-search-btn')?.addEventListener('click', function() {
    const searchTerm = document.getElementById('admin-shops-search').value;
    loadAdminShops(searchTerm);
});

document.getElementById('admin-shops-search')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const searchTerm = this.value;
        loadAdminShops(searchTerm);
    }
});
    // Set up event listeners
    function setupEventListeners() {
    // Filter products
    categoryFilter.addEventListener('change', filterProducts);
    priceFilter.addEventListener('change', filterProducts);
    
    // Search functionality
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Modal controls
    loginBtn.addEventListener('click', () => toggleModal(loginModal));
    showRegister.addEventListener('click', toggleLoginRegister);
    showLogin.addEventListener('click', toggleLoginRegister);
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            toggleModal(modal);
        });
    });
    
    // Login/Register forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Mobile menu
    mobileMenuBtn.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            toggleModal(e.target);
        }
    });
    
    // Cart button
    cartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (cart.length > 0) {
            toggleModal(checkoutModal);
            renderCheckout();
        } else {
            showSuccessModal('Your Cart is Empty', 'Add some products to your cart first!');
        }
    });
  // Product grid click handler - EVENT DELEGATION
      document.addEventListener('click', function(e) {
        // Handle View Details button
        if (e.target.classList.contains('view-details') || e.target.closest('.view-details')) {
            e.preventDefault();
            const btn = e.target.classList.contains('view-details') ? e.target : e.target.closest('.view-details');
            const productId = btn.getAttribute('data-id');
            viewProductDetails(productId);
        } 
        // Handle Buy Now button
        else if (e.target.classList.contains('buy-now') || e.target.closest('.buy-now')) {
            e.preventDefault();
            const btn = e.target.classList.contains('buy-now') ? e.target : e.target.closest('.buy-now');
            const productId = btn.getAttribute('data-id');
            const product = products.find(p => p.id == productId);
            
            if (!product) return;
            
            if (product.options && Object.keys(product.options).length > 0) {
                showProductOptions(productId, 'buy');
            } else {
                // For products without options
                cart = [{
                    product: product,
                    options: {},
                    quantity: 1
                }];
                updateCartCount();
                toggleModal(checkoutModal);
                renderCheckout();
            }
        }
    });
    
    // Become a Seller / Add Product button
    if (becomeSellerBtn) {
        becomeSellerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSellerButtonClick();
        });
    }
    
   if (addProductForm) {
    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await addNewProduct();
        } catch (error) {
            console.error("Error adding product:", error);
            showSuccessModal('Error', 'Failed to add product. Please try again.');
        }
    });
        
        // Image upload preview
        document.getElementById('product-images').addEventListener('change', function() {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = '';
            
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                }
                reader.readAsDataURL(file);
            });
        });
        
        // Add option button
        document.getElementById('add-option').addEventListener('click', addProductOption);
    }
    
    // Checkout form
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processCheckout();
        });
    }
    
    // Seller dashboard tabs
    document.querySelectorAll('.seller-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchSellerTab(tabId);
        });
    });
    
    // Payment method selection
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updatePaymentDetailsVisibility();
        });
    });
    
    // Back to home button
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('shop-page').classList.remove('active');
            document.querySelector('.main-content').classList.add('active');
            currentShop = null;
            renderProducts(products);
        });
    }
    
    // Shop settings form
    if (shopSettingsForm) {
        shopSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveShopSettings();
        });
        
        // Shop banner upload preview
        document.getElementById('shop-banner').addEventListener('change', function() {
            const preview = document.getElementById('shop-banner-preview');
            preview.innerHTML = '';
            
            if (this.files.length > 0) {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
        
        // Shop logo upload preview
        document.getElementById('shop-logo').addEventListener('change', function() {
            const preview = document.getElementById('shop-logo-preview');
            preview.innerHTML = '';
            
            if (this.files.length > 0) {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // ADMIN SHOPS FUNCTIONALITY
    // Handle Shops button click in navbar
   // Handle Shops button click in navbar
document.querySelectorAll('.navbar a').forEach(link => {
    if (link.textContent.includes('Shops')) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear previous input
            document.getElementById('admin-code').value = '';
            
            // If already admin, show shops management
            if (isAdmin) {
                toggleModal(document.getElementById('admin-shops-modal'));
                loadAdminShops();
                return;
            }
            
            // Otherwise show verification modal
            const verificationModal = document.getElementById('admin-verification-modal');
            toggleModal(verificationModal);
            
            // Handle verification
            document.getElementById('verify-admin-btn').onclick = function() {
                const code = document.getElementById('admin-code').value.trim();
                
                if (verifyAdmin(code)) {
                    isAdmin = true;
                    localStorage.setItem('isAdmin', 'true');
                    toggleModal(verificationModal);
                    toggleModal(document.getElementById('admin-shops-modal'));
                    loadAdminShops();
                    
                    // Set 1 hour admin session timeout
                    setTimeout(() => {
                        isAdmin = false;
                        localStorage.removeItem('isAdmin');
                        showSuccessModal('Session Expired', 'Your admin session has expired');
                    }, 3600000);
                } else {
                    showSuccessModal('Error', 'Invalid admin code');
                }
            };
        });
    }
});

    // Admin shops search functionality
    document.getElementById('admin-shops-search-btn')?.addEventListener('click', function() {
        const searchTerm = document.getElementById('admin-shops-search').value;
        loadAdminShops(searchTerm);
    });

    document.getElementById('admin-shops-search')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value;
            loadAdminShops(searchTerm);
        }
    });

    // Close button for admin shop details modal
   // Close button for admin shop details modal
document.querySelector('#admin-shop-details-modal .close-modal')?.addEventListener('click', function() {
    toggleModal(document.getElementById('admin-shop-details-modal'));
    // The shops list modal should remain open
});
// Add these to the setupEventListeners function
document.getElementById('show-manual-verification')?.addEventListener('click', showManualVerificationModal);
document.getElementById('verify-manual-btn')?.addEventListener('click', verifyManualSeller);
// Add this to your setupEventListeners function
document.getElementById('show-manual-verification')?.addEventListener('click', showManualVerificationModal);

// Add this function to handle manual verification
// Update the verifyManualSeller function
async function verifyManualSeller() {
  const email = document.getElementById('manual-email').value.trim();
  const code = document.getElementById('verification-code').value.trim();

  if (!email || !code) {
    showSuccessModal('Error', 'Please enter both email and verification code');
    return;
  }

  const verifiedSellers = [
    { email: "seller1@example.com", verificationCode: "MALLHUB123" },
    { email: "seller2@example.com", verificationCode: "MALLHUB456" },
    { email: "seller3@example.com", verificationCode: "MALLHUB789" },
    { email: "moetazmrabti@gmail.com", verificationCode: "ADMIN2023" },
    { email: "aziz@gmail.com", verificationCode: "78" }
  ];

  const isVerified = verifiedSellers.some(seller =>
    seller.email.toLowerCase() === email.toLowerCase() &&
    seller.verificationCode === code
  );

  if (isVerified) {
    if (currentUser) {
      currentUser.verifiedSeller = true;
      await saveUser(currentUser);

      // NEW: Update seller dashboard button
      updateSellerDashboardButton();

      showSuccessModal(
        'Verification Successful',
        'You can now post products as a verified seller!'
      );

      toggleModal(document.getElementById('manual-verification-modal'));
      toggleModal(document.getElementById('seller-modal'));
    } else {
      showSuccessModal('Error', 'No user logged in. Please log in first.');
    }
  } else {
    showSuccessModal('Verification Failed', 'Invalid email or verification code');
  }
}
}
// Manual verification functions
function showManualVerificationModal() {
    toggleModal(document.getElementById('manual-verification-modal'));
}
    // Initialize country select with additional countries
    function initializeCountrySelect() {
        const countrySelect = document.getElementById('checkout-country');
        if (countrySelect) {
            const additionalCountries = [
                {code: 'TN', name: 'Tunisia'},
                {code: 'FR', name: 'France'},
                {code: 'DE', name: 'Germany'},
                {code: 'ES', name: 'Spain'}
            ];
            
            additionalCountries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = country.name;
                countrySelect.appendChild(option);
            });
        }
    }

    // Initialize payment methods
    function initializePaymentMethods() {
        const paymentMethods = document.querySelector('.payment-methods');
        if (paymentMethods) {
            // Add cash on delivery option
            const codOption = document.createElement('label');
            codOption.className = 'payment-method';
            codOption.innerHTML = `
                <input type="radio" name="payment" value="cash-on-delivery">
                <i class="fas fa-money-bill-wave"></i> Cash on Delivery
            `;
            paymentMethods.appendChild(codOption);
        }
    }

    // Update payment details visibility based on selection
    function updatePaymentDetailsVisibility() {
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
        const paymentDetails = document.querySelectorAll('.payment-details');
        
        paymentDetails.forEach(detail => {
            detail.classList.remove('active');
        });
        
        if (paymentMethod === 'credit-card') {
            document.getElementById('credit-card-details').classList.add('active');
        }
    }

    // Handle seller button click based on user status
    function handleSellerButtonClick() {
        if (!currentUser) {
            showSuccessModal('Login Required', 'Please login first to become a seller.');
            toggleModal(loginModal);
            return;
        }
        
        if (currentUser.verifiedSeller) {
            toggleModal(sellerModal);
            return;
        }
        
        if (currentUser.sellerPending) {
            showSuccessModal('Pending Approval', 'Your seller application is being reviewed.');
            return;
        }
        
        showVerificationForm();
    }

    // Show verification form
   function showVerificationForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close-modal">&times;</span>
            <div class="verification-container">
                <div class="header">
                    <div class="logo">Mall<span>Hub</span></div>
                    <h1>Seller Verification Application</h1>
                    <p>Complete this form to become a verified seller on our platform</p>
                </div>
                
                <form class="verification-form" id="seller-verification-form">
                    <!-- Personal Information Section -->
                    <div class="form-section">
                        <div class="section-header">
                            <h2 class="section-title">Personal Information</h2>
                            <button type="button" class="manual-verification-btn" id="show-manual-verification">
                                <i class="fas fa-key"></i> Manual Verification
                            </button>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="full-name">Full Name</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-user input-icon"></i>
                                    <input type="text" id="full-name" placeholder="John Smith" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-envelope input-icon"></i>
                                    <input type="email" id="email" placeholder="john@example.com" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="phone">Phone Number</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-phone input-icon"></i>
                                    <input type="tel" id="phone" placeholder="+1 (555) 123-4567" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="business-name">Business Name</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-building input-icon"></i>
                                    <input type="text" id="business-name" placeholder="Your Business Name" required>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Business Details Section -->
                    <div class="form-section">
                        <h2 class="section-title">Business Details</h2>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="business-type">Business Type</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-store input-icon"></i>
                                    <select id="business-type" required>
                                        <option value="">Select Business Type</option>
                                        <option value="individual">Individual Seller</option>
                                        <option value="small">Small Business</option>
                                        <option value="medium">Medium Business</option>
                                        <option value="large">Large Enterprise</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="industry">Industry/Category</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-tag input-icon"></i>
                                    <select id="industry" required>
                                        <option value="">Select Industry</option>
                                        <option value="fashion">Fashion & Apparel</option>
                                        <option value="electronics">Electronics</option>
                                        <option value="home">Home & Garden</option>
                                        <option value="beauty">Beauty & Cosmetics</option>
                                        <option value="food">Food & Beverage</option>
                                        <option value="art">Art & Handmade</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="business-description">Business Description</label>
                                <textarea id="business-description" placeholder="Describe your business, products, and target audience..." required></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Social Media & Online Presence -->
                    <div class="form-section">
                        <h2 class="section-title">Online Presence</h2>
                        <div class="social-grid">
                            <div class="form-group">
                                <label for="instagram">Instagram Profile <i class="fab fa-instagram"></i></label>
                                <div class="input-with-icon">
                                    <i class="fas fa-link input-icon"></i>
                                    <input type="url" id="instagram" placeholder="https://instagram.com/yourprofile" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="facebook">Facebook Page <i class="fab fa-facebook"></i></label>
                                <div class="input-with-icon">
                                    <i class="fas fa-link input-icon"></i>
                                    <input type="url" id="facebook" placeholder="https://facebook.com/yourpage" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="website">Website/Online Shop</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-globe input-icon"></i>
                                    <input type="url" id="website" placeholder="https://your-online-store.com">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="other-social">Other Social Media</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-hashtag input-icon"></i>
                                    <input type="url" id="other-social" placeholder="TikTok, Twitter, Pinterest, etc.">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Additional Information -->
                    <div class="form-section">
                        <h2 class="section-title">Additional Information</h2>
                        <div class="form-group">
                            <label for="message">Message to MallHub <span class="optional-badge">Optional</span></label>
                            <textarea id="message" placeholder="Any additional information you'd like to share with our verification team..."></textarea>
                        </div>
                    </div>

                    <button type="submit" class="submit-btn">
                        <i class="fas fa-paper-plane"></i> Submit Verification Request
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Handle form submission
    modal.querySelector('#seller-verification-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('full-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const business = document.getElementById('business-name').value.trim();
        const businessType = document.getElementById('business-type').value;
        const industry = document.getElementById('industry').value;
        const description = document.getElementById('business-description').value.trim();
        const instagram = document.getElementById('instagram').value.trim();
        const facebook = document.getElementById('facebook').value.trim();
        const website = document.getElementById('website').value.trim();
        const otherSocial = document.getElementById('other-social').value.trim();
        const message = document.getElementById('message').value.trim();
        
        // Validate required fields
        if (!name || !email || !phone || !business || !businessType || !industry || !description || !instagram || !facebook) {
            showSuccessModal('Error', 'Please fill in all required fields');
            return;
        }
        
        // Submit the verification request
        const success = await submitVerificationRequest(
            name, email, phone, business, businessType, industry, 
            description, instagram, facebook, website, otherSocial, message
        );
        
        if (success) {
            document.body.removeChild(modal);
        }
    });
    
    // Add event listener to manual verification button
    modal.querySelector('#show-manual-verification').addEventListener('click', function() {
        // Close the current modal
        document.body.removeChild(modal);
        // Show the manual verification modal
        toggleModal(document.getElementById('manual-verification-modal'));
    });
}

    // Verify seller credentials
   // Verification function (unchanged, works well)
function verifySeller(email, code) {
    return verifiedSellers.some(seller => 
        seller.email.toLowerCase() === email.toLowerCase() && 
        seller.verificationCode === code
    );
}

// Improved verification request function
async function submitVerificationRequest(name, email, phone, business, businessType, industry, 
                                        description, instagram, facebook, website, otherSocial, message) {
    try {
        // Generate verification ID
        const verificationId = `VR-${Date.now()}`;
        
        // Create request object
        const request = {
            id: verificationId,
            date: new Date().toISOString(),
            name,
            email,
            phone,
            business,
            businessType,
            industry,
            description,
            instagram,
            facebook,
            website: website || "N/A",
            otherSocial: otherSocial || "N/A",
            message: message || "No additional message",
            status: "Pending",
            userId: currentUser?.id || null
        };
        
        // Save to Firebase
        await database.ref(`verificationRequests/${verificationId}`).set(request);
        
        // Format date for email
        const formattedDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Send email using EmailJS
        const templateParams = {
            to_email: "moetazmrabti@gmail.com", // Your admin email
            from_name: name,
            from_email: email,
            business_name: business,
            phone: phone,
            request_id: verificationId,
            date: formattedDate,
            business_type: businessType,
            industry: industry,
            description: description,
            instagram: instagram,
            facebook: facebook,
            website: website || "Not provided",
            other_social: otherSocial || "Not provided",
            message: message || "No additional message"
        };
        
        await emailjs.send(
            "service_2uee9rk", // Your EmailJS service ID
            "template_wed9a3m", // Your EmailJS template ID
            templateParams
        );
        
        // Show success message
        showSuccessModal(
            'Verification Submitted',
            `Your request (ID: ${verificationId}) has been received. Our team will review your application shortly.`
        );
        
        return true;
    } catch (error) {
        console.error('Verification submission failed:', error);
        
        let errorMessage = 'Failed to submit verification. Please try again.';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.text) {
            errorMessage = `Email sending failed: ${error.text}`;
        }
        
        showSuccessModal('Submission Error', errorMessage);
        return false;
    }
}
function updateSellerDashboardButton() {
    const sellerBtn = document.getElementById('seller-dashboard-btn');
    const navbar = document.querySelector('.navbar ul');
    const loginItem = document.querySelector('#login-btn').parentElement;
    
    if (currentUser && currentUser.verifiedSeller) {
        if (!sellerBtn) {
            const newSellerBtn = document.createElement('a');
            newSellerBtn.href = '#';
            newSellerBtn.id = 'seller-dashboard-btn';
            newSellerBtn.className = 'seller-nav-btn';
            newSellerBtn.innerHTML = '<i class="fas fa-store"></i> My Shop';
            newSellerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleModal(sellerModal);
            });
            
            const newListItem = document.createElement('li');
            newListItem.appendChild(newSellerBtn);
            navbar.insertBefore(newListItem, loginItem);
        }
    } else if (sellerBtn) {
        sellerBtn.closest('li').remove();
    }
}
    // Load verification requests (admin function)
    function loadVerificationRequests() {
        const requests = JSON.parse(localStorage.getItem('verificationRequests')) || [];
        return requests;
    }

    // Update seller button text based on status
    function updateSellerButton() {
        if (!becomeSellerBtn) return;
        
        if (!currentUser) {
            becomeSellerBtn.textContent = 'Become a Seller';
            return;
        }
        
        if (currentUser.verifiedSeller) {
            becomeSellerBtn.textContent = 'Seller Dashboard';
            showSellerDashboardButton();
            return;
        }
        
        if (currentUser.sellerPending) {
            becomeSellerBtn.textContent = 'Pending Approval';
            return;
        }
        
        becomeSellerBtn.textContent = 'Become a Seller';
    }

    // Show seller dashboard button in navbar
    function showSellerDashboardButton() {
        const existingBtn = document.getElementById('seller-dashboard-btn');
        if (existingBtn) return;
        
        const sellerBtn = document.createElement('a');
        sellerBtn.href = '#';
        sellerBtn.id = 'seller-dashboard-btn';
        sellerBtn.className = 'seller-nav-btn';
        sellerBtn.innerHTML = '<i class="fas fa-store"></i> My Shop';
        sellerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal(sellerModal);
        });
        
        const navbar = document.querySelector('.navbar ul');
        const loginItem = document.querySelector('#login-btn').parentElement;
        navbar.insertBefore(document.createElement('li'), loginItem).appendChild(sellerBtn);
    }

    // Switch between seller dashboard tabs
    function switchSellerTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        document.querySelectorAll('.seller-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate selected tab
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.seller-tabs .tab-btn[data-tab="${tabId}"]`).classList.add('active');
        
        // Load content if needed
        if (tabId === 'my-products') {
            loadSellerProducts();
        } else if (tabId === 'orders') {
            loadSellerOrders();
        } else if (tabId === 'shop-settings' && currentUser?.verifiedSeller) {
            populateShopSettings();
        }
    }

    // Populate shop settings form
    function populateShopSettings() {
        if (!currentUser?.verifiedSeller) return;
        
        document.getElementById('shop-name').value = currentUser.shopName || '';
        document.getElementById('shop-description').value = currentUser.shopDescription || '';
        document.getElementById('shop-url').value = currentUser.shopUrl || '';
        
        const logoPreview = document.getElementById('shop-logo-preview');
        logoPreview.innerHTML = '';
        if (currentUser.shopLogo) {
            const img = document.createElement('img');
            img.src = currentUser.shopLogo;
            logoPreview.appendChild(img);
        }
        
        const bannerPreview = document.getElementById('shop-banner-preview');
        bannerPreview.innerHTML = '';
        if (currentUser.shopBanner) {
            const img = document.createElement('img');
            img.src = currentUser.shopBanner;
            bannerPreview.appendChild(img);
        }
    }

    // ===== SHOP MANAGEMENT FUNCTIONS =====

// Save shop settings
async function saveShopSettings() {
  if (!currentUser?.verifiedSeller) return;
  
  const name = document.getElementById('shop-name').value;
  const description = document.getElementById('shop-description').value;
  const url = validateShopUrl(document.getElementById('shop-url').value);
  
  // Create shop object with user ID as key
  const shopData = {
    id: currentUser.id,
    owner: currentUser.id,
    name,
    url,
    description,
    ownerEmail: currentUser.email,
    verified: true,
    createdAt: new Date().toISOString(),
    totalSales: 0,
    totalRevenue: 0,
    totalCommission: 0
  };

  try {
    // Save shop under user ID
    await database.ref(`shops/${currentUser.id}`).set(shopData);
    
    // Update user record
    currentUser.shopName = name;
    currentUser.shopUrl = url;
    await saveUser(currentUser);
    
    showSuccessModal('Shop Updated', 'Your shop settings have been saved.');
  } catch (error) {
    console.error("Error saving shop:", error);
    showSuccessModal('Error', 'Failed to save shop settings');
  }
}
async function getShopByUserId(userId) {
  const snapshot = await database.ref(`shops/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
}
async function loadSellerProducts() {
  const productsList = document.getElementById('seller-products-list');
  productsList.innerHTML = '<p>Loading products...</p>';

  if (!currentUser?.verifiedSeller) {
    productsList.innerHTML = '<p>No seller account</p>';
    return;
  }

  try {
    const snapshot = await database.ref('products').once('value');
    const allProducts = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    // Properly filter by sellerId (using UID)
    const sellerProducts = allProducts.filter(p => p.sellerId === currentUser.id);

    if (sellerProducts.length === 0) {
      productsList.innerHTML = '<p>No products added yet.</p>';
      return;
    }

    productsList.innerHTML = '';

    sellerProducts.forEach(product => {
      const productItem = document.createElement('div');
      productItem.className = 'product-item';
      productItem.innerHTML = `
        <div class="product-header">
          <h4>${product.name}</h4>
          <span>$${product.price.toFixed(2)}</span>
        </div>
        <div class="product-details">
          <img src="${product.images?.[0] || 'https://placehold.co/300x300?text=No+Image'}" 
               alt="${product.name}">
          <div class="product-info">
            <p><strong>Category:</strong> ${product.category}</p>
            <p><strong>Rating:</strong> ${product.rating || 'Not rated'}</p>
            ${product.description ? `<p>${product.description}</p>` : ''}
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-edit edit-product" data-id="${product.id}">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger delete-product" data-id="${product.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      `;

      productsList.appendChild(productItem);
    });

    document.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = btn.getAttribute('data-id');
        editProduct(productId);
      });
    });

    document.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = btn.getAttribute('data-id');
        deleteProduct(productId);
      });
    });

  } catch (error) {
    console.error("Error loading products:", error);
    productsList.innerHTML = '<p>Error loading products. Please try again.</p>';
  }
}


    // Edit product
async function editProduct(productId) {
  try {
    const snapshot = await database.ref(`products/${productId}`).once('value');
    const product = snapshot.val();

    if (!product) {
      showSuccessModal('Error', 'Product not found');
      return;
    }

    switchSellerTab('add-product');
    const form = document.getElementById('add-product-form');
    form.reset();
    document.getElementById('image-preview').innerHTML = '';
    document.querySelector('.product-options').innerHTML = '';

    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-price').value = product.price || 0;
    document.getElementById('product-category').value = product.category || 'fashion';
    document.getElementById('product-description').value = product.description || '';

    if (product.options) {
      Object.entries(product.options).forEach(([name, values]) => {
        addProductOption(name, values.join(','));
      });
    }

    const preview = document.getElementById('image-preview');
    if (product.images && product.images.length > 0) {
      product.images.forEach(image => {
        const img = document.createElement('img');
        img.src = image;
        preview.appendChild(img);
      });
    }

    form.dataset.editId = productId;
    document.querySelector('#add-product-form button[type="submit"]').textContent = 'Update Product';

  } catch (error) {
    console.error("Error editing product:", error);
    showSuccessModal('Error', 'Failed to load product for editing');
  }
}


    // Delete product
async function deleteProduct(productId) {
  if (confirm('Are you sure you want to permanently delete this product?')) {
    try {
      await database.ref(`products/${productId}`).remove();

      const snapshot = await database.ref('products').once('value');
      products = snapshot.val() ? Object.values(snapshot.val()) : [];

      loadSellerProducts();
      renderProducts(products);
      showSuccessModal('Success', 'Product deleted successfully');
    } catch (error) {
      console.error("Error deleting product:", error);
      showSuccessModal('Error', 'Failed to delete product');
    }
  }
}


    // Load seller's orders
 async function loadSellerOrders() {
  const ordersList = document.querySelector('#orders .orders-list');
  ordersList.innerHTML = '<p>Loading orders...</p>';

  if (!currentUser?.verifiedSeller) {
    ordersList.innerHTML = '<p>No seller account</p>';
    return;
  }

  try {
    const snapshot = await database.ref('orders').once('value');
    const allOrders = snapshot.val() ? Object.values(snapshot.val()) : [];

    const sellerOrders = allOrders.filter(order => {
      return order.items && order.items.some(itemGroup => {
        return itemGroup.items && itemGroup.items.some(item => {
          return item.product && item.product.sellerId === currentUser.id;
        });
      });
    });

    if (sellerOrders.length === 0) {
      ordersList.innerHTML = '<p>No orders yet.</p>';
      return;
    }

    sellerOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    ordersList.innerHTML = '';

    sellerOrders.forEach(order => {
      const sellerItems = [];
      
      // Collect items belonging to this seller
      order.items.forEach(itemGroup => {
        if (itemGroup.items) {
          itemGroup.items.forEach(item => {
            if (item.product && item.product.sellerId === currentUser.id) {
              sellerItems.push(item);
            }
          });
        }
      });

      if (sellerItems.length === 0) return;

      const subtotal = sellerItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0);

      const orderCard = document.createElement('div');
      orderCard.className = 'order-card';
      orderCard.innerHTML = `
        <div class="order-header">
          <span>Order #${order.id}</span>
          <span>${new Date(order.date).toLocaleDateString()}</span>
        </div>
        <div class="customer-info">
          <p><strong>Customer:</strong> ${order.customer.name}</p>
          <p><strong>Email:</strong> ${order.customer.email}</p>
          <p><strong>Phone:</strong> ${order.customer.phone}</p>
          <p><strong>Address:</strong> ${order.customer.shippingAddress.address}</p>
          <p><strong>City:</strong> ${order.customer.shippingAddress.city}</p>
          <p><strong>ZIP Code:</strong> ${order.customer.shippingAddress.zip}</p>
          <p><strong>Country:</strong> ${order.customer.shippingAddress.country}</p>
          <p><strong>Status:</strong> <span class="status-${order.status.toLowerCase()}">${order.status}</span></p>
        </div>
        <div class="order-items">
          ${sellerItems.map(item => `
            <div class="order-item">
              <img src="${item.product.images[0]}" alt="${item.product.name}">
              <div class="item-details">
                <p class="item-name">${item.product.name}</p>
                <p class="item-quantity">Qty: ${item.quantity}</p>
                <p class="item-price">$${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="order-total">
          <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
        </div>
        <div class="order-actions">
          <button class="btn btn-small update-status" data-order="${order.id}">
            Update Status
          </button>
        </div>
      `;

      ordersList.appendChild(orderCard);

      orderCard.querySelector('.update-status').addEventListener('click', () => {
        updateOrderStatus(order.id);
      });
    });
  } catch (error) {
    console.error("Error loading orders:", error);
    ordersList.innerHTML = '<p>Error loading orders. Please try again.</p>';
  }
}

    // Update order status
    async function updateOrderStatus(orderId) {
  try {
    // Load fresh order data
    const snapshot = await database.ref(`orders/${orderId}`).once('value');
    const order = snapshot.val();
    
    if (!order) {
      showSuccessModal('Error', 'Order not found');
      return;
    }
    
    const statusOptions = [
      'Pending Payment',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <span class="close-modal">&times;</span>
        <h2>Update Order Status</h2>
        <p>Order #${orderId}</p>
        <div class="form-group">
          <label for="new-status">New Status</label>
          <select id="new-status" class="form-control">
            ${statusOptions.map(status => `
              <option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>
            `).join('')}
          </select>
        </div>
        <button id="confirm-status-update" class="btn btn-primary">Update</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Handle status update
    modal.querySelector('#confirm-status-update').addEventListener('click', async function() {
      const newStatus = document.getElementById('new-status').value;
      
      // Update order in Firebase
      await database.ref(`orders/${orderId}`).update({
        status: newStatus
      });
      
      // Update local orders array
      const ordersSnapshot = await database.ref('orders').once('value');
      orders = ordersSnapshot.val() ? Object.values(ordersSnapshot.val()) : [];
      
      showSuccessModal('Status Updated', `Order #${orderId} status has been updated to ${newStatus}.`);
      document.body.removeChild(modal);
      loadSellerOrders();
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    showSuccessModal('Error', 'Failed to update order status');
  }
}

    // Add product option
    function addProductOption(name = '', values = '') {
        const optionsContainer = document.querySelector('.product-options');
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.innerHTML = `
            <input type="text" placeholder="Option name (e.g., Size)" class="option-name" value="${name}">
            <input type="text" placeholder="Values (comma separated, e.g., S,M,L)" class="option-values" value="${values}">
            <button type="button" class="btn btn-small remove-option">Remove</button>
        `;
        optionsContainer.appendChild(optionItem);
        
        // Add event listener to remove button
        optionItem.querySelector('.remove-option').addEventListener('click', function() {
            optionsContainer.removeChild(optionItem);
        });
    }
async function addNewProduct() {
  const form = document.getElementById('add-product-form');
  const editId = form.dataset.editId;
  
  // Get form values
  const name = document.getElementById('product-name')?.value;
  const price = parseFloat(document.getElementById('product-price')?.value) || 0;
  const category = document.getElementById('product-category')?.value;
  const description = document.getElementById('product-description')?.value || '';
  const imageFiles = document.getElementById('product-images')?.files || [];

  // Validate required fields
  if (!name || !category || isNaN(price)) {
    showSuccessModal('Error', 'Please fill in all required fields');
    return;
  }
  
  // Get product options
  const options = {};
  document.querySelectorAll('.option-item').forEach(item => {
    const nameInput = item.querySelector('.option-name');
    const valuesInput = item.querySelector('.option-values');
    
    if (nameInput.value && valuesInput.value) {
      options[nameInput.value] = valuesInput.value.split(',').map(v => v.trim());
    }
  });
  
  // Handle images
  let images = [];
  if (imageFiles.length > 0) {
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file.size > 5 * 1024 * 1024) {
          showSuccessModal('Image Too Large', 'Please upload images smaller than 5MB');
          return;
        }
        
        const base64Image = await convertToBase64(file);
        images.push(base64Image);
      }
    } catch (error) {
      console.error("Image conversion failed:", error);
      images.push('https://placehold.co/300x300?text=Product+Image');
    }
  } else {
    images.push('https://placehold.co/300x300?text=Product+Image');
  }

  // Get shop info
  const shop = await getShopByUserId(currentUser.id);
  
  // Create product object
  const product = {
    id: editId || '',
    name,
    price,
    category,
    description,
    seller: shop ? shop.name : currentUser.name || currentUser.email,
    sellerId: currentUser.id, // Always use UID as sellerId
    shopUrl: shop ? shop.url : '',
    rating: 4.0,
    images,
    options,
    verifiedSeller: true
  };
  
  try {
    // Save product
    const savedProduct = await saveProduct(product);
    
    // Show success message
    showSuccessModal(
      editId ? 'Product Updated' : 'Product Added',
      `${name} has been ${editId ? 'updated' : 'added to your shop'}`
    );
    
    // Refresh data
    const snapshot = await database.ref('products').once('value');
    products = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    resetProductForm();
    loadSellerProducts();
    renderProducts(products);
  } catch (error) {
    console.error("Error saving product:", error);
    showSuccessModal('Error', 'Failed to save product. Please try again.');
  }
}
// Render products to the grid
function renderProducts(productsToRender) {
  const productGrid = document.getElementById('product-grid');
  productGrid.innerHTML = '';

  if (!productsToRender || !Array.isArray(productsToRender) || productsToRender.length === 0) {
    productGrid.innerHTML = '<p>No products found.</p>';
    return;
  }

  productsToRender.forEach((product) => {
    // Check if product is valid
    if (!product || !product.images || !product.images.length) {
      console.warn('Invalid product data:', product);
      return;
    }

    const productItem = document.createElement('div');
    productItem.className = 'product-card';

    // Use first image or placeholder if none exists
    const productImage = product.images[0] || 'https://placehold.co/300x300?text=No+Image';
    
    // Check if image is Base64 or URL
    let safeImageUrl;
    if (productImage.startsWith('data:image')) {
      safeImageUrl = productImage; // Use Base64 directly
    } else if (typeof productImage === 'string' && 
              (productImage.startsWith('http') || productImage.startsWith('https'))) {
      safeImageUrl = productImage; // Regular URL
    } else {
      safeImageUrl = 'https://placehold.co/300x300?text=No+Image';
    }
    
    productItem.innerHTML = `
      ${product.verifiedSeller ? '<span class="product-badge">Verified</span>' : ''}
      <img src="${safeImageUrl}" alt="${product.name || 'Product'}" class="product-image">
      <div class="product-info">
        <h3 class="product-title">${product.name || 'Unnamed Product'}</h3>
        <p class="product-seller">${product.seller || 'Unknown Seller'}</p>
        <p class="product-price">$${(product.price || 0).toFixed(2)}</p>
        <div class="product-rating">
          ${renderRatingStars(product.rating || 0)}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary view-details" data-id="${product.id || ''}">Details</button>
          <button class="btn btn-secondary buy-now" data-id="${product.id || ''}">Buy Now</button>
        </div>
      </div>
    `;

    productGrid.appendChild(productItem);
  });
}
    // Render rating stars
    function renderRatingStars(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    // Filter products based on selected filters
    function filterProducts() {
        const category = categoryFilter.value;
        const priceRange = priceFilter.value;
        
        let filteredProducts = products;
        
        // Filter by category
        if (category !== 'all') {
            filteredProducts = filteredProducts.filter(product => product.category === category);
        }
        
        // Filter by price
        if (priceRange !== 'all') {
            if (priceRange === '500+') {
                filteredProducts = filteredProducts.filter(product => product.price >= 500);
            } else {
                const [min, max] = priceRange.split('-').map(Number);
                filteredProducts = filteredProducts.filter(product => product.price >= min && product.price <= max);
            }
        }
        
        renderProducts(filteredProducts);
    }
    
    // Handle search functionality
    function handleSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            renderProducts(products);
            return;
        }
        
        // Search for shops
        const shopResults = Array.from(new Set(products.map(p => p.seller)))
            .filter(seller => seller.toLowerCase().includes(searchTerm));
        
        // Search for products
        const productResults = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) || 
            product.category.toLowerCase().includes(searchTerm)
        );
        
        // If we have shop results, show shop page for the first match
        if (shopResults.length > 0) {
            const shopId = products.find(p => p.seller === shopResults[0]).sellerId;
            showShopPage(shopId);
        } 
        // Otherwise show product results
        else if (productResults.length > 0) {
            renderProducts(productResults);
        } 
        // No results
        else {
            renderProducts([]);
        }
    }
    
    // View product details
 function viewProductDetails(productId) {
  const product = products.find(p => p.id == productId);
  if (!product) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  
  // Prepare safe image URLs
  const safeImages = product.images.map(img => {
    if (img.startsWith('data:image')) {
      return img; // Base64 image
    } else if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('https'))) {
      return img; // Regular URL
    } else {
      return 'https://placehold.co/300x300?text=No+Image';
    }
  });
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <span class="close-modal">&times;</span>
      <h2>${product.name}</h2>
      <div class="product-details">
        <div class="product-images" style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto;">
          ${safeImages.map(img => `
            <img src="${img}" alt="${product.name}" style="max-width: 150px; height: auto; border: 1px solid #ddd; border-radius: 5px;">
          `).join('')}
        </div>
        <p><strong>Seller:</strong> ${product.seller}</p>
        <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
        <p><strong>Rating:</strong> ${product.rating} ${renderRatingStars(product.rating)}</p>
        <p><strong>Description:</strong> ${product.description || 'No description available.'}</p>
        ${product.options && Object.keys(product.options).length > 0 ? `
          <div class="product-options">
            <h3>Options</h3>
            ${Object.entries(product.options).map(([name, values]) => `
              <p><strong>${name}:</strong> ${values.join(', ')}</p>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="product-actions" style="margin-top: 20px;">
        <button class="btn btn-primary add-to-cart-btn" data-id="${product.id}" style="width: 100%;">Add to Cart</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Close modal handlers
  modal.querySelector('.close-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
    document.body.style.overflow = 'auto';
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      document.body.style.overflow = 'auto';
    }
  });
  
  // Add to cart button
  modal.querySelector('.add-to-cart-btn').addEventListener('click', function() {
    if (product.options && Object.keys(product.options).length > 0) {
      showProductOptions(productId, 'cart');
    } else {
      addToCart(productId);
    }
    document.body.removeChild(modal);
    document.body.style.overflow = 'auto';
  });
}
    // Show product options modal
   function showProductOptions(productId, action) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    document.getElementById('options-product-name').textContent = product.name;
    const optionsForm = document.querySelector('.product-options-form');
    optionsForm.innerHTML = '';
    
    // Create option fields
    if (product.options && Object.keys(product.options).length > 0) {
        for (const [optionName, values] of Object.entries(product.options)) {
            const optionField = document.createElement('div');
            optionField.className = 'option-field';
            optionField.innerHTML = `
                <label>${optionName}</label>
                <select class="product-option" data-option="${optionName}">
                    ${values.map(value => `<option value="${value}">${value}</option>`).join('')}
                </select>
            `;
            optionsForm.appendChild(optionField);
        }
    } else {
        optionsForm.innerHTML = '<p>No options available for this product.</p>';
    }
    
    // Set up action buttons
    document.getElementById('add-to-cart-btn').onclick = function() {
        addToCart(productId);
        toggleModal(productOptionsModal);
    };
    
    document.getElementById('buy-now-btn').onclick = function() {
        addToCart(productId);
        toggleModal(productOptionsModal);
        toggleModal(checkoutModal);
        renderCheckout();
    };
    
    toggleModal(productOptionsModal);
}
    
    // Add product to cart
    // Update the addToCart function
async function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    // Get selected options
    const options = {};
    document.querySelectorAll('.product-option').forEach(select => {
        const optionName = select.getAttribute('data-option');
        options[optionName] = select.value;
    });
    
    // Check if product exists in cart
    const existingIndex = cart.findIndex(item => 
        item.product.id == productId && 
        JSON.stringify(item.options) == JSON.stringify(options)
    );
    
    if (existingIndex >= 0) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            product,
            options,
            quantity: 1
        });
    }
    
    // Save to Firebase if user is logged in
    if (currentUser) {
        await updateCart(currentUser.id, cart);
    }
    
    updateCartCount();
    showSuccessModal('Added to Cart', `${product.name} has been added to your cart.`);
}
    
    // Update cart count in navbar
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Render checkout page
    async function renderCheckout() {
  // Load fresh cart data from Firebase if user is logged in
  if (currentUser) {
    cart = await getCart(currentUser.id);
  }

  const productList = document.getElementById('checkout-product-list');
  const totalPriceElement = document.getElementById('checkout-total-price');
  
  productList.innerHTML = '';
  
  if (cart.length === 0) {
    productList.innerHTML = '<p>Your cart is empty</p>';
    totalPriceElement.textContent = '$0.00';
    return;
  }

  let totalPrice = 0;
  
  cart.forEach((item, index) => {
    const productItem = document.createElement('div');
    productItem.className = 'checkout-product-item';
    
    const optionsText = item.options && Object.keys(item.options).length > 0 
      ? Object.entries(item.options)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : '';

    productItem.innerHTML = `
      <img src="${item.product.images[0]}" alt="${item.product.name}" class="checkout-product-image">
      <div class="checkout-product-info">
        <h4 class="checkout-product-title">${item.product.name}</h4>
        ${optionsText ? `<p class="checkout-product-options">${optionsText}</p>` : ''}
        <p class="checkout-product-quantity">Qty: ${item.quantity}</p>
        <p class="checkout-product-price">$${(item.product.price * item.quantity).toFixed(2)}</p>
      </div>
      <button class="remove-item-btn" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    productList.appendChild(productItem);
    totalPrice += item.product.price * item.quantity;
  });
  
  totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      removeFromCart(index);
    });
  });
}   
    // Process checkout
  async function processCheckout() {
  // 1. Get form data
  const name = document.getElementById("checkout-name").value.trim();
  const email = document.getElementById("checkout-email").value.trim();
  const phone = document.getElementById("checkout-phone").value.trim();
  const address = document.getElementById("checkout-address").value.trim();
  const city = document.getElementById("checkout-city").value.trim();
  const zip = document.getElementById("checkout-zip").value.trim();
  const country = document.getElementById("checkout-country").value;
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
  
  // 2. Validate
  if (!name || !email || !phone || !address || !city || !zip || !country || !paymentMethod) {
    showSuccessModal('Error', 'Please complete all required fields.');
    return;
  }
  
  // 3. Create order
  const newOrder = {
    id: `ORD-${Date.now()}`,
    date: new Date().toISOString(),
    customer: { 
      name, 
      email,
      phone,
      shippingAddress: { 
        address,
        city,
        zip,
        country
      }
    },
    items: [],
    paymentMethod,
    status: paymentMethod === 'cash-on-delivery' ? 'Pending Payment' : 'Processing',
    total: 0
  };
  
  // Group items by shop
  const shopGroups = {};
  
  cart.forEach(item => {
    const shopId = item.product.sellerId;
    if (!shopGroups[shopId]) {
      shopGroups[shopId] = [];
    }
    shopGroups[shopId].push(item);
  });
  
  // Create order items for each shop
  for (const [shopId, items] of Object.entries(shopGroups)) {
    const shopTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    newOrder.items.push({
      shopId,
      items: items.map(item => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          images: item.product.images,
          seller: item.product.seller,
          sellerId: item.product.sellerId
        },
        options: item.options,
        quantity: item.quantity
      })),
      subtotal: shopTotal
    });
    
    newOrder.total += shopTotal;
  }
  
  // 4. Save to Firebase
  await database.ref(`orders/${newOrder.id}`).set(newOrder);
  
  // 5. Track sales for each shop
  await trackSale(newOrder);

  // 6. Clear cart
  cart = [];
  if (currentUser) {
    await updateCart(currentUser.id, []);
  }
  
  updateCartCount();
  
  // 7. Show confirmation
  showSuccessModal(
    'Order Confirmed!', 
    `Your order #${newOrder.id} has been placed successfully. 
     You'll receive a confirmation email shortly.`
  );
  toggleModal(checkoutModal);
}

    // Toggle modal visibility
    function toggleModal(modal) {
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        } else {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Toggle between login and register forms
    function toggleLoginRegister(e) {
        e.preventDefault();
        loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
        registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
    }
    
    // Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const user = await getUserByEmail(email);

  if (!user || user.password !== password) {
    showSuccessModal('Login Failed', 'Incorrect email or password');
    return;
  }

  currentUser = user;

  // Check if this is an admin user
  if (currentUser.email === 'moetazmrabti@gmail.com' || currentUser.isAdmin) {
    currentUser.isAdmin = true;
    showAdminButtons();
  }

  // NEW: Update seller dashboard button
  updateSellerDashboardButton();

  showSuccessModal('Welcome', `Hello, ${user.name}`);
  toggleModal(loginModal);
  loginBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.name}`;
  updateSellerButton();

  // Load user's cart
  cart = await getCart(currentUser.id);
  updateCartCount();
}

    // Handle registration
    async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const wantsToBeSeller = document.getElementById('register-seller').checked;
  
  if (!name || !email || !password || !confirmPassword) {
    showSuccessModal('Error', 'Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    showSuccessModal('Error', 'Passwords do not match');
    return;
  }
  
  // Check if email exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    showSuccessModal('Error', 'Email already registered');
    return;
  }
  
  // Create new user
  const newUser = {
    id: '', // Will be set by Firebase
    name,
    email,
    password,
    isSeller: wantsToBeSeller,
    verifiedSeller: false,
    sellerPending: false
  };
  
  currentUser = await saveUser(newUser);
  
  if (wantsToBeSeller) {
    showSuccessModal('Registration Complete', `Welcome to MallHub, ${name}! You can now request seller verification.`);
  } else {
    showSuccessModal('Registration Successful', `Welcome to MallHub, ${name}!`);
  }
  
  toggleModal(loginModal);
  loginBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.name}`;
  updateSellerButton();
  registerForm.reset();
}
    
    // Show success modal
    function showSuccessModal(title, message) {
        document.getElementById('success-title').textContent = title;
        document.getElementById('success-message').textContent = message;
        
        const okBtn = document.getElementById('success-ok-btn');
        okBtn.onclick = function() {
            toggleModal(successModal);
        };
        
        toggleModal(successModal);
    }
function resetProductForm() {
    const form = document.getElementById('add-product-form');
    form.reset();
    form.removeAttribute('data-edit-id');
    document.querySelector('#add-product-form button[type="submit"]').textContent = 'Add Product';
    document.getElementById('image-preview').innerHTML = '';
    document.querySelector('.product-options').innerHTML = '';
}
    // Show shop page
    function showShopPage(shopId) {
        // Get shop data
        const shop = shops.find(s => s.url === shopId) || 
                    products.find(p => p.sellerId === shopId);
        
        if (!shop) {
            showSuccessModal('Shop Not Found', 'The requested shop could not be found.');
            return;
        }
        
        currentShop = shop;
        
        // Update shop header
        shopHeader.innerHTML = `
            <div class="shop-banner" style="background-image: url(${shop.banner || 'https://via.placeholder.com/1200x300?text=Shop+Banner'});">
                <div class="shop-info">
                    <img src="${shop.logo || 'https://via.placeholder.com/100x100?text=Logo'}" alt="${shop.name}" class="shop-logo">
                    <div>
                        <h1>${shop.name}</h1>
                        <p>${shop.description || 'No description available'}</p>
                        <div class="shop-rating">
                            ${renderRatingStars(shop.rating || 4.5)}
                            <span>(${shop.rating || 4.5})</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Get shop products
        const shopProducts = products.filter(p => p.sellerId === shopId);
        
        // Render shop products
        shopProductsGrid.innerHTML = '';
        
        if (shopProducts.length === 0) {
            shopProductsGrid.innerHTML = '<p class="no-products">This shop has no products yet.</p>';
        } else {
            shopProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                
                productCard.innerHTML = `
                    <img src="${product.images[0]}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-price">$${product.price.toFixed(2)}</div>
                        <div class="product-rating">
                            ${renderRatingStars(product.rating)}
                            <span>(${product.rating})</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary view-details" data-id="${product.id}">Details</button>
                            <button class="btn btn-primary buy-now" data-id="${product.id}">Buy Now</button>
                        </div>
                    </div>
                `;
                
                shopProductsGrid.appendChild(productCard);
            });
        }
        
        // Add event listeners to product buttons
        shopProductsGrid.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                viewProductDetails(productId);
            });
        });
        
        shopProductsGrid.querySelectorAll('.buy-now').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                showProductOptions(productId, 'buy');
            });
        });
        
        // Show shop page
        document.querySelector('.main-content').classList.remove('active');
        shopPage.classList.add('active');
    }
   // Add these functions to the JS file

function showShopPage(shopId) {
    // Hide main content
    document.querySelector('.main-content').classList.remove('active');
    shopPage.classList.add('active');
    renderShopPage(shopId);
}
function renderShopPage(shopId) {
    // Get shop data
    const shop = shops.find(s => s.url === shopId) || 
                products.find(p => p.sellerId === shopId);
    
    if (!shop) {
        showSuccessModal('Shop Not Found', 'The requested shop could not be found.');
        return;
    }
    
    // Update shop header
    shopHeader.innerHTML = `
        <div class="shop-banner" style="background-image: url(${shop.banner || 'https://via.placeholder.com/1200x300?text=Shop+Banner'});">
            <div class="shop-info">
                <img src="${shop.logo || 'https://via.placeholder.com/100x100?text=Logo'}" alt="${shop.name}" class="shop-logo">
                <div>
                    <h1>${shop.name}</h1>
                    <p>${shop.description || 'No description available'}</p>
                    <div class="shop-rating">
                        ${renderRatingStars(shop.rating || 4.5)}
                        <span>(${shop.rating || 4.5})</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Get shop products
    const shopProducts = products.filter(p => p.sellerId === shopId);
    
    // Render shop products
    shopProductsGrid.innerHTML = '';
    
    if (shopProducts.length === 0) {
        shopProductsGrid.innerHTML = '<p class="no-products">This shop has no products yet.</p>';
    } else {
        shopProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <img src="${product.images[0]}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <div class="product-rating">
                        ${renderRatingStars(product.rating)}
                        <span>(${product.rating})</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-secondary view-details" data-id="${product.id}">Details</button>
                        <button class="btn btn-primary buy-now" data-id="${product.id}">Buy Now</button>
                    </div>
                </div>
            `;
            
            shopProductsGrid.appendChild(productCard);
        });
    }
    
    // Add event listeners to product buttons
    shopProductsGrid.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            viewProductDetails(productId);
        });
    });
    
    shopProductsGrid.querySelectorAll('.buy-now').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            showProductOptions(productId, 'buy');
        });
    });
}

// Add shop link event listeners in renderProducts
document.querySelectorAll('.shop-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const shopId = this.getAttribute('data-shop');
        showShopPage(shopId);
    });
});
async function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const productName = cart[index].product.name;
        cart.splice(index, 1);
        
        // Update Firebase instead of localStorage
        if (currentUser) {
            await updateCart(currentUser.id, cart);
        }
        
        updateCartCount();
        renderCheckout();
        showSuccessModal('Item Removed', `${productName} has been removed from your cart.`);
    }
}
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Add this function to website.js
async function saveShop(shop) {
  const shopRef = shop.id 
    ? database.ref(`shops/${shop.id}`) 
    : database.ref('shops').push();
  
  if (!shop.id) shop.id = shopRef.key;
  
  await shopRef.set(shop);
  return shop;
}
// Initialize the app
    init();
  const db = firebase.database();    
});