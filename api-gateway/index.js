const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const cors = require('cors');
require('dotenv').config();

  

// Import gRPC clients
const restaurantClient = require('./src/grpc-clients/restaurantClient');
const orderClient = require('./src/grpc-clients/orderClient');
const kitchenClient = require('./src/grpc-clients/kitchenClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/test-id/:id', (req, res) => {
    console.log('📢 Test ID - ID reçu:', req.params.id);
    console.log('📢 Test ID - Longueur:', req.params.id.length);
    res.json({
        receivedId: req.params.id,
        length: req.params.id.length,
        type: typeof req.params.id
    });
});
// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'API Gateway', timestamp: new Date() });
});

// ========== REST ENDPOINTS ==========

// GET /api/menu
app.get('/api/menu', async (req, res) => {
    console.log('📢 GET /api/menu appelé');
    try {
        const result = await restaurantClient.getMenu();
        res.json(result.items || []);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Restaurant endpoints
app.post('/api/restaurants', async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const result = await restaurantClient.createRestaurant({ name, address, phone });
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/restaurants/:id', async (req, res) => {
    console.log('📢 GET /api/restaurants/:id - ID reçu:', req.params.id);
    console.log('📢 Type de ID:', typeof req.params.id);
    try {
        const result = await restaurantClient.getRestaurant(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        res.status(404).json({ error: error.message });
    }
});;

app.get('/api/restaurants/:id/menu', async (req, res) => {
    try {
        const result = await restaurantClient.getMenu();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/restaurants/:id/menu', async (req, res) => {
    try {
        const { name, price, category, description } = req.body;
        const result = await restaurantClient.addMenuItem({
            restaurant_id: parseInt(req.params.id),
            name,
            price,
            category,
            description
        });
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// POST - Créer une commande (avec les nouveaux champs)
app.post('/api/orders', async (req, res) => {
    console.log('📢 POST /api/orders appelé');
    console.log('📢 Body reçu:', req.body);

    try {
        const { restaurant_id, customer_name, customer_phone, items } = req.body;

        // Validation des champs requis
        if (!restaurant_id || !customer_name || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Champs requis: restaurant_id, customer_name, items'
            });
        }

        const result = await orderClient.createOrder({
            restaurant_id,
            customer_name,
            customer_phone: customer_phone || '',
            items
        });

        console.log('✅ Commande créée:', result.id);
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ Erreur createOrder:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET - Toutes les commandes
app.get('/api/orders', async (req, res) => {
    try {
        const { restaurant_id } = req.query;

        if (restaurant_id) {
            const result = await orderClient.getOrdersByRestaurant(restaurant_id);
            res.json(result.orders || []);
        } else {
            // Si pas de restaurant_id, retourner un tableau vide ou toutes les commandes
            const result = await orderClient.listOrders();
            res.json(result.orders || []);
        }
    } catch (error) {
        console.error('❌ Erreur GET /api/orders:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET - Une commande spécifique
app.get('/api/orders/:id', async (req, res) => {
    try {
        const result = await orderClient.getOrder(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// PUT - Changer le statut
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const result = await orderClient.updateOrderStatus(req.params.id, status);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kitchen endpoints
app.get('/api/kitchen/queue', async (req, res) => {
    try {
        const result = await kitchenClient.getKitchenQueue();
        res.json(result.orders || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/kitchen/ready/:orderId', async (req, res) => {
    try {
        const result = await kitchenClient.markOrderReady(req.params.orderId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/kitchen/staff', async (req, res) => {
    try {
        const { name, role } = req.body;
        const result = await kitchenClient.addKitchenStaff(name, role);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const result = await orderClient.getStats();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tables endpoint
app.put('/api/tables/:number', async (req, res) => {
    try {
        const { available } = req.body;
        const result = await restaurantClient.updateTableStatus(parseInt(req.params.number), available);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ========== GRAPHQL SCHEMA ==========

const schema = buildSchema(`
    type Restaurant {
        id: ID!
        name: String!
        address: String!
        phone: String!
        created_at: String
    }
    
    type MenuItem {
        id: ID!
        name: String!
        price: Float!
        category: String!
        description: String
        available: Boolean
    }
    
    type OrderItem {
        menu_item_id: String!
        quantity: Int!
        price: Float!
        name: String!
    }
    
    type Order {
        id: ID!
        restaurant_id: String!
        customer_name: String!
        customer_phone: String
        status: String!
        total_price: Float!
        created_at: String!
        items: [OrderItem!]!
    }
    
    type KitchenQueueItem {
        order_id: ID!
        table_number: Int!
        items: String!
        status: String!
        received_at: String!
    }
    
    type Stats {
        total_orders: Int!
        pending_orders: Int!
        database_type: String!
    }
    
    type Query {
        getRestaurant(id: ID!): Restaurant
        getMenu: [MenuItem!]!
        getOrder(id: ID!): Order
        listOrders(status: String): [Order!]!
        getKitchenQueue: [KitchenQueueItem!]!
        getStats: Stats!
    }
    
    type Mutation {
        createRestaurant(name: String!, address: String!, phone: String!): Restaurant
        addMenuItem(restaurant_id: ID!, name: String!, price: Float!, category: String!): MenuItem
        createOrder(restaurant_id: String!, customer_name: String!, customer_phone: String, items: [OrderItemInput!]!): Order
        updateOrderStatus(id: ID!, status: String!): Order
        updateTableStatus(table_number: Int!, available: Boolean!): TableResponse
        markOrderReady(orderId: ID!): ReadyResponse
    }
    
    input OrderItemInput {
        menu_item_id: String!
        quantity: Int!
        price: Float!
        name: String!
    }
    
    type TableResponse {
        success: Boolean!
        message: String!
    }
    
    type ReadyResponse {
        success: Boolean!
        message: String!
    }
`);

// GraphQL Resolvers
const root = {
    // Queries
    getRestaurant: async ({ id }) => {
        return await restaurantClient.getRestaurant(parseInt(id));
    },
    getMenu: async () => {
        const result = await restaurantClient.getMenu();
        return result.items || [];
    },
    getOrder: async ({ id }) => {
        return await orderClient.getOrder(id);
    },
    listOrders: async ({ status }) => {
        if (status) {
            const result = await orderClient.listOrders();
            const orders = result.orders || [];
            return orders.filter(o => o.status === status);
        }
        const result = await orderClient.listOrders();
        return result.orders || [];
    },
    getKitchenQueue: async () => {
        const result = await kitchenClient.getKitchenQueue();
        return result.orders || [];
    },
    getStats: async () => {
        return await orderClient.getStats();
    },

    // Mutations
    createRestaurant: async ({ name, address, phone }) => {
        return await restaurantClient.createRestaurant({ name, address, phone });
    },
    addMenuItem: async ({ restaurant_id, name, price, category }) => {
        return await restaurantClient.addMenuItem({
            restaurant_id: parseInt(restaurant_id),
            name,
            price,
            category
        });
    },
    createOrder: async ({ restaurant_id, customer_name, customer_phone, items }) => {
        return await orderClient.createOrder({
            restaurant_id,
            customer_name,
            customer_phone: customer_phone || '',
            items
        });
    },
    updateOrderStatus: async ({ id, status }) => {
        return await orderClient.updateOrderStatus(id, status);
    },
    updateTableStatus: async ({ table_number, available }) => {
        return await restaurantClient.updateTableStatus(table_number, available);
    },
    markOrderReady: async ({ orderId }) => {
        return await kitchenClient.markOrderReady(orderId);
    }
};

// GraphQL endpoint
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`✅ API Gateway running on http://localhost:${PORT}`);
    console.log(`📡 REST endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🎯 GraphQL playground at http://localhost:${PORT}/graphql`);
    console.log(`💚 Health check at http://localhost:${PORT}/health`);
});