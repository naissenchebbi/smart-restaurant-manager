const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../../proto/kitchen.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,  // ← false pour utiliser camelCase
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const kitchenProto = grpc.loadPackageDefinition(packageDefinition).kitchen;

// Create gRPC client
const client = new kitchenProto.KitchenService(
    'localhost:50053',
    grpc.credentials.createInsecure()
);

// Promisify gRPC calls - Utilisez camelCase (recommandé par gRPC)
const getKitchenQueue = () => {
    return new Promise((resolve, reject) => {
        client.getKitchenQueue({}, (error, response) => {
            if (error) {
                console.error('❌ Erreur getKitchenQueue:', error.message);
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

const markOrderReady = (orderId) => {
    return new Promise((resolve, reject) => {
        client.markOrderReady({ order_id: orderId }, (error, response) => {
            if (error) {
                console.error('❌ Erreur markOrderReady:', error.message);
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

const getOrderStatus = (orderId) => {
    return new Promise((resolve, reject) => {
        client.getOrderStatus({ order_id: orderId }, (error, response) => {
            if (error) {
                console.error('❌ Erreur getOrderStatus:', error.message);
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

const addKitchenStaff = (name, role) => {
    return new Promise((resolve, reject) => {
        client.addKitchenStaff({ name, role }, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

module.exports = {
    getKitchenQueue,
    markOrderReady,
    getOrderStatus,
    addKitchenStaff
};