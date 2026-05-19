const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { startConsumer } = require('./kafka/consumer');

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
    GetKitchenQueue: async (call, callback) => {
        console.log('📢 GetKitchenQueue appelé');

        db.all(
            `SELECT order_id, items_json, status, received_at, ready_at, chef_name 
             FROM kitchen_queue 
             ORDER BY received_at ASC`,
            (err, rows) => {
                if (err) {
                    console.error('❌ Erreur DB:', err);
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    const orders = rows.map(row => ({
                        order_id: row.order_id,
                        items_json: row.items_json,
                        received_at: row.received_at,
                        status: row.status,
                        chef_name: row.chef_name || ''
                    }));
                    console.log(`✅ ${orders.length} commandes en file`);
                    callback(null, { orders });
                }
            }
        );
    },

    // Mark order as ready
    MarkOrderReady: async (call, callback) => {
        const { order_id } = call.request;
        console.log('📢 MarkOrderReady pour:', order_id);

        db.run(
            `UPDATE kitchen_queue 
             SET status = ?, ready_at = ? 
             WHERE order_id = ?`,
            ['ready', new Date().toISOString(), order_id],
            function (err) {
                if (err) {
                    console.error('❌ Erreur update:', err);
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else if (this.changes === 0) {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Order not found' });
                } else {
                    console.log(`✅ Commande ${order_id} marquée prête`);
                    callback(null, {
                        success: true,
                        message: `Order ${order_id} marked as ready`
                    });
                }
            }
        );
    },

    // Get order status from kitchen
    GetOrderStatus: async (call, callback) => {
        const { order_id } = call.request;
        console.log('📢 GetOrderStatus pour:', order_id);

        db.get(
            'SELECT status, ready_at FROM kitchen_queue WHERE order_id = ?',
            [order_id],
            (err, row) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else if (!row) {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Order not found in queue' });
                } else {
                    callback(null, {
                        order_id: order_id,
                        status: row.status,
                        ready_at: row.ready_at || ''
                    });
                }
            }
        );
    },

    // Add order to queue (called by Kafka consumer)
    AddToQueue: async (orderData) => {
        const { order_id, items_json, received_at } = orderData;

        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO kitchen_queue (order_id, items_json, received_at) 
                 VALUES (?, ?, ?)`,
                [order_id, items_json, received_at || new Date().toISOString()],
                (err) => {
                    if (err) {
                        console.error('❌ Erreur ajout file:', err);
                        reject(err);
                    } else {
                        console.log(`✅ Commande ${order_id} ajoutée à la file cuisine`);
                        resolve(true);
                    }
                }
            );
        });
    },

    // Add kitchen staff
    AddKitchenStaff: async (call, callback) => {
        const { name, role } = call.request;
        console.log('📢 Ajout personnel:', name, role);

        db.run(
            'INSERT INTO kitchen_staff (name, role) VALUES (?, ?)',
            [name, role],
            function (err) {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    callback(null, {
                        id: this.lastID,
                        name: name,
                        role: role,
                        success: true
                    });
                }
            }
        );
    }
};

// Start gRPC server
 async function main() {
    await startConsumer();
    const server = new grpc.Server();
    server.addService(proto.kitchen.KitchenService.service, kitchenService);

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

main();

module.exports = { kitchenService, db };