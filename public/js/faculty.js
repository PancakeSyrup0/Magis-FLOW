/* CONFIG */
const facultyEmail = localStorage.getItem("facultyEmail");
if (document.getElementById("facultyEmailText")) {
    document.getElementById("facultyEmailText").innerText = facultyEmail;
}

let cart = {};
let prices = {}; 
let previousStatusMap = {}; 
let allFetchedOrders = []; // NEW: Store orders globally so the receipt modal can read them

document.addEventListener("DOMContentLoaded", () => {
    loadMenu();
    loadRooms();
    loadTimeSlots(); 
    loadDashboard();
    loadOrders(); 

    setInterval(() => {
        loadDashboard();
        loadOrders();
    }, 2000);
});

async function loadMenu() {
    const res = await fetch("/api/faculty/menu");
    const menuItems = await res.json();
    const container = document.getElementById("foodList");
    
    if(container.innerHTML.trim() === "") {
        container.innerHTML = "";
        menuItems.forEach(item => {
            prices[item.name] = Number(item.price);
            const div = document.createElement("div");
            div.className = "food-item";
            div.innerHTML = `
                <span>${item.name} (₹${item.price})</span>
                <div class="counter">
                    <button onclick="updateItem('${item.name}', -1)">−</button>
                    <span id="${item.name}-count">0</span>
                    <button onclick="updateItem('${item.name}', 1)">+</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

async function loadRooms() {
    const res = await fetch("/api/faculty/rooms");
    const rooms = await res.json();
    const select = document.getElementById("roomSelect");
    
    if(select.children.length <= 1) { 
        rooms.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.name;
            opt.innerText = r.name;
            select.appendChild(opt);
        });
    }
}

async function loadTimeSlots() {
    try {
        const res = await fetch("/api/faculty/timeslots");
        const slots = await res.json();
        const select = document.getElementById("timeSlotSelect");
        
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Select Time Slot --</option>';

        slots.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            const timeLabel = `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`;
            const remaining = s.max_orders - s.current_count;

            if (remaining <= 0) {
                opt.innerText = `${timeLabel} (FULL 🔴)`;
                opt.disabled = true;
            } else {
                opt.innerText = `${timeLabel} (${remaining} left 🟢)`;
            }
            select.appendChild(opt);
        });
        
        if(currentVal) select.value = currentVal;
    } catch(e) { console.error("Time slot error", e); }
}

window.updateItem = function(item, change) {
    cart[item] = (cart[item] || 0) + change;
    if (cart[item] < 0) cart[item] = 0;
    document.getElementById(item + "-count").innerText = cart[item];
    calculateTotal();
};

function calculateTotal() {
    let total = 0;
    for (let i in cart) total += cart[i] * prices[i];
    document.getElementById("total").innerText = total;
}

window.filterItems = function() {
    const input = document.getElementById("searchItem").value.toLowerCase();
    document.querySelectorAll(".food-item").forEach(i => 
        i.style.display = i.innerText.toLowerCase().includes(input) ? "flex" : "none"
    );
};

window.placeOrder = async function() {
    const items = [];
    let totalAmount = 0;
    
    const room = document.getElementById("roomSelect").value;
    const timeSlotId = document.getElementById("timeSlotSelect").value;

    if (!timeSlotId) { alert("Please select a delivery time!"); return; }
    if (!room) { alert("Please select a room!"); return; }

    for (let i in cart) {
        if (cart[i] > 0) {
            items.push({ name: i, qty: cart[i], price: prices[i] });
            totalAmount += cart[i] * prices[i];
        }
    }

    if (!items.length) { alert("Add items first"); return; }

    const res = await fetch("/api/faculty/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: facultyEmail, items, totalAmount, room, timeSlotId })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        cart = {};
        document.getElementById("total").innerText = "0";
        document.querySelectorAll(".counter span").forEach(s => s.innerText = "0");
        loadTimeSlots(); 
        loadOrders();
        loadDashboard();
    }
};

async function loadDashboard() {
    try {
        const res = await fetch(`/api/faculty/dashboard?email=${facultyEmail}`);
        const data = await res.json();
        document.getElementById("activeOrders").innerText = data.activeOrders;
        document.getElementById("ordersToday").innerText = data.ordersToday;
        document.getElementById("totalOrders").innerText = data.totalOrders;
    } catch(e) {}
}

async function loadOrders() {
    try {
        const res = await fetch(`/api/faculty/orders/current?email=${facultyEmail}`);
        const orders = await res.json();
        
        allFetchedOrders = orders; // Store globally for the receipt logic

        const currentBody = document.getElementById("currentOrdersBody");
        const pastBody = document.getElementById("pastOrdersBody");

        currentBody.innerHTML = "";
        pastBody.innerHTML = "";
        
        orders.forEach(o => {
            if (previousStatusMap[o.id] && previousStatusMap[o.id] !== 'Ready' && o.status === 'Ready' && o.is_today === 1) {
                alert(`🔔 Order #${o.id} is Ready!`);
            }
            previousStatusMap[o.id] = o.status;

            let itemsDisplay = "";
            try {
                const itemsObj = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                itemsDisplay = itemsObj.map(i => `${i.name} × ${i.qty}`).join(", ");
            } catch (e) { itemsDisplay = "Error"; }

            const tr = document.createElement("tr");

            // LOGIC FIX: If it's Cancelled, Delivered, OR from yesterday, it goes to PAST history
            if (o.status === 'Delivered' || o.status === 'Cancelled' || o.is_today === 0) {
                
                let finalStatus = o.status;
                if (o.is_today === 0 && o.status !== 'Delivered' && o.status !== 'Cancelled') {
                    finalStatus = "Expired"; 
                }

                tr.innerHTML = `
                    <td>#${o.id}</td>
                    <td>${itemsDisplay}</td>
                    <td>₹${o.amount}</td>
                    <td><span class="badge ${finalStatus === 'Expired' ? 'expired' : finalStatus.toLowerCase()}">${finalStatus}</span></td>
                    <td><button onclick="showReceipt('${o.id}')" style="background: #1f3c88; padding: 4px 10px;">🧾 Bill</button></td>
                `;
                pastBody.appendChild(tr);
            } else {
                tr.innerHTML = `
                    <td>#${o.id}</td>
                    <td>${itemsDisplay}</td>
                    <td><span class="badge ${o.status.toLowerCase()}">${o.status}</span></td>
                    <td><button onclick="showReceipt('${o.id}')" style="background: #1f3c88; padding: 4px 10px;">🧾 Bill</button></td>
                `;
                currentBody.appendChild(tr);
            }
        });

    } catch(e) { console.error("Orders error", e); }
}

