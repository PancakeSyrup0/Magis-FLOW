function showLogin(type) {
  ["faculty", "staff", "admin"].forEach(r =>
    document.getElementById(r + "-login").classList.add("hidden")
  );
  document.getElementById(type + "-login").classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  
  if (type === "faculty") document.querySelectorAll(".tab")[0].classList.add("active");
  else if (type === "staff") document.querySelectorAll(".tab")[1].classList.add("active");
  else if (type === "admin") document.querySelectorAll(".tab")[2].classList.add("active");
}

async function facultyRegister() {
  const regName = document.getElementById("regName").value;
  const regEmail = document.getElementById("regEmail").value;
  const regPhone = document.getElementById("regPhone").value; // Grab Phone
  const dept = document.getElementById("dept").value;
  const regPassword = document.getElementById("regPassword").value;
  const regConfirm = document.getElementById("regConfirm").value;

  if (regPassword !== regConfirm) { alert("Passwords do not match"); return; }

  const res = await fetch("/faculty-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword, department: dept }) // Added phone
  });
  const data = await res.json();
  alert(data.message || (res.ok ? "Registration successful" : "Failed"));
}

async function facultyLogin() {
  const email = document.getElementById("facultyEmail").value;
  const password = document.getElementById("facultyPassword").value;
  const res = await fetch("/faculty-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem("facultyEmail", email);
    location.href = "faculty-dashboard.html";
  } else {
    alert(data.message || "Invalid login");
  }
}

async function staffLogin() {
    const email = document.getElementById("staffEmail").value;
    const password = document.getElementById("staffPassword").value;
    const res = await fetch("/staff-login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(data.success) location.href = "staff-dashboard.html";
    else alert("Invalid Login");
}

async function adminLogin() {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    const res = await fetch("/admin-login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(data.success) location.href = "admin-dashboard.html";
    else alert("Invalid Login");
}