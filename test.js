const data = {
    "map-top-right-coordinate": { "x": 280, "y": 280 },
    "products": ["tomatoes", "cucumber", "cheese", "milk", "ham", "eggs", "bananas", "carrots", "bread", "onion"],
    "warehouses": [
        { "x": 100, "y": 100, "name": "Left warehouse" },
        { "x": 200, "y": 200, "name": "Right warehouse" }
    ],
    "customers": [
        { "id": 1, "name": "John Stocks", "coordinates": { "x": 10, "y": 10 } },
        { "id": 2, "name": "Alfred Derrick", "coordinates": { "x": 213, "y": 187 } },
        { "id": 3, "name": "Richard Brune", "coordinates": { "x": 108, "y": 15 } }
    ],
    "orders": [
        {
            "customerId": 1,
            "productList": {
                "tomatoes": 5,
                "cucumber": 5,
                "cheese": 1,
                "milk": 2
            }
        },
        {
            "customerId": 1,
            "productList": {
                "eggs": 10,
                "cucumber": 2,
                "cheese": 1,
                "ham": 2
            }
        },
        {
            "customerId": 2,
            "productList": {
                "eggs": 10,
                "tomatoes": 2,
                "bananas": 5,
                "carrots": 15,
                "bread": 2,
                "onion": 6
            }
        },
        {
            "customerId": 2,
            "productList" : {
                "eggs" : 10,
                "tomatoes" : 2,
                "bananas" : 5,
                "carrots" : 15,
                "bread" : 2,
                "onion" : 6
            }
        },
        {
            "customerId": 3,
            "productList" : {
                "eggs" : 5,
                "cucumber" : 5,
                "cheese" : 1,
                "tomatoes" : 2
            }
        },
        {
            "customerId": 3,
            "productList" : {
                "eggs" : 10,
                "tomatoes" : 2,
                "ham" : 1,
                "bananas" : 2
            }
        },
        {
            "customerId": 2,
            "productList" : {
                "bananas" : 10,
                "carrots" : 2,
                "onion" : 5,
                "cucumber" : 15,
                "cheese" : 2,
                "bread" : 6
            }
        }
    ],
    "availableDrones": [
        { "capacity": "500kW", "consumption": "1W" },
        { "capacity": "1kW", "consumption": "3W" },
        { "capacity": "2kW", "consumption": "5W" }
    ]
};

function calculateDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function convertCapacityToWatts(capacity) {
    if (capacity.endsWith('kW')) return parseFloat(capacity) * 1000;
    return parseFloat(capacity); // Assume input is in Watts if not kW
}

function calculateEnergyConsumption(distance, consumptionRate) {
    return distance * consumptionRate; // Consumption rate is in W per minute, distance in minutes
}

const loadingTime = 5;

const orders = data.orders;
const customers = data.customers;
const warehouses = data.warehouses;
const availableDrones = data.availableDrones;

let availableOrders = orders;

function deliverToCustomer(drone, order, location) {
    return new Promise((resolve) => {
        console.log(`Delivery init, drone ${drone.capacity}, ${drone.consumption}; order ${order.customerId}`);

        // Simulating delivery time
        const distances = warehouses.map((warehouse) => {return calculateDistance(warehouse, location)});
        const deliveryTime = Math.min(...distances) + loadingTime; 
        
        setTimeout(() => {
            // Simulate delivery success or failure
            resolve(`Order ${order.customerId} delivered in ${deliveryTime} minutes`);
        }, deliveryTime * 10);
    });
}

function returnToWarehouse(drone, order, location) {
    return new Promise((resolve) => {
        // Simulating delivery time
        const distances = warehouses.map((warehouse) => {return calculateDistance(warehouse, location)});
        const deliveryTime = Math.min(...distances); 
        
        setTimeout(() => {
            resolve(`Drone ${drone.capacity}, ${drone.consumption} has returned to warehouse in ${deliveryTime} minutes`);
        }, deliveryTime * 10);
    });
}

// Function to handle deliveries using async/await
async function handleDelivery(drone, order, location) {
    try {
        console.log(await deliverToCustomer(drone, order, location));
        console.log(await returnToWarehouse(drone, order, location));
    } catch (errorMessage) {
        console.error(errorMessage);
    }
}

async function deliverAllOrders() {
    let deliveryTimes = []; // Array to track each drone's total delivery time

    const deliverOrder = async (drone) => {
        if (availableOrders.length === 0) return 0; // No more orders to process, return 0 as the time
        
        const order = availableOrders.shift(); // Take the first available order
        const customerLocation = customers.find(c => c.id === order.customerId).coordinates;

        // Wait for delivery and return, and track the total time for each drone
        const totalTimeForDrone = await handleDelivery(drone, order, customerLocation);
        
        // After delivery, make the drone available again and try to process the next order
        availableDrones.push(drone);
        const nextDeliveryTime = await deliverOrder(availableDrones.shift()); // Continue with the next available drone
        return Math.max(totalTimeForDrone, nextDeliveryTime); // Return the maximum time taken between the current and next delivery
    };

    // Initialize deliveries with available drones
    const initialDrones = availableDrones.splice(0, Math.min(availableDrones.length, availableOrders.length));
    deliveryTimes = await Promise.all(initialDrones.map(drone => deliverOrder(drone)));

    const totalDeliveryTime = Math.max(...deliveryTimes); // Find the maximum delivery time
    console.log(`Total delivery time is ${totalDeliveryTime} minutes`);
}

// Initialize the delivery process
deliverAllOrders();