let expandedUsers = new Set(); // Remembers which users are "Dropdown'd" open
let userOrdersCache = {}; // Stores fetched histories so the modal can read them

document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    loadRooms();
    loadMenu();
    loadTimeSlots();

    // Only auto-refresh if the print receipt modal is NOT open (prevents glitching)
    setInterval(() => {
        if (document.getElementById("receiptModal").classList.contains("hidden")) {
            loadUsers();
            loadRooms();
            loadMenu();
            loadTimeSlots();
        }
    }, 10000);
});

/* --- USERS & DROPDOWN HISTORY --- */
async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const users = await res.json();
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";
    
    users.forEach(u => {
        // 1. MAIN USER ROW
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${u.name}</b></td>
            <td>${u.email}</td>
            <td>${u.phone || '--'}</td> 
            <td>
                <select onchange="updateRole(${u.id}, this.value)" style="margin:0; padding:4px;">
                    <option value="faculty" ${u.role==='faculty'?'selected':''}>Faculty</option>
                    <option value="staff" ${u.role==='staff'?'selected':''}>Staff</option>
                    <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
            </td>
            <td>
                <button style="background: #17a2b8; padding: 4px 10px;" onclick="toggleHistory(${u.id}, '${u.name}', '${u.email}', '${u.phone || ''}')">History ▼</button>
                <button style="background:#dc3545; padding: 4px 10px;" onclick="deleteUser(${u.id})">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);

        // 2. HIDDEN DROPDOWN ROW (Holds the user's order history)
        const histTr = document.createElement("tr");
        histTr.id = `history-row-${u.id}`;
        histTr.style.display = expandedUsers.has(u.id) ? "table-row" : "none";
        histTr.style.backgroundColor = "#fafbfc";
        
        histTr.innerHTML = `
            <td colspan="5" style="padding: 0;">
                <div id="history-content-${u.id}" style="padding: 20px; border-bottom: 2px solid #1f3c88;">
                    Loading history...
                </div>
            </td>
        `;
        tbody.appendChild(histTr);

        // If it was already open before the refresh, re-fetch it
        if (expandedUsers.has(u.id)) {
            fetchAndRenderHistory(u.id, u.name, u.email, u.phone);
        }
    });
}

// Opens/Closes the user's history dropdown
function toggleHistory(userId, name, email, phone) {
    const row = document.getElementById(`history-row-${userId}`);
    if (expandedUsers.has(userId)) {
        expandedUsers.delete(userId);
        row.style.display = "none";
    } else {
        expandedUsers.add(userId);
        row.style.display = "table-row";
        fetchAndRenderHistory(userId, name, email, phone);
    }
}

