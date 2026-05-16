const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../proto/kitchen.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

// Setup SQLite database
const db = new sqlite3.Database('./kitchen.db');

// Implement the gRPC methods
const kitchenService = {
    // Get current kitchen queue
    GetQueue: async (call, callback) => {
        const { restaurant_id } = call.request;
        
        db.all(
            'SELECT * FROM kitchen_queue WHERE status IN ("pending", "preparing") ORDER BY received_at ASC',
            (err, rows) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    const orders = rows.map(row => ({
                        order_id: row.order_id,
                        items_json: row.items_json,
                        received_at: row.received_at,
                        status: row.status,
                        chef_name: row.chef_name || 'unassigned'
                    }));
                    callback(null, { orders });
                }
            }
        );
    },

    // Add order to kitchen queue (will be called by Kafka consumer)
    AddToQueue: async (orderData) => {
        const { order_id, items_json, received_at } = orderData;
        
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO kitchen_queue (order_id, items_json, status, received_at) 
                 VALUES (?, ?, ?, ?)`,
                [order_id, items_json, 'pending', received_at],
                (err) => {
                    if (err) {
                        console.error('Error adding to queue:', err);
                        reject(err);
                    } else {
                        console.log(`✅ Order ${order_id} added to kitchen queue`);
                        resolve(true);
                    }
                }
            );
        });
    },

    // Update preparation status
    UpdatePreparationStatus: async (call, callback) => {
        const { order_id, status, chef_name } = call.request;
        
        db.run(
            'UPDATE kitchen_queue SET status = ?, chef_name = ? WHERE order_id = ?',
            [status, chef_name, order_id],
            (err) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    callback(null, { 
                        success: true, 
                        message: `Order ${order_id} status updated to ${status}` 
                    });
                }
            }
        );
    },

    // Get specific order from queue
    GetOrderFromQueue: async (call, callback) => {
        const { order_id } = call.request;
        
        db.get('SELECT * FROM kitchen_queue WHERE order_id = ?', [order_id], (err, row) => {
            if (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            } else if (!row) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Order not found in queue' });
            } else {
                callback(null, {
                    order_id: row.order_id,
                    status: row.status,
                    started_at: row.received_at,
                    completed_at: row.status === 'ready' ? new Date().toISOString() : ''
                });
            }
        });
    }
};

// Start gRPC server
function main() {
    const server = new grpc.Server();
    server.addService(proto.KitchenService.service, kitchenService);
    
    const port = 50053;
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error('Failed to start server:', err);
            return;
        }
        console.log(`✅ Kitchen Service running on port ${port}`);
        console.log(`   gRPC server ready for kitchen operations`);
    });
}

// Export for Kafka consumer
module.exports = { kitchenService, db };

main();