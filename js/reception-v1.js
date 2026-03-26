// ================== SUPABASE ==================
const supabaseClient = supabase.createClient(
  "https://rfwylqnkkaxaapinapaz.supabase.co",
  "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj",
);

// ================== STATE ==================
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 6;
let sortAsc = true;

let doctorsList = [];
let specialtiesList = [];
let schedulesList = [];

// ================== FETCH DATA ==================
async function fetchData() {
  try {
    const { data: bookings, error: bErr } = await supabaseClient
      .from("bookings")
      .select("*");
    const { data: doctors, error: dErr } = await supabaseClient
      .from("doctors")
      .select("*");
    const { data: specialties, error: sErr } = await supabaseClient
      .from("specialties")
      .select("*");
    const { data: schedules, error: scErr } = await supabaseClient
      .from("doc_schedual")
      .select("*");

    if (bErr || dErr || sErr || scErr) {
      console.error(bErr || dErr || sErr || scErr);
      return;
    }

    doctorsList = doctors || [];
    specialtiesList = specialties || [];
    schedulesList = schedules || [];

    // ================== MERGE ==================
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
        doc_id: doc?.id || null,

        specialty: spec?.spcial_name || "-",
        spec_id: spec?.id || null,
      };
    });

    initFilters();
    applyFilters();
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

// ================== INIT FILTERS ==================
function initFilters() {
  const specEl = document.getElementById("specialtyFilter");
  const docEl = document.getElementById("doctorFilter");

  if (!specEl || !docEl) return;

  // تخصصات
  specEl.innerHTML = `<option value="">كل التخصصات</option>`;
  specialtiesList.forEach((s) => {
    specEl.innerHTML += `<option value="${s.id}">${s.spcial_name}</option>`;
  });

  // عند اختيار تخصص
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
function applyFilters() {
  const specId = document.getElementById("specialtyFilter")?.value;
  const docId = document.getElementById("doctorFilter")?.value;
  const date = document.getElementById("dateFilter")?.value;
  const status = document.getElementById("statusFilter")?.value;

  filteredData = allData.filter(
    (item) =>
      (!specId || item.spec_id == specId) &&
      (!docId || item.doc_id == docId) &&
      (!date || item.date === date) &&
      (!status || item.status === status),
  );

  currentPage = 1;
  renderTable();
}

// ================== RENDER TABLE ==================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(start, start + rowsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">لا توجد بيانات</td></tr>`;
    return;
  }

  pageData.forEach((item) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.specialty}</td>
        <td>${item.doctor}</td>
        <td>${item.date} </td>
        <td>${item.patient}</td>
        <td>${item.phone}</td>

        <td>
          <span class="status-badge ${item.status}">
            ${item.status}
            </span>
          <select onchange="updateStatus('${item.id}', this.value)">
            ${statusOption("pending", item.status)}
            ${statusOption("confirmed", item.status)}
            ${statusOption("attended", item.status)}
            ${statusOption("canceled", item.status)}
          </select>
        </td>
      </tr>
    `;
  });

  renderPagination();
}

// ================== STATUS OPTION ==================
function statusOption(val, current) {
  return `<option value="${val}" ${val === current ? "selected" : ""}>${val}</option>`;
}

// ================== UPDATE STATUS ==================
async function updateStatus(id, newStatus) {
  const { error } = await supabaseClient
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("فشل التحديث");
    return;
  }

  // تحديث محلي سريع
  const item = allData.find((i) => i.id == id);
  if (item) item.status = newStatus;

  applyFilters();
}

// ================== PAGINATION ==================
function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    container.innerHTML += `
      <button onclick="goToPage(${i})">${i}</button>
    `;
  }
}

function goToPage(page) {
  currentPage = page;
  renderTable();
}

// ================== SORT ==================
const sortBtn = document.getElementById("sortDate");
if (sortBtn) {
  sortBtn.onclick = () => {
    sortAsc = !sortAsc;

    filteredData.sort((a, b) =>
      sortAsc
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date),
    );

    renderTable();
  };
}

// ================== EXPORT ==================
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
  exportBtn.onclick = () => {
    let csv = "Specialty,Doctor,Date,Patient,Phone,Status\n";

    filteredData.forEach((r) => {
      csv += `${r.specialty},${r.doctor},${r.date},${r.patient},${r.phone},${r.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bookings.csv";
    a.click();
  };
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
