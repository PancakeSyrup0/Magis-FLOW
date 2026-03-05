document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    loadRooms();
    loadMenu();
    loadTimeSlots();

    setInterval(() => {
        loadUsers();
        loadRooms();
        loadMenu();
        loadTimeSlots();
    }, 10000);
});

/* --- USERS --- */
async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const users = await res.json();
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";
    users.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone || '--'}</td> <td>
                <select onchange="updateRole(${u.id}, this.value)">
                    <option value="faculty" ${u.role==='faculty'?'selected':''}>Faculty</option>
                    <option value="staff" ${u.role==='staff'?'selected':''}>Staff</option>
                    <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
            </td>
            <td><button style="background:#dc3545" onclick="deleteUser(${u.id})">Remove</button></td>
        `;
        tbody.appendChild(tr);
    });
}
async function updateRole(id, role) {
    await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({role})});
    alert("Updated!");
}
async function deleteUser(id) {
    if(confirm("Delete user?")) { await fetch(`/api/admin/users/${id}`, {method:"DELETE"}); loadUsers(); }
}

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

// Helper to make "14:00" look like "2:00 PM"
function formatTime(timeString) {
    if (!timeString) return "";
    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}