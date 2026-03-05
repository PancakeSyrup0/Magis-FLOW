let currentTab = 'active'; 

let knownActiveOrderIds = [];
let isFirstLoad = true;
let soundEnabled = false;

// NEW: Store orders globally so the receipt modal can read them
let allOrdersMap = {}; 

document.addEventListener("DOMContentLoaded", () => {
    switchTab('active');
    
    // Auto-Refresh
    setInterval(() => {
        if (currentTab === 'active') loadActiveOrders();
    }, 3000);
});

/* --- SOUND TOGGLE --- */
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggleBtn');
    const audio = document.getElementById('notificationSound');

    if (soundEnabled) {
        btn.innerHTML = '🔊 Sound: ON';
        btn.style.background = '#28a745'; 
        btn.style.borderColor = '#28a745';
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed:", e));
    } else {
        btn.innerHTML = '🔇 Sound: OFF';
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
    }
}

/* --- TAB SWITCHING --- */
function switchTab(tab) {
    currentTab = tab;
    const btns = document.querySelectorAll('.tab-btn');
    if (tab === 'active') {
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
        document.getElementById('activeSection').classList.remove('hidden');
        document.getElementById('pastSection').classList.add('hidden');
        loadActiveOrders();
    } else {
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
        document.getElementById('activeSection').classList.add('hidden');
        document.getElementById('pastSection').classList.remove('hidden');
        loadPastOrders();
    }
}

/* --- LOAD ACTIVE ORDERS --- */
async function loadActiveOrders() {
    try {
        const res = await fetch("/api/staff/orders/active");
        const orders = await res.json();
        const tbody = document.getElementById("activeOrdersBody");
        
        const currentOrderIds = orders.map(o => o.order_id);
        
        if (!isFirstLoad) {
            const hasNewOrder = currentOrderIds.some(id => !knownActiveOrderIds.includes(id));
            if (hasNewOrder && soundEnabled) {
                const audio = document.getElementById('notificationSound');
                audio.currentTime = 0; 
                audio.play().catch(err => console.error("Sound blocked by browser:", err));
            }
        }
        
        knownActiveOrderIds = currentOrderIds;
        isFirstLoad = false;

        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding: 20px;'>No active orders.</td></tr>";
            return;
        }

        orders.forEach(o => {
            allOrdersMap[o.order_id] = o; // Save to global map for receipt

            const timeSlotDisplay = o.start_time ? 
                `<b>${formatTime(o.start_time)}</b> - ${formatTime(o.end_time)}` : 
                "<span style='color:gray'>Not Selected</span>";

            const phoneDisplay = o.phone ? `<a href="tel:${o.phone}" style="color: #1f3c88; text-decoration: none; font-weight: 500;">📞 ${o.phone}</a>` : '--';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="color: #1f3c88; background: #f4f6fb;">${timeSlotDisplay}</td>
                <td>#${o.order_id}</td>
                <td>${formatItems(o.items)}</td>
                <td>${o.room || '--'}</td>
                <td>${phoneDisplay}</td>
                <td>₹${o.amount}</td>
                <td><span class="badge ${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                    <select class="form-select" onchange="updateStatus('${o.order_id}', this.value)" style="margin:0; margin-bottom: 5px; padding: 5px;">
                        <option value="Pending" ${o.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Preparing" ${o.status==='Preparing'?'selected':''}>Preparing</option>
                        <option value="Ready" ${o.status==='Ready'?'selected':''}>Ready</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    <button onclick="showReceipt('${o.order_id}')" style="background: #1f3c88; padding: 4px; width: 100%; font-size: 12px;">🧾 Bill</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Active Fetch Error:", err); }
}

/* --- LOAD PAST ORDERS --- */
async function loadPastOrders() {
    try {
        const res = await fetch("/api/staff/orders/past");
        const orders = await res.json();
        const tbody = document.getElementById("pastOrdersBody");
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No past history.</td></tr>";
            return;
        }

        orders.forEach(o => {
            allOrdersMap[o.order_id] = o; // Save to global map for receipt

            const timeSlotDisplay = o.start_time ? `${formatTime(o.start_time)}` : "--";
            const phoneDisplay = o.phone ? `<a href="tel:${o.phone}" style="color: #1f3c88; text-decoration: none; font-weight: 500;">📞 ${o.phone}</a>` : '--';

            let finalStatus = o.status;
            if (o.is_today === 0 && o.status !== 'Delivered' && o.status !== 'Cancelled') {
                finalStatus = "Expired"; 
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${timeSlotDisplay}</td>
                <td>#${o.order_id}</td>
                <td>${formatItems(o.items)}</td>
                <td>${o.room || '--'}</td>
                <td>${phoneDisplay}</td>
                <td>₹${o.amount}</td>
                <td><span class="badge ${finalStatus === 'Expired' ? 'expired' : finalStatus.toLowerCase()}">${finalStatus}</span></td>
                <td><button onclick="showReceipt('${o.order_id}')" style="background: #1f3c88; padding: 4px 10px;">🧾 Bill</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Past Fetch Error:", err); }
}

/* --- UPDATE STATUS --- */
async function updateStatus(orderId, newStatus) {
    if (!confirm(`Mark Order #${orderId} as ${newStatus}?`)) {
        loadActiveOrders(); 
        return;
    }

    try {
        const res = await fetch("/api/staff/update-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, status: newStatus })
        });
        
        const data = await res.json();
        if(data.success) {
            loadActiveOrders();
        } else {
            alert("Update Failed");
        }
    } catch (err) { alert("Network Error"); }
}

/* --- HELPERS --- */
function formatItems(rawItems) {
    try {
        const items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
        return items.map(i => `${i.name} (x${i.qty})`).join(", ");
    } catch (e) { return "Item Error"; }
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
   RECEIPT LOGIC
   ========================================= */
window.showReceipt = function(orderId) {
    const order = allOrdersMap[orderId];
    if (!order) return;

    // Populate Header Info
    document.getElementById("recOrderId").innerText = order.order_id;
    document.getElementById("recDate").innerText = new Date(order.created_at).toLocaleString();
    document.getElementById("recRoom").innerText = order.room || '--';
    document.getElementById("recContact").innerText = order.phone || '--';
    
    let displayStatus = order.status;
    if (order.is_today === 0 && order.status !== 'Delivered' && order.status !== 'Cancelled') {
        displayStatus = "Expired";
    }
    document.getElementById("recStatus").innerText = displayStatus;
    
    // Populate Items Table
    const tbody = document.getElementById("recItemsBody");
    tbody.innerHTML = ""; 
    
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

    // Set Total and Show Modal
    document.getElementById("recTotal").innerText = order.amount;
    document.getElementById("receiptModal").classList.remove("hidden");
};

window.closeReceipt = function() {
    document.getElementById("receiptModal").classList.add("hidden");
};

window.printReceipt = function() {
    window.print(); 
};