const { createRxDatabase, addRxPlugin } = require('rxdb');
const { RxDBDevModePlugin } = require('rxdb/plugins/dev-mode');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { RxDBQueryBuilderPlugin } = require('rxdb/plugins/query-builder');

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

let db = null;

// Schéma pour les commandes (aligné avec le proto)
const orderSchema = {
    title: 'order schema',
    version: 0,
    description: 'Collection des commandes',
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        restaurant_id: {
            type: 'string'
        },
        customer_name: {
            type: 'string'
        },
        customer_phone: {
            type: 'string'
        },
        total_price: {
            type: 'number',
            minimum: 0
        },
        status: {
            type: 'string',
            enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
            default: 'pending'
        },
        created_at: {
            type: 'string',
            format: 'date-time'
        },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    menu_item_id: { type: 'string' },
                    quantity: { type: 'integer' },
                    price: { type: 'number' },
                    name: { type: 'string' }
                }
            }
        }
    },
    required: ['id', 'restaurant_id', 'customer_name', 'total_price', 'status', 'created_at', 'items']
};

// Initialisation
async function initRxDatabase() {
    if (db) return db;

    console.log('📦 Initialisation RxDB...');

    db = await createRxDatabase({
        name: 'ordersdb',
        storage: getRxStorageMemory(),
        ignoreDuplicate: true
    });

    await db.addCollections({
        orders: {
            schema: orderSchema
        }
    });

    console.log('✅ RxDB initialisée avec succès');

    const count = await db.orders.count().exec();
    if (count === 0) {
        await db.orders.insert({
            id: 'test-001',
            restaurant_id: '1',
            customer_name: 'Client Test',
            customer_phone: '+216 55 123 456',
            table_number: 1,
            total_price: 25.98,
            status: 'pending',
            created_at: new Date().toISOString(),
            items: [
                { menu_item_id: '1', quantity: 2, price: 12.99, name: 'Pizza Margherita' }
            ]
        });
        console.log('✅ Données test RxDB insérées');
    }

    return db;
}

// CRUD Operations
async function createOrder(orderData) {
    const db = await initRxDatabase();
    const order = await db.orders.insert(orderData);
    return order.toJSON();
}

async function getOrder(orderId) {
    const db = await initRxDatabase();
    const order = await db.orders.findOne({ selector: { id: orderId } }).exec();
    return order ? order.toJSON() : null;
}

async function updateOrderStatus(orderId, newStatus) {
    const db = await initRxDatabase();
    const order = await db.orders.findOne({ selector: { id: orderId } }).exec();
    if (!order) throw new Error('Commande non trouvée');
    const updated = await order.patch({ status: newStatus });
    return updated.toJSON();
}

async function listOrders() {
    const db = await initRxDatabase();
    const orders = await db.orders.find().sort({ created_at: 'desc' }).exec();
    return orders.map(o => o.toJSON());
}

async function getOrdersByRestaurant(restaurant_id) {
    const db = await initRxDatabase();
    const orders = await db.orders.find({
        selector: { restaurant_id: restaurant_id }
    }).sort({ created_at: 'desc' }).exec();
    return orders.map(o => o.toJSON());
}

module.exports = {
    initRxDatabase,
    createOrder,
    getOrder,
    updateOrderStatus,
    listOrders,
    getOrdersByRestaurant
};