// ================== SUPABASE ==================
const supabaseClient = supabase.createClient(
  "https://rfwylqnkkaxaapinapaz.supabase.co",
  "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj",
);

//===========  حمايه الصفحه  ========
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
    return;
  }

  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== "reciption") {
    window.location.href = "login.html";
    return;
  }

  // ✅ لو تمام كمل شغلك
  fetchData();
});

//=========  logout function ==========
async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
// ================== STATE ==================
let allData = [];
let filteredData = [];

let doctorsList = [];
let specialtiesList = [];
let schedulesList = [];

let sortAsc = true;

// ================== FETCH ==================
async function fetchData() {
  try {
    const { data: bookings } = await supabaseClient
      .from("bookings")
      .select("*");
    const { data: doctors } = await supabaseClient.from("doctors").select("*");
    const { data: specialties } = await supabaseClient
      .from("specialties")
      .select("*");
    const { data: schedules } = await supabaseClient
      .from("doc_schedual")
      .select("*");

    doctorsList = doctors || [];
    specialtiesList = specialties || [];
    schedulesList = schedules || [];

    allData = (bookings || []).map((b) => {
      const slot = schedulesList.find((s) => s.id === b.slot_id);
      const doc = doctorsList.find((d) => d.id === slot?.doc_id);
      const spec = specialtiesList.find((s) => s.id === doc?.special_id);

      return {
        id: b.id,
        patient: b.patient_name,
        phone: b.patient_phone,
        status: b.status || "pending",
        date: slot?.date || "",
        doctor: doc?.doc_name || "-",
        doc_id: doc?.id,
        specialty: spec?.spcial_name || "-",
        spec_id: spec?.id,
        queue_num: b.queue_num ?? null,
        type: b.type || "normal",
        priority: b.priority || 0,
      };
    });

    initFilters();
    applyFilters();
  } catch (err) {
    console.error(err);
  }
}

// ================== FILTERS ==================
function initFilters() {
  const specEl = document.getElementById("specialtyFilter");
  const docEl = document.getElementById("doctorFilter");

  specEl.innerHTML = `<option value="">كل التخصصات</option>`;
  specialtiesList.forEach((s) => {
    specEl.innerHTML += `<option value="${s.id}">${s.spcial_name}</option>`;
  });

  specEl.onchange = () => {
    const specId = specEl.value;

    docEl.innerHTML = `<option value="">كل الأطباء</option>`;
    doctorsList
      .filter((d) => !specId || d.special_id == specId)
      .forEach((d) => {
        docEl.innerHTML += `<option value="${d.id}">${d.doc_name}</option>`;
      });

    applyFilters();
  };

  document
    .querySelectorAll(".filters select, .filters input")
    .forEach((el) => el.addEventListener("change", applyFilters));
}

// ================== APPLY FILTERS ==================
function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateForFilter(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // YYYY-MM-DD
}

function applyFilters() {
  const specId = document.getElementById("specialtyFilter")?.value;
  const docId = document.getElementById("doctorFilter")?.value;
  const date = document.getElementById("dateFilter")?.value;
  const status = document.getElementById("statusFilter")?.value;
  const search = document.getElementById("searchInput")?.value?.toLowerCase();

  filteredData = allData.filter(
    (item) =>
      (!specId || item.spec_id == specId) &&
      (!docId || item.doc_id == docId) &&
      (!date || formatDateForFilter(item.date) === date) &&
      (!status || item.status === status) &&
      (!search ||
        item.patient.toLowerCase().includes(search) ||
        item.phone.includes(search)),
  );
  filteredData.sort((a, b) => {
    // 1️⃣ الأول: priority (الأعلى ييجي الأول)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // 2️⃣ لو الاتنين نفس الأولوية
    // خلي اللي عنده queue_num ييجي بعد اللي معندوش (VIP الأول)
    if (a.queue_num == null && b.queue_num != null) return -1;
    if (a.queue_num != null && b.queue_num == null) return 1;

    // 3️⃣ لو الاتنين عندهم queue_num
    return (a.queue_num || 0) - (b.queue_num || 0);
  });

  renderTable();
}

// ================== RENDER ==================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">لا توجد بيانات</td></tr>`;
    return;
  }

  filteredData.forEach((item) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.specialty}</td>
        <td>${item.doctor}</td>
        <td>${formatDateTime(item.date)}</td>
        <td>${item.patient}</td>
        <td>${item.phone}</td>
        
        <td>
        <span class="status-badge ${item.status}">${item.status}</span>
        <div class="actions">
        <button onclick="updateStatusAndSend(allData.find(i => i.id==='${item.id}'), 'attended')">✔</button>
        <button onclick="updateStatusAndSend(allData.find(i => i.id==='${item.id}'), 'canceled')">✖</button>
        </div>
        </td>
        <td>${item.queue_num ?? "⭐ VIP"}</td> 
      </tr>
    `;
  });
}

// ================== SEND WHATSAPP POPUP ==================
function sendWhatsAppPopup(phone, message) {
  if (!phone || !message) return;

  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0"))
    formattedPhone = "20" + formattedPhone.substring(1);
  if (!formattedPhone.startsWith("2")) formattedPhone = "20" + formattedPhone;

  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  const width = 800;
  const height = 600;
  const left = screen.width / 2;
  const top = screen.height / 2 - height / 2;

  window.open(
    url,
    "_blank",
    `toolbar=no, location=no, directories=no, status=no, menubar=no,
     scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`,
  );
}

// ================== GET WHATSAPP MESSAGE ==================
function getWhatsAppMessage(item, status) {
  const dateFormatted = new Date(item.date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (status === "attended") {
    return `أهلاً ${item.patient}
