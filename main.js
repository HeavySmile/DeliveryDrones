// Example JSON data (assuming this is loaded or available in your environment)
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

function findNearestWarehouse(customerCoordinates, warehouses) {
    return warehouses.reduce((nearest, warehouse) => {
        const distance = calculateDistance(customerCoordinates, warehouse);
        return distance < nearest.distance ? { warehouse, distance } : nearest;
    }, { warehouse: null, distance: Infinity }).warehouse;
}

function convertCapacityToWatts(capacity) {
    if (capacity.endsWith('kW')) {
        return parseFloat(capacity) * 1000; // Convert kW to W
    }
    return parseFloat(capacity); // Assume input is in Watts if not kW
}

function calculateEnergyConsumption(distance, consumptionRate) {
    return distance * consumptionRate; // Consumption rate is in W per minute, distance in minutes
}

function processDronesAndDeliveriesWithBatteryManagementAndReturn(data) {
    const { warehouses, customers, orders, availableDrones } = data;
    const deliveryTimes = [];
    let totalDeliveryTime = 0;
    let drones = availableDrones.map(drone => ({
        ...drone,
        capacity: convertCapacityToWatts(drone.capacity),
        consumption: parseFloat(drone.consumption),
        location: null,
        availableAt: 0,
        batteryLevel: convertCapacityToWatts(drone.capacity) // Assume starting with a full charge
    }));

    function assignDroneToOrder(order, currentTime) {
        const customer = customers.find(c => c.id === order.customerId);
        const nearestWarehouse = findNearestWarehouse(customer.coordinates, warehouses);
        for (let drone of drones) {
            const distanceToCustomer = calculateDistance(nearestWarehouse, customer.coordinates);
            const returnDistance = distanceToCustomer; // Assume return to the same warehouse for simplicity
            const roundTripDistance = distanceToCustomer * 2;
            const energyNeeded = calculateEnergyConsumption(roundTripDistance, drone.consumption);
            const deliveryTime = roundTripDistance + 5; // Including 5 minutes for loading

            if (currentTime >= drone.availableAt && drone.batteryLevel >= energyNeeded) {
                drone.location = customer.coordinates;
                drone.batteryLevel -= energyNeeded; // Reduce battery level by energy consumed

                // Immediately calculate return to nearest warehouse after delivery
                const nearestWarehouseForReturn = findNearestWarehouse(customer.coordinates, warehouses);
                const returnToWarehouseDistance = calculateDistance(customer.coordinates, nearestWarehouseForReturn);
                const returnTime = returnToWarehouseDistance; // Time to return to warehouse
                const endTime = currentTime + deliveryTime + returnTime;

                drone.availableAt = endTime; // Update availability considering the return trip
                deliveryTimes.push({ customerId: customer.id, deliveryTime: endTime - currentTime });

                totalDeliveryTime = Math.max(totalDeliveryTime, endTime);

                // Check if the drone needs recharging, assuming it returns to a warehouse
                if (drone.batteryLevel / drone.capacity < 0.2) {
                    drone.availableAt += 20; // Add recharge time
                    drone.batteryLevel = drone.capacity; // Drone is fully recharged
                }
                break;
            }
        }
    }
    orders.forEach(order => {
        const currentTime = Math.min(...drones.map(drone => drone.availableAt));
        assignDroneToOrder(order, currentTime);
    });

    console.log(`Total time needed for all deliveries: ${totalDeliveryTime} minutes`);
    console.log(`Time needed for each delivery:`, deliveryTimes);
    console.log(`Number of drones used: ${drones.length}`);
}

processDronesAndDeliveriesWithBatteryManagementAndReturn(data);