function formatTime(timeString) {
    if (!timeString) return "";
    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}

/* =========================================
   RECEIPT LOGIC (NEW)
   ========================================= */
window.showReceipt = function(orderId) {
    // 1. Find the specific order in our stored array
    const order = allFetchedOrders.find(o => o.id === orderId);
    if (!order) return;

    // 2. Populate Header Info
    document.getElementById("recOrderId").innerText = order.id;
    document.getElementById("recDate").innerText = new Date(order.created_at).toLocaleString();
    
    let displayStatus = order.status;
    if (order.is_today === 0 && order.status !== 'Delivered' && order.status !== 'Cancelled') {
        displayStatus = "Expired";
    }
    document.getElementById("recStatus").innerText = displayStatus;
    
    // 3. Populate Items Table
    const tbody = document.getElementById("recItemsBody");
    tbody.innerHTML = ""; // Clear old items
    
    let itemsArr = [];
    try { itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } 
    catch(e) { console.error("Parse error"); }

    itemsArr.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.qty);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.qty}</td>
            <td>${item.name}</td>
            <td class="price-col">₹${itemTotal}</td>
        `;
        tbody.appendChild(tr);
    });

    // 4. Set Total and Show Modal
    document.getElementById("recTotal").innerText = order.amount;
    document.getElementById("receiptModal").classList.remove("hidden");
};

window.closeReceipt = function() {
    document.getElementById("receiptModal").classList.add("hidden");
};

window.printReceipt = function() {
    window.print(); // Triggers the browser's PDF/Print dialogue
};