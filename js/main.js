document.addEventListener("DOMContentLoaded", async function () {
  const supabaseUrl = "https://rfwylqnkkaxaapinapaz.supabase.co";
  const supabaseKey = "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj";

  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

  const specialtySelect = document.getElementById("specialty");
  const doctorSelect = document.getElementById("doctor");
  const form = document.getElementById("bookingForm");

  const doctorsList = document.getElementById("doctorsList");
  const specialtiesFilter = document.getElementById("specialtiesFilter");

  let allDoctors = [];
  let availabilityMap = {};

  // =========================
  // تحميل التخصصات
  // =========================
  const { data: specialties } = await supabaseClient
    .from("specialties")
    .select("*");

  specialties.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item["spcial_name"];
    specialtySelect.appendChild(option);
  });

  // =========================
  // تغيير التخصص (dropdown)
  // =========================
  specialtySelect.addEventListener("change", async function () {
    doctorSelect.innerHTML = `<option disabled selected>اختر الطبيب</option>`;

    const { data: doctors } = await supabaseClient
      .from("doctors")
      .select("*")
      .eq("special_id", this.value);

    doctors.forEach((doc) => {
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = doc["doc_name"];
      doctorSelect.appendChild(option);
    });

    doctorSelect.disabled = false;
  });

  // =========================
  // submit
  // =========================
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const doctorId = doctorSelect.value;

    if (!doctorId) {
      alert("اختار الدكتور الأول");
      return;
    }

    window.location.href = `booking.html?doctor_id=${doctorId}`;
  });

  // =========================
  // تحميل availability من view
  // =========================
  const { data: availabilityData } = await supabaseClient
    .from("doctor_availability")
    .select("doc_id, has_available, date");

  availabilityMap = {};

  availabilityData.forEach((item) => {
    if (item.has_available) {
      availabilityMap[item.doc_id] = true;
    } else if (!(item.doc_id in availabilityMap)) {
      availabilityMap[item.doc_id] = false;
    }
  });

  // =========================
  // تحميل أطباء اليوم (من نفس الـ view)
  // =========================
  doctorsList.innerHTML = "<p>جاري تحميل الأطباء...</p>";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabaseClient
    .from("doctor_availability")
    .select(
      `
    doc_id,
    date,
    has_available,
    doctors (
      id,
      doc_name,
      doc_title,
      special_id
    )
  `,
    )
    .gte("date", todayStart.toISOString())
    .lte("date", todayEnd.toISOString());

  if (error) {
    doctorsList.innerHTML = "<p>خطأ في تحميل البيانات</p>";
    return;
  }

  // نجهز الدكاترة
  allDoctors = data
    .filter((item) => item.doctors)
    .map((item) => ({
      ...item.doctors,
      date: item.date,
    }));

  // =========================
  // فلتر التخصصات
  // =========================
  const allBtn = document.createElement("button");
  allBtn.textContent = "الكل";
  allBtn.classList.add("active");
  allBtn.onclick = () => {
    setActiveBtn(allBtn);
    renderDoctors(allDoctors);
  };
  specialtiesFilter.appendChild(allBtn);

  specialties.forEach((sp) => {
    const btn = document.createElement("button");
    btn.textContent = sp["spcial_name"];

    btn.onclick = () => {
      setActiveBtn(btn);
      const filtered = allDoctors.filter((doc) => doc.special_id == sp.id);
      renderDoctors(filtered);
    };

    specialtiesFilter.appendChild(btn);
  });

  function setActiveBtn(activeBtn) {
    document
      .querySelectorAll(".specialties-filter button")
      .forEach((b) => b.classList.remove("active"));

    activeBtn.classList.add("active");
  }

  // =========================
  // render (من DB مباشرة)
  // =========================
  function renderDoctors(doctors) {
    doctorsList.innerHTML = "";

    if (doctors.length === 0) {
      doctorsList.innerHTML = `
        <div class="no_doctor">
          <p>لا يوجد أطباء اليوم</p>
        </div>
      `;
      return;
    }

    doctors.forEach((doc) => {
      const hasAvailable = availabilityMap[doc.id] || false;

      const card = document.createElement("div");
      card.className = "doctor-card";

      const statusText = hasAvailable ? "متاح اليوم" : "مواعيد اليوم مكتملة";

      card.innerHTML = `
        <img src="img/visitor.jpg" alt="doctor" />
        <h3>د. ${doc.doc_name}</h3>
        <p>${doc.doc_title}</p>

        <span class="status ${hasAvailable ? "available" : "full"}">
          ${statusText}
        </span>

        <span class="time">
          ${hasAvailable ? `من ${formatTime(doc.date)}` : ""}
        </span>

        ${
          hasAvailable
            ? `<button onclick="goToBooking('${doc.id}')">احجز الآن</button>`
            : ""
        }
      `;

      doctorsList.appendChild(card);
    });
  }

  function formatTime(dateString) {
    const date = new Date(dateString);

    return date.toLocaleTimeString("ar-EG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // =========================
  // أول تحميل
  // =========================
  renderDoctors(allDoctors);
});

// =========================
// redirect
// =========================
function goToBooking(docId) {
  window.location.href = `booking.html?doctor_id=${docId}`;
}
