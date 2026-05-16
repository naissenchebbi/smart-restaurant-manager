const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../proto/restaurant.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

// Setup SQLite database
const db = new sqlite3.Database('./restaurant.db');

// Implement the gRPC methods
const restaurantService = {
    // Get restaurant by ID
    GetRestaurant: async (call, callback) => {
        const { id } = call.request;
        db.get('SELECT * FROM restaurants WHERE id = ?', [id], (err, row) => {
            if (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            } else if (!row) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Restaurant not found' });
            } else {
                callback(null, row);
            }
        });
    },

    // Create new restaurant
    CreateRestaurant: async (call, callback) => {
        const { name, address, phone } = call.request;
        const id = uuidv4();
        
        db.run(
            'INSERT INTO restaurants (id, name, address, phone) VALUES (?, ?, ?, ?)',
            [id, name, address, phone],
            (err) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    callback(null, { id, name, address, phone });
                }
            }
        );
    },

    // Get menu for a restaurant
    GetMenu: async (call, callback) => {
        const { restaurant_id } = call.request;
        db.all('SELECT * FROM menu_items WHERE restaurant_id = ?', [restaurant_id], (err, rows) => {
            if (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            } else {
                callback(null, { items: rows });
            }
        });
    },

    // Add menu item
    AddMenuItem: async (call, callback) => {
        const { restaurant_id, name, price, category } = call.request;
        const id = uuidv4();
        
        db.run(
            'INSERT INTO menu_items (id, restaurant_id, name, price, category) VALUES (?, ?, ?, ?, ?)',
            [id, restaurant_id, name, price, category],
            (err) => {
                if (err) {
                    callback({ code: grpc.status.INTERNAL, message: err.message });
                } else {
                    callback(null, { id, name, price, category });
                }
            }
        );
    }
};

// Start gRPC server
function main() {
    const server = new grpc.Server();
    server.addService(proto.RestaurantService.service, restaurantService);
    
    const port = 50051;
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error('Failed to start server:', err);
            return;
        }
        console.log(`✅ Restaurant Service running on port ${port}`);
        console.log(`   gRPC server ready for restaurant operations`);
    });
}

main();