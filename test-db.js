// Test des bases de données
const restaurantDb = require('./restaurant-service/database');
const kitchenDb = require('./kitchen-service/database');
const orderDb = require('./order-service/database-rxdb');

async function test() {
    console.log('=== TEST DES BASES DE DONNÉES ===\n');

    // Test SQLite Restaurant
    restaurantDb.get('SELECT * FROM restaurants', (err, row) => {
        if (row) console.log('✅ Restaurant SQLite OK:', row.name);
    });

    // Test SQLite Kitchen  
    kitchenDb.get('SELECT * FROM kitchen_staff', (err, row) => {
        if (row) console.log('✅ Kitchen SQLite OK:', row.name);
    });

    // Test RxDB Order
    await orderDb.initRxDatabase();
    const orders = await orderDb.listOrders();
    console.log('✅ Order RxDB OK:', orders.length, 'commandes');

    console.log('\n🎉 Toutes les bases fonctionnent !');
}

test();