// Fetches the history and builds the sub-table
async function fetchAndRenderHistory(userId, name, email, phone) {
    const content = document.getElementById(`history-content-${userId}`);
    try {
        const res = await fetch(`/api/admin/users/${userId}/orders`);
        const orders = await res.json();
        
        // Cache the data so the PDF receipt generator can read it
        userOrdersCache[userId] = { name, email, phone, orders };

        if(orders.length === 0) {
            content.innerHTML = `<p style="margin:0; color:#666; font-style: italic;">No order history found for this user.</p>`;
            return;
        }

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin:0; color:#1f3c88;">📦 Order History</h4>
                <button onclick="showFullHistoryReceipt(${userId})" style="background: #28a745; padding: 6px 12px; font-size: 13px;">🖨️ Print Entire History Bill</button>
            </div>
            <table style="background: white; border: 1px solid #ddd; margin:0; box-shadow: none;">
                <thead>
                    <tr style="background: #f1f4fa;">
                        <th>Date</th><th>Order ID</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orders.forEach(o => {
            let itemsDisplay = "Error";
            try {
                const itemsObj = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                itemsDisplay = itemsObj.map(i => `${i.name} × ${i.qty}`).join(", ");
            } catch(e) {}

            const dateStr = new Date(o.created_at).toLocaleString();
            html += `
                <tr>
                    <td style="font-size:13px;">${dateStr}</td>
                    <td style="font-size:13px;">#${o.order_id}</td>
                    <td style="font-size:13px;">${itemsDisplay}</td>
                    <td style="font-size:13px; font-weight:bold;">₹${o.amount}</td>
                    <td><span class="badge ${o.status.toLowerCase()}">${o.status}</span></td>
                    <td><button onclick="showSingleReceipt(${userId}, '${o.order_id}')" style="background: #1f3c88; padding: 4px 10px; font-size:12px;">🧾 Bill</button></td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        content.innerHTML = html;
    } catch(e) {
        content.innerHTML = `<p style="color:red;">Failed to load history.</p>`;
    }
}

async function updateRole(id, role) {
    await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({role})});
    alert("Updated!");
}
async function deleteUser(id) {
    if(confirm("Delete user?")) { await fetch(`/api/admin/users/${id}`, {method:"DELETE"}); loadUsers(); }
}

/* ===========================
   RECEIPT LOGIC (Single & Full)
=========================== */

// 1. Shows a standard bill for ONE order
window.showSingleReceipt = function(userId, orderId) {
    const userObj = userOrdersCache[userId];
    const order = userObj.orders.find(o => o.order_id === orderId);

    // Reset Table Headers for single view
    document.getElementById("recHeadQty").innerText = "Qty";
    document.getElementById("recHeadItem").innerText = "Item";

    document.getElementById("recTitle").innerText = "Official Order Receipt";
    document.getElementById("recDetails").innerHTML = `
        <p><b>Name:</b> ${userObj.name}</p>
        <p><b>Contact:</b> ${userObj.phone || '--'}</p>
        <p><b>Order ID:</b> ${order.order_id}</p>
        <p><b>Date:</b> ${new Date(order.created_at).toLocaleString()}</p>
        <p><b>Status:</b> ${order.status}</p>
    `;

    const tbody = document.getElementById("recItemsBody");
    tbody.innerHTML = "";
    let itemsArr = [];
    try { itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch(e){}

    itemsArr.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.qty);
        tbody.innerHTML += `<tr><td>${item.qty}</td><td>${item.name}</td><td class="price-col">₹${itemTotal}</td></tr>`;
    });

    document.getElementById("recTotal").innerText = order.amount;
    document.getElementById("receiptModal").classList.remove("hidden");
};

// 2. Shows a massive bill totaling EVERYTHING the user has ever ordered
window.showFullHistoryReceipt = function(userId) {
    const userObj = userOrdersCache[userId];
    const orders = userObj.orders;

    // Change Table Headers for full history view
    document.getElementById("recHeadQty").innerText = "Date";
    document.getElementById("recHeadItem").innerText = "Order Summary";

    document.getElementById("recTitle").innerText = "Complete Order History";
    document.getElementById("recDetails").innerHTML = `
        <p><b>Faculty Name:</b> ${userObj.name}</p>
        <p><b>Email:</b> ${userObj.email}</p>
        <p><b>Contact:</b> ${userObj.phone || '--'}</p>
        <p><b>Total Orders Placed:</b> ${orders.length}</p>
    `;

    const tbody = document.getElementById("recItemsBody");
    tbody.innerHTML = "";
    let grandTotal = 0;

    orders.forEach(order => {
        const dateStr = new Date(order.created_at).toLocaleDateString();
        let itemsArr = [];
        try { itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch(e){}
        
        let desc = itemsArr.map(i => `${i.name} (x${i.qty})`).join(", ");
        
        tbody.innerHTML += `
            <tr>
                <td style="font-size:12px;">${dateStr}</td>
                <td style="font-size:12px;">${desc}</td>
                <td class="price-col" style="font-weight:bold;">₹${order.amount}</td>
            </tr>
        `;
        grandTotal += Number(order.amount);
    });

    document.getElementById("recTotal").innerText = grandTotal.toFixed(2);
    document.getElementById("receiptModal").classList.remove("hidden");
};

window.closeReceipt = function() {
    document.getElementById("receiptModal").classList.add("hidden");
};

window.printReceipt = function() {
    window.print(); 
};

/* --- ROOMS --- */
async function loadRooms() {
    const res = await fetch("/api/admin/rooms");
    const rooms = await res.json();
    const list = document.getElementById("roomList");
    list.innerHTML = "";
    rooms.forEach(r => {
        const li = document.createElement("li");
        li.style.padding="8px"; li.style.borderBottom="1px solid #ddd"; li.style.display="flex"; li.style.justifyContent="space-between";
        li.innerHTML = `<span>${r.name}</span> <button style="background:#dc3545; padding:2px 8px" onclick="deleteRoom(${r.id})">X</button>`;
        list.appendChild(li);
    });
}
async function addRoom() {
    const name = document.getElementById("roomInput").value;
    if(!name) return;
    await fetch("/api/admin/rooms", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name})});
    document.getElementById("roomInput").value="";
    loadRooms();
}
async function deleteRoom(id) {
    if(confirm("Remove room?")) { await fetch(`/api/admin/rooms/${id}`, {method:"DELETE"}); loadRooms(); }
}

/* --- MENU --- */
async function loadMenu() {
    const res = await fetch("/api/admin/menu");
    const menu = await res.json();
    const tbody = document.getElementById("menuTable");
    tbody.innerHTML = "";
    menu.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.name}</td>
            <td>₹${m.price}</td>
            <td>${m.category}</td>
            <td style="color:${m.available?'green':'red'}">${m.available?'Available':'Unavailable'}</td>
            <td>
                <button onclick="toggleMenu(${m.id})">Toggle</button>
                <button style="background:#dc3545" onclick="deleteMenu(${m.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
async function addMenuItem() {
    const name = document.getElementById("menuName").value;
    const price = document.getElementById("menuPrice").value;
    const category = document.getElementById("menuCategory").value;
    if(!name || !price) return;
    await fetch("/api/admin/menu", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name, price, category})});
    loadMenu();
}
async function toggleMenu(id) { await fetch(`/api/admin/menu/${id}/toggle`, {method:"PUT"}); loadMenu(); }
async function deleteMenu(id) { if(confirm("Delete item?")) { await fetch(`/api/admin/menu/${id}`, {method:"DELETE"}); loadMenu(); } }

/* ===========================
   ⏳ TIME SLOTS LOGIC
=========================== */
async function loadTimeSlots() {
    try {
        const res = await fetch("/api/admin/timeslots");
        const slots = await res.json();
        const tbody = document.getElementById("slotsTable");
        tbody.innerHTML = "";

        slots.forEach(slot => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatTime(slot.start_time)}</td>
                <td>${formatTime(slot.end_time)}</td>
                <td>
                    <input type="number" value="${slot.max_orders}" 
                           style="width: 60px; padding: 4px;"
                           onchange="updateSlotCapacity(${slot.id}, this.value)">
                </td>
                <td>
                    <button style="background:#dc3545; padding: 4px 10px;" onclick="deleteSlot(${slot.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Slots error", e); }
}

async function addTimeSlot() {
    const start = document.getElementById("slotStart").value;
    const end = document.getElementById("slotEnd").value;
    const max = document.getElementById("slotMax").value;

    if (!start || !end || !max) {
        alert("Please fill all time slot details");
        return;
    }

    await fetch("/api/admin/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: start, end_time: end, max_orders: max })
    });

    loadTimeSlots();
}

async function deleteSlot(id) {
    if(!confirm("Remove this time slot?")) return;
    await fetch(`/api/admin/timeslots/${id}`, { method: "DELETE" });
    loadTimeSlots();
}

async function updateSlotCapacity(id, newMax) {
    await fetch(`/api/admin/timeslots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_orders: newMax })
    });
}

function formatTime(timeString) {
    if (!timeString) return "";
    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}