تم تأكيد حجزك بنجاح

 الدكتور: ${item.doctor}
 التاريخ: ${dateFormatted}

يرجى الحضور قبل الموعد بـ 10 دقائق

*عيادات المتحدة الطبية تتمنى لكم الشفاء العاجل!*`;
  }

  if (status === "canceled") {
    return `أهلاً ${item.patient}
نعتذر، تم إلغاء الحجز الخاص بك

 الدكتور: ${item.doctor}
 التاريخ: ${dateFormatted}

يرجى التواصل معنا لإعادة الحجز

*عيادات المتحدة الطبية تتمنى لكم الشفاء العاجل!*`;
  }

  return "";
}

// ================== UPDATE STATUS + WHATSAPP ==================
async function updateStatusAndSend(item, newStatus) {
  if (!item) return;

  try {
    const { error } = await supabaseClient
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", item.id);

    if (error) {
      showToast("فشل التحديث ❌");
      return;
    }

    item.status = newStatus;
    showToast("تم التحديث ✅");

    if (newStatus === "attended" || newStatus === "canceled") {
      const message = getWhatsAppMessage(item, newStatus);
      sendWhatsAppPopup(item.phone, message);
    }

    applyFilters();
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء التحديث ❌");
  }
}

// ================== SORT ==================
document.getElementById("sortDate").onclick = () => {
  sortAsc = !sortAsc;
  filteredData.sort((a, b) =>
    sortAsc
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date),
  );
  renderTable();
};

// ================== TOAST ==================
function showBookingToast(data) {
  const overlay = document.createElement("div");
  overlay.className = "toast-overlay";

  overlay.innerHTML = `
    <div class="toast-box">
      <div class="toast-icon">🎟️</div>

      <div class="toast-text">
        👨‍⚕️ الدكتور: ${data.doctor}
      </div>

      <div class="toast-text">
        📅 ${data.date}
      </div>

      <div class="toast-text" style="font-size:22px; color:#4CAF50;">
        🔢 رقمك في الدور: ${data.queue ?? "⭐ VIP"}
      </div>

      <button class="toast-btn">تمام</button>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => overlay.classList.add("show"), 50);

  // زرار تمام
  overlay.querySelector(".toast-btn").onclick = () => {
    overlay.remove();
  };
}
function showToast(msg) {
  const div = document.createElement("div");
  div.innerText = msg;

  div.style.position = "fixed";
  div.style.bottom = "15px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.background = "#fff";
  div.style.color = "#e20004";
  div.style.padding = "10px 20px";
  div.style.borderRadius = "8px";
  div.style.zIndex = "999999";

  document.body.appendChild(div);

  setTimeout(() => div.remove(), 2000);
}
//======= open / close MODAL =========
function openAddModal() {
  document.getElementById("addModal").classList.remove("hidden");
  initModalFilters();
  loadContracts();
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

//=========== ربط فلاتر الMODAL=============
function initModalFilters() {
  const specEl = document.getElementById("modalSpecialty");
  const docEl = document.getElementById("modalDoctor");
  const slotEl = document.getElementById("modalSlot");

  // specialties
  specEl.innerHTML = `<option value="">اختر التخصص</option>`;
  specialtiesList.forEach((s) => {
    specEl.innerHTML += `<option value="${s.id}">${s.spcial_name}</option>`;
  });

  specEl.onchange = () => {
    const specId = specEl.value;

    // doctors
    docEl.innerHTML = `<option value="">اختر الدكتور</option>`;
    doctorsList
      .filter((d) => !specId || d.special_id == specId)
      .forEach((d) => {
        docEl.innerHTML += `<option value="${d.id}">${d.doc_name}</option>`;
      });

    slotEl.innerHTML = `<option value="">اختر الميعاد</option>`;
  };

  docEl.onchange = () => {
    const docId = docEl.value;

    // slots
    slotEl.innerHTML = `<option value="">اختر الميعاد</option>`;
    schedulesList
      .filter((s) => s.doc_id == docId)
      .forEach((s) => {
        slotEl.innerHTML += `<option value="${s.id}">${formatDateTime(s.date)}</option>`;
      });
  };
}

// ========== تحميل التعاقدات من الجدول======

document.addEventListener("DOMContentLoaded", () => {
  loadContracts();
});
async function loadContracts() {
  const { data, error } = await supabaseClient
    .from("contracts")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("contracts error:", error);
    return;
  }

  const group = document.getElementById("contracts-group");

  if (!group) {
    console.error("contracts-group مش موجود");
    return;
  }

  group.innerHTML = "";

  data.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.name;

    group.appendChild(option);
  });
}
//============== الحجز من الريسيبشن ========
async function submitWalkIn() {
  const name = document.getElementById("patientName").value;
  const phone = document.getElementById("patientPhone").value;
  const slotId = document.getElementById("modalSlot").value;
  const doctorId = document.getElementById("modalDoctor").value;
  const paymentmethod = document.getElementById("payment").value.trim();
  let contractId = null;
  let paymentType = "cash";
  if (paymentmethod !== "cash") {
    contractId = paymentmethod;
    paymentType = "contract";
  }

  if (!name || !phone || !slotId || !paymentmethod) {
    showToast("املأ البيانات ❗");
    return;
  }

  // 🔥 نحسب queue للـ walk_in
  const { data: lastQueue } = await supabaseClient
    .from("bookings")
    .select("queue_num")
    .eq("slot_id", slotId)
    .in("type", ["walk_in", "online"])
    .in("status", ["confirmed", "attended"])
    .order("queue_num", { ascending: false })
    .limit(1);

  const nextQueue = (lastQueue?.[0]?.queue_num || 0) + 1;

  const { error } = await supabaseClient.from("bookings").insert([
    {
      doctor_id: doctorId,
      slot_id: slotId,
      patient_name: name,
      patient_phone: phone,
      contract_id: contractId,
      payment_method: paymentType,
      status: "confirmed",
      type: "walk_in", // 🔥
      priority: 2, // أقل من online أو زي ما تحب
      queue_num: nextQueue,
    },
  ]);

  if (error) {
    showToast("فشل الحجز ❌");
    return;
  }

  // نجيب بيانات الدكتور والميعاد
  const slot = schedulesList.find((s) => s.id == slotId);
  const doc = doctorsList.find((d) => d.id == doctorId);

  // 👇 نعرض التوست بالمعلومات
  showBookingToast({
    doctor: doc?.doc_name || "-",
    date: formatDateTime(slot?.date),
    queue: nextQueue,
  });
  closeAddModal();
  fetchData(); // refresh
}

