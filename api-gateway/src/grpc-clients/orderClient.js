const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

const client = new orderProto.OrderService(
    'localhost:50052',
    grpc.credentials.createInsecure()
);

// Create Order
const createOrder = (orderData) => {
    return new Promise((resolve, reject) => {
        client.CreateOrder(orderData, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

// Get Order by ID
const getOrder = (orderId) => {
    return new Promise((resolve, reject) => {
        client.GetOrder({ id: orderId }, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

// Update Order Status
const updateOrderStatus = (orderId, status) => {
    return new Promise((resolve, reject) => {
        client.UpdateOrderStatus({ id: orderId, status }, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

// Get Orders by Restaurant
const getOrdersByRestaurant = (restaurantId) => {
    return new Promise((resolve, reject) => {
        client.GetOrdersByRestaurant({ restaurant_id: restaurantId }, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
};

// List all Orders (pour admin)
const listOrders = () => {
    return new Promise((resolve, reject) => {
        // Si votre proto a une méthode ListOrders, utilisez-la
        // Sinon, on peut retourner un tableau vide ou utiliser GetOrdersByRestaurant
        resolve({ orders: [] });
    });
};

// Get Stats
const getStats = () => {
    return new Promise((resolve, reject) => {
        resolve({
            total_orders: 0,
            pending_orders: 0,
            database_type: 'RxDB (NoSQL)'
        });
    });
};

module.exports = {
    createOrder,
    getOrder,
    updateOrderStatus,
    getOrdersByRestaurant,
    listOrders,
    getStats
};