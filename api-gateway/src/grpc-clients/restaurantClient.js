const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../../proto/restaurant.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const restaurantProto = grpc.loadPackageDefinition(packageDefinition).restaurant;

// Create gRPC client
const client = new restaurantProto.RestaurantService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Promisify gRPC calls for easier use
const getMenu = () => {
    return new Promise((resolve, reject) => {
        client.GetMenu({}, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

const getRestaurant = (id) => {
    return new Promise((resolve, reject) => {
        console.log('📢 Client gRPC - ID reçu:', id);
        console.log('📢 Client gRPC - Longueur:', id.length);
        console.log('📢 Client gRPC - Type:', typeof id);

        // ⚠️ IMPORTANT: Envoyer l'ID comme string complète
        client.GetRestaurant({ id: String(id) }, (error, response) => {
            if (error) {
                console.error('❌ Client gRPC - Erreur:', error.message);
                reject(error);
            } else {
                console.log('✅ Client gRPC - Réponse reçue');
                resolve(response);
            }
        });
    });
};


const createRestaurant = (data) => {
    return new Promise((resolve, reject) => {
        client.CreateRestaurant(data, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

const addMenuItem = (data) => {
    return new Promise((resolve, reject) => {
        client.AddMenuItem(data, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

module.exports = {
    getMenu,
    getRestaurant,
    createRestaurant,
    addMenuItem
};