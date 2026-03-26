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
    const { data: bookings } = await supabaseClient.from("bookings").select("*");
    const { data: doctors } = await supabaseClient.from("doctors").select("*");
    const { data: specialties } = await supabaseClient.from("specialties").select("*");
    const { data: schedules } = await supabaseClient.from("doc_schedual").select("*");

    doctorsList = doctors || [];
    specialtiesList = specialties || [];
    schedulesList = schedules || [];

    allData = (bookings || []).map(b => {
      const slot = schedulesList.find(s => s.id === b.slot_id);
      const doc = doctorsList.find(d => d.id === slot?.doc_id);
      const spec = specialtiesList.find(s => s.id === doc?.special_id);

      return {
        id: b.id,
        patient: b.patient_name,
        phone: b.patient_phone,
        status: b.status || "pending",
        date: slot?.date || "",
        doctor: doc?.doc_name || "-",
        doc_id: doc?.id,
        specialty: spec?.spcial_name || "-",
        spec_id: spec?.id
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
  specialtiesList.forEach(s => {
    specEl.innerHTML += `<option value="${s.id}">${s.spcial_name}</option>`;
  });

  specEl.onchange = () => {
    const specId = specEl.value;

    docEl.innerHTML = `<option value="">كل الأطباء</option>`;
    doctorsList
      .filter(d => !specId || d.special_id == specId)
      .forEach(d => {
        docEl.innerHTML += `<option value="${d.id}">${d.doc_name}</option>`;
      });

    applyFilters();
  };

  document.querySelectorAll(".filters select, .filters input")
    .forEach(el => el.addEventListener("change", applyFilters));
}

// ================== APPLY FILTERS ==================
function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function applyFilters() {
  const specId = document.getElementById("specialtyFilter")?.value;
  const docId = document.getElementById("doctorFilter")?.value;
  const date = document.getElementById("dateFilter")?.value;
  const status = document.getElementById("statusFilter")?.value;
  const search = document.getElementById("searchInput")?.value?.toLowerCase();

  filteredData = allData.filter(item =>
    (!specId || item.spec_id == specId) &&
    (!docId || item.doc_id == docId) &&
    (!date || formatDateOnly(item.date) === date) && 
    (!status || item.status === status) &&
    (!search ||
      item.patient.toLowerCase().includes(search) ||
      item.phone.includes(search))
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

  filteredData.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.specialty}</td>
        <td>${item.doctor}</td>
        <td>${item.date}</td>
        <td>${item.patient}</td>
        <td>${item.phone}</td>

        <td>
          <span class="status-badge ${item.status}">
            ${item.status}
          </span>

          <div class="actions">
            <button onclick="updateStatus('${item.id}', 'confirmed')">✔</button>
            <button onclick="updateStatus('${item.id}', 'attended')">👨‍⚕️</button>
            <button onclick="updateStatus('${item.id}', 'canceled')">✖</button>
          </div>
        </td>
      </tr>
    `;
  });
}

// ================== UPDATE ==================
async function updateStatus(id, newStatus) {
  const { error } = await supabaseClient
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    showToast("فشل التحديث ❌");
    return;
  }

  const item = allData.find(i => i.id == id);
  if (item) item.status = newStatus;

  showToast("تم التحديث ✅");
  applyFilters();
}

// ================== SORT ==================
document.getElementById("sortDate").onclick = () => {
  sortAsc = !sortAsc;

  filteredData.sort((a, b) =>
    sortAsc
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date)
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
  .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
    fetchData();
  })
  .subscribe();

// ================== START ==================
fetchData();