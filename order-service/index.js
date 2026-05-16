const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../proto/order.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

// Setup SQLite database
const db = new sqlite3.Database('./orders.db');

// Helper function to calculate total price
function calculateTotalPrice(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Implement the gRPC methods
const orderService = {
    // Create a new order
    CreateOrder: async (call, callback) => {
        const { restaurant_id, customer_name, customer_phone, items } = call.request;
        const id = uuidv4();
        const created_at = new Date().toISOString();
        const total_price = calculateTotalPrice(items);
        const status = 'pending';
        const items_json = JSON.stringify(items);

        db.run(
            `INSERT INTO orders (id, restaurant_id, customer_name, customer_phone, 
             items_json, total_price, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, restaurant_id, customer_name, customer_phone, items_json, total_price, status, created_at],
            (err) => {
                if (err) {
                    console.error('Database error:', err);
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    callback(null, {
                        id,
                        restaurant_id,
                        customer_name,
                        status,
                        total_price,
                        created_at,
                        items
                    });
                }
            }
        );
    },

    // Get order by ID
    GetOrder: async (call, callback) => {
        const { id } = call.request;
        
        db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
            if (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            } else if (!row) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Order not found' });
            } else {
                const items = JSON.parse(row.items_json);
                callback(null, {
                    id: row.id,
                    restaurant_id: row.restaurant_id,
                    customer_name: row.customer_name,
                    status: row.status,
                    total_price: row.total_price,
                    created_at: row.created_at,
                    items: items
                });
            }
        });
    },

    // Update order status
    UpdateOrderStatus: async (call, callback) => {
        const { id, status } = call.request;
        
        db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
            if (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
                return;
            }
            if (!row) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Order not found' });
                return;
            }

            db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], (updateErr) => {
                if (updateErr) {
                    callback({ code: grpc.status.INTERNAL, message: updateErr.message });
                } else {
                    const items = JSON.parse(row.items_json);
                    callback(null, {
                        id: row.id,
                        restaurant_id: row.restaurant_id,
                        customer_name: row.customer_name,
                        status: status,
                        total_price: row.total_price,
                        created_at: row.created_at,
                        items: items
                    });
                }
            });
        });
    },

    // Get all orders for a restaurant
    GetOrdersByRestaurant: async (call, callback) => {
        const { restaurant_id } = call.request;
        
        db.all('SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC', 
            [restaurant_id], 
            (err, rows) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    const orders = rows.map(row => ({
                        id: row.id,
                        restaurant_id: row.restaurant_id,
                        customer_name: row.customer_name,
                        status: row.status,
                        total_price: row.total_price,
                        created_at: row.created_at,
                        items: JSON.parse(row.items_json)
                    }));
                    callback(null, { orders });
                }
            }
        );
    }
};

// Start gRPC server
function main() {
    const server = new grpc.Server();
    server.addService(proto.OrderService.service, orderService);
    
    const port = 50052;
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error('Failed to start server:', err);
            return;
        }
        console.log(`✅ Order Service running on port ${port}`);
        console.log(`   gRPC server ready for order operations`);
    });
}

main();