//=======  زرار الطباعه ==============
document.getElementById("exportBtn").addEventListener("click", () => {
  const table = document.getElementById("table111");

  if (!table) {
    alert("لا يوجد جدول");
    return;
  }

  const now = new Date().toLocaleDateString();

  const clinicName = "المتحده الطبيه التخصصيه";
  const logoUrl = "img/logo.jpg";

  // ====== الفلاتر IDs ======
  const specId = document.getElementById("specialtyFilter")?.value;
  const docId = document.getElementById("doctorFilter")?.value;
  const date = document.getElementById("dateFilter")?.value;

  // ====== تحويل IDs → Names (مهم جدًا) ======
  const specName =
    specialtiesList.find((s) => s.id == specId)?.spcial_name || "-";

  const docName = doctorsList.find((d) => d.id == docId)?.doc_name || "-";

  const dateText = date || "-";

  // تعديلات نسخه الجدول للطباعه
  const clonedTable = table.cloneNode(true);

  // حذف العمود (مثلاً العمود الأخير)
  clonedTable.querySelectorAll("tr").forEach((row) => {
    if (row.cells.length > 1) {
      row.deleteCell(row.cells.length - 2);
    }
  });
  clonedTable.style.fontSize = "10px";

  clonedTable.querySelectorAll("th, td").forEach((cell) => {
    cell.style.padding = "4px";
  });

  clonedTable.querySelectorAll("tr").forEach((row) => {
    row.style.height = "auto";
  });

  const content = `
    <div style="text-align:center; margin-bottom:20px;">
      <img src="${logoUrl}" style="width:80px;height:80px;border-radius:10px;" />
      <h2 style="margin:10px 0;">${clinicName}</h2>
      <p style="margin:0;">Date: ${now}</p>
    </div>

    <div style="
      display:flex;
      justify-content:space-between;
      margin:10px 0 20px;
      padding:10px;
      border:1px solid #ddd;
      border-radius:8px;
      font-size:14px;
    ">
      <div><b>  عيادة</b> ${specId ? specName : "الكل"}</div>
      <div><b> الدكتور</b> ${docId ? docName : "الكل"}</div>
      <div><b>  الميعاد</b> ${dateText}</div>
    </div>

    <div>
      ${clonedTable.outerHTML}
    </div>
  `;

  const temp = document.createElement("div");
  temp.innerHTML = content;

  html2pdf()
    .set({
      margin: 0.5,
      filename: `${specName}_${dateText}_${docName}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    })
    .from(temp)
    .save();
});

// ================== REALTIME ==================
supabaseClient
  .channel("bookings")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "bookings" },
    () => fetchData(),
  )
  .subscribe();

// ================== START ==================
fetchData();
