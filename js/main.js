document.addEventListener("DOMContentLoaded", async function () {
  const supabaseUrl = "https://rfwylqnkkaxaapinapaz.supabase.co";
  const supabaseKey = "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj";

  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

  // =========================
  // عناصر الفورم
  // =========================
  const specialtySelect = document.getElementById("specialty");
  const doctorSelect = document.getElementById("doctor");
  const form = document.getElementById("bookingForm");

  // =========================
  // عناصر سكشن الأطباء
  // =========================
  const doctorsList = document.getElementById("doctorsList");
  const specialtiesFilter = document.getElementById("specialtiesFilter");

  let allDoctors = [];

  // =========================
  // تحميل التخصصات للفورم
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
  // تغيير التخصص (الفورم)
  // =========================
  specialtySelect.addEventListener("change", async function () {
    doctorSelect.innerHTML = `<option disabled selected>اختر الطبيب</option>`;

    const { data: doctors } = await supabaseClient
      .from("doctors")
      .select("*")
      .eq("special_id", this.value)
      .eq("is_avaliable", true);

    doctors.forEach((doc) => {
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = doc["doc_name"];
      doctorSelect.appendChild(option);
    });

    doctorSelect.disabled = false;
  });

  // =========================
  // submit الفورم
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
  // سكشن أطباء اليوم
  // =========================

  doctorsList.innerHTML = "<p>جاري تحميل الأطباء...</p>";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabaseClient
    .from("doc_schedual")
    .select(
      `
      date,
      doctors (
        id,
        "doc_name",
        "doc_title",
        "special_id",
        is_avaliable
      )
    `,
    )
    .gte("date", todayStart.toISOString())
    .lte("date", todayEnd.toISOString());

  console.log("JOIN RESULT:", data, error);

  if (error) {
    doctorsList.innerHTML = "<p>خطأ في تحميل البيانات</p>";
    return;
  }

  allDoctors = data
    .filter((item) => item.doctors && item.doctors["is_avaliable"])
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
    document
      .querySelectorAll(".specialties-filter button")
      .forEach((b) => b.classList.remove("active"));

    allBtn.classList.add("active");
    renderDoctors(allDoctors);
  };
  specialtiesFilter.appendChild(allBtn);

  specialties.forEach((sp) => {
    const btn = document.createElement("button");
    btn.textContent = sp["spcial_name"];

    btn.onclick = () => {
      document
        .querySelectorAll(".specialties-filter button")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      const filtered = allDoctors.filter((doc) => doc["special_id"] == sp.id);
      renderDoctors(filtered);
    };

    specialtiesFilter.appendChild(btn);
  });

  // =========================
  // render
  // =========================
  function renderDoctors(doctors) {
    doctorsList.innerHTML = "";

    if (doctors.length === 0) {
      doctorsList.innerHTML = `
      <div class = " no_doctor">
        <P>لا يوجد أطباء اليوم</p>
      </div>
      `;
      return;
    }

    doctors.forEach((doc) => {
      const card = document.createElement("div");

      card.className = "doctor-card";
      const statusText = doc.hasAvailable
        ? "متاح اليوم"
        : "مواعيد اليوم مكتملة";

      card.innerHTML = `
        <img src="img/visitor.jpg" alt="doctor" />
        <h3>د. ${doc["doc_name"]}</h3>
        <p>${doc["doc_title"]}</p>
        <span class="status ${doc.hasAvailable ? "available" : "full"}">${statusText}</span>
        <span class="time">${doc.hasAvailable ? `من ${formatTime(doc.date)}` : ""}</span>
    ${doc.hasAvailable ? `<button onclick="goToBooking('${doc.id}')">احجز الآن</button>` : ""}

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

  renderDoctors(allDoctors);
});

// redirect
function goToBooking(docId) {
  window.location.href = `booking.html?doctor_id=${docId}`;
}
