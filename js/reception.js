// ================== SUPABASE ==================
const supabaseClient = supabase.createClient(
  "https://rfwylqnkkaxaapinapaz.supabase.co",
  "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj",
);

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
            <button onclick="updateStatusAndSend(allData.find(i => i.id==='${item.id}'), 'confirmed')">✔</button>
            <button onclick="updateStatusAndSend(allData.find(i => i.id==='${item.id}'), 'attended')">👨‍⚕️</button>
            <button onclick="updateStatusAndSend(allData.find(i => i.id==='${item.id}'), 'canceled')">✖</button>
          </div>
        </td>
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

  if (status === "confirmed") {
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

    if (newStatus === "confirmed" || newStatus === "canceled") {
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
function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

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
