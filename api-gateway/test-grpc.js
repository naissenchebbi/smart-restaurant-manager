const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Test Restaurant Service
const PROTO_PATH = path.join(__dirname, '../proto/restaurant.proto');
console.log('📁 Chemin proto:', PROTO_PATH);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const restaurantProto = grpc.loadPackageDefinition(packageDefinition).restaurant;

const client = new restaurantProto.RestaurantService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

console.log('🔄 Test de connexion à Restaurant Service (port 50051)...');

client.GetMenu({}, (error, response) => {
    if (error) {
        console.error('❌ ERREUR:', error.code, error.message);
        console.error('Détails:', error);
    } else {
        console.log('✅ SUCCÈS! Menu reçu:', JSON.stringify(response, null, 2));
    }
});