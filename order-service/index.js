const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { produceOrderCreated } = require('./kafka/producer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
    createOrder,
    getOrder,
    updateOrderStatus,
    listOrders,
    getOrdersByRestaurant,
    initRxDatabase
} = require('./database-rxdb');

// Initialiser RxDB
initRxDatabase().catch(console.error);

const PROTO_PATH = path.join(__dirname, '../proto/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

// Create Order (aligné avec le proto)
async function createOrderGrpc(call, callback) {
    try {
        const { restaurant_id, customer_name, customer_phone, items } = call.request;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        // Calculer le total
        let total_price = 0;
        items.forEach(item => {
            total_price += item.price * item.quantity;
        });

        const orderData = {
            id: id,
            restaurant_id: restaurant_id,
            customer_name: customer_name,
            customer_phone: customer_phone,
            total_price: total_price,
            status: 'pending',
            created_at: created_at,
            items: items.map(i => ({
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                price: i.price,
                name: i.name
            }))
        };
        await produceOrderCreated({
            orderId: id,
            restaurant_id: restaurant_id,
            customer_name: customer_name,
            items: items,
            total_price: total_price
        });

        await createOrder(orderData);

        callback(null, {
            id: id,
            restaurant_id: restaurant_id,
            customer_name: customer_name,
            status: 'pending',
            total_price: total_price,
            created_at: created_at,
            items: items
        });
    } catch (error) {
        console.error('❌ Erreur createOrder:', error);
        callback({ code: grpc.status.INTERNAL, message: error.message });
    }
}

// Get Order
async function getOrderGrpc(call, callback) {
    try {
        const { id } = call.request;
        const order = await getOrder(id);

        if (!order) {
            callback({ code: grpc.status.NOT_FOUND, message: 'Commande non trouvée' });
            return;
        }

        callback(null, {
            id: order.id,
            restaurant_id: order.restaurant_id,
            customer_name: order.customer_name,
            status: order.status,
            total_price: order.total_price,
            created_at: order.created_at,
            items: order.items || []
        });
    } catch (error) {
        console.error('❌ Erreur getOrder:', error);
        callback({ code: grpc.status.INTERNAL, message: error.message });
    }
}

// Update Order Status
async function updateOrderStatusGrpc(call, callback) {
    try {
        const { id, status } = call.request;
        const updatedOrder = await updateOrderStatus(id, status);

        callback(null, {
            id: updatedOrder.id,
            restaurant_id: updatedOrder.restaurant_id,
            customer_name: updatedOrder.customer_name,
            status: updatedOrder.status,
            total_price: updatedOrder.total_price,
            created_at: updatedOrder.created_at,
            items: updatedOrder.items || []
        });
    } catch (error) {
        console.error('❌ Erreur updateOrderStatus:', error);
        callback({ code: grpc.status.NOT_FOUND, message: error.message });
    }
}

// Get Orders By Restaurant
async function getOrdersByRestaurantGrpc(call, callback) {
    try {
        const { restaurant_id } = call.request;
        const orders = await getOrdersByRestaurant(restaurant_id);

        callback(null, { orders: orders || [] });
    } catch (error) {
        console.error('❌ Erreur getOrdersByRestaurant:', error);
        callback({ code: grpc.status.INTERNAL, message: error.message });
    }
}

// List all Orders (pour admin)
async function listOrdersGrpc(call, callback) {
    try {
        const orders = await listOrders();
        callback(null, { orders: orders || [] });
    } catch (error) {
        console.error('❌ Erreur listOrders:', error);
        callback({ code: grpc.status.INTERNAL, message: error.message });
    }
}

function main() {
    const server = new grpc.Server();
    server.addService(orderProto.OrderService.service, {
        CreateOrder: createOrderGrpc,
        GetOrder: getOrderGrpc,
        UpdateOrderStatus: updateOrderStatusGrpc,
        GetOrdersByRestaurant: getOrdersByRestaurantGrpc
    });

    server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
        console.log('✅ Order Service running on port 50052');
        console.log('🗄️  Database: RxDB (NoSQL)');
        server.start();
    });
